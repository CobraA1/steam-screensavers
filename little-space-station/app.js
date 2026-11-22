import USER_CONFIG from "./config.js";
import { HolidayRuntime, ApplyThanksgiving } from './holiday-runtime.js';
import { AdventActivityTimeline, ApplyAdventActivity, ADVENT_ACTIVITY_SECONDS } from './advent-activities.js';
import { ApplyWreathCeremony, WreathTimeline, WREATH_SECONDS } from './advent-wreath.js';
import { LittleSpaceStationScene } from "./scene.js";
import { CreateWorldIdentity } from "./world.js";
import { EventDirector } from "./simulation-world.js";
import { SimulationClock } from "./simulation-clock.js";
import { CreateNarrativeStore } from "./persistence.js";
import { EnvironmentSystem } from "./environment.js";
import { ScheduledEvents } from './scheduled-events.js';
import { HolidayCalendar } from './holiday-calendar.js';
import { ApplyPipPreviewOverride } from "./pip-behavior.js";
import { AdvanceDream, ApplyPipRechargeState, CanStartPipRecharge, CreateStoryDream, ResolvePipRecharge, SelectDreamMemory } from "./pip-rhythm.js";
import { ApplyStubbornAntennaConsequence, ApplyStubbornAntennaPreview, CreateStubbornAntennaPreview, ResolveStubbornAntennaTimeline, STUBBORN_ANTENNA_MILESTONES, STUBBORN_ANTENNA_TOTAL_SECONDS } from "./stubborn-antenna.js";
import { ApplyAutumn2026State, ResolveAutumn2026 } from "./autumn-2026.js";
import { ApplyPhantomVisitor, CreatePhantomVisitorPreview, PHANTOM_VISITOR_MILESTONES, PHANTOM_VISITOR_TOTAL_SECONDS, PHANTOM_VISITOR_TYPE, ResolvePhantomVisitorTimeline } from "./phantom-visitor.js";
import { ApplyRemembrance, CreateRemembrancePreview, REMEMBRANCE_MILESTONES, REMEMBRANCE_TOTAL_SECONDS, REMEMBRANCE_TYPE, ResolveRemembranceTimeline } from "./lights-of-remembrance.js";

const DEFAULT_CONFIG = Object.freeze({
  worldSeed: "little-station-001",
  simulationSpeed: 1,
  visualQuality: "medium",
  maxPixelRatio: 1.5,
  cameraFraming: "very-close",
  debug: false,
  testScenario: "auto",
});

const PARAMS = new URLSearchParams(window.location.search);
const IS_PREVIEW = PARAMS.get("preview") === "1";
const previewSeed = IS_PREVIEW ? PARAMS.get("seed") : null;
const CONFIG = Object.freeze({ ...DEFAULT_CONFIG, ...USER_CONFIG, ...(previewSeed ? { worldSeed: previewSeed } : {}) });
const MAX_STEP_MS = 100;
const canvas = document.getElementById("scene");
const viewport = { width: 0, height: 0, pixelRatio: 0 };
const runtime = {
  speed: Math.max(0, CONFIG.simulationSpeed),
  paused: false,
  stepSeconds: 0,
  dismissed: false,
  logs: [],
  frames: 0,
  fps: 0,
  lastCheckpointCommit: "",
  previousCheckpoint: "",
  previousVisitId: "",
  pipOverride: null,
  incidentPreview: null,
  incidentPlayback: null,
  incidentRecord: null,
  dreamPlayback: null,
  lastDreamCycle: null,
  restPreview: null,
  dreamPreview: null,
  seasonalPreview: "natural",
  phantomPreview: null,
  phantomPlayback: null,
  phantomRecord: null,
  remembrancePreview: null,
  remembrancePlayback: null,
  remembranceRecord: null,
  wreathPreview: null,
};
let stationScene;
let director;
let clock;
let environment;
let store;
let scheduledEvents;
let previewTools;
let holidayRuntime;
let lastFrame;

function Log(message) { if (IS_PREVIEW) { runtime.logs.unshift({ at: new Date().toISOString(), message }); runtime.logs.length = 32; } }

function Snapshot() { return { clocks: clock ? clock.snapshot() : {}, state: director ? director.state : {}, scheduler: (runtime.schedulerPreview?.events || scheduledEvents)?.diagnostics(clock.worldTimeMs) || {}, environment: environment ? { ...environment.state } : {}, storage: store ? store.status() : {}, runtime: { ...runtime, logs: [...runtime.logs] }, render: stationScene && stationScene.getDiagnostics ? stationScene.getDiagnostics() : {}, pip: stationScene && stationScene.getPipDiagnostics ? stationScene.getPipDiagnostics() : {}, camera: stationScene && stationScene.getCameraDiagnostics ? stationScene.getCameraDiagnostics() : {} }; }

function ResolutionChanged() {
  viewport.width = Math.max(1, window.innerWidth);
  viewport.height = Math.max(1, window.innerHeight);
  viewport.pixelRatio = Math.min(window.devicePixelRatio || 1, Math.max(1, CONFIG.maxPixelRatio));
  if (stationScene) stationScene.resize(viewport.width, viewport.height, viewport.pixelRatio);
}

function CheckResolution() {
  const nextRatio = Math.min(window.devicePixelRatio || 1, Math.max(1, CONFIG.maxPixelRatio));
  if (
    viewport.width !== window.innerWidth ||
    viewport.height !== window.innerHeight ||
    viewport.pixelRatio !== nextRatio
  ) {
    ResolutionChanged();
  }
}

function RunFrame(currentTime) {
  requestAnimationFrame(RunFrame);
  CheckResolution();
  if (lastFrame === undefined) lastFrame = currentTime;
  const elapsedMs = currentTime - lastFrame;
  lastFrame = currentTime;
  if (document.hidden || !stationScene) return;

  const wallStep = Math.min(elapsedMs, MAX_STEP_MS) / 1000;
  const active = !runtime.paused && !runtime.dismissed;
  let stepSeconds = active ? wallStep * runtime.speed : 0;
  if (runtime.stepSeconds > 0) {
    stepSeconds += runtime.stepSeconds;
    runtime.stepSeconds = 0;
  }

  clock.advance(wallStep, stepSeconds, stepSeconds);
  // In a forced ceremony, seeking moves the actual preview calendar as well
  // as Pip. Before/after ignition therefore uses the production candle rules.
  if(IS_PREVIEW&&runtime.wreathPreview) {
    const p=runtime.wreathPreview;
    if(p.playing){p.elapsed=Math.min(WREATH_SECONDS,p.elapsed+stepSeconds);if(p.elapsed>=WREATH_SECONDS)p.playing=false;}
    clock.setWorldTime(p.start+p.elapsed*1000);
  }
  // Reserve resources before committing any lower-priority work to presentation.
  const scheduler = IS_PREVIEW ? runtime.schedulerPreview?.events : scheduledEvents;
  const admission = scheduler ? scheduler.prepare(clock.worldTimeMs, { forced: director.isForcedScenario() }) : null;
  const eventState = director.update(stepSeconds, clock.worldTimeMs, admission);
  // EventDirector reuses this object; a finished dream must not linger.
  eventState.dream = null;
  eventState.storyIncident = null;
  eventState.phantomVisitor = null;
  eventState.remembrance = null;
  eventState.adventActivity = null;
  eventState.wreathCeremony = null;
  if (IS_PREVIEW && runtime.deckPreview && runtime.deckPreview.playing) {
    runtime.deckPreview.progress = Math.min(1, runtime.deckPreview.progress + stepSeconds / runtime.deckPreview.durationSeconds);
    if (runtime.deckPreview.progress >= 1) runtime.deckPreview.playing = false;
  }
  const seasonalState = ResolveAutumn2026(CONFIG.worldSeed, clock.worldTimeMs, {
    previewMode: IS_PREVIEW ? runtime.seasonalPreview : "natural",
    deckConfig: CONFIG.serviceDeck,
    deckPreview: IS_PREVIEW ? runtime.deckPreview : null,
  });
  const background = seasonalState.installation || seasonalState.ambientOddity?.id === 'pip-flicker';
  runtime.backgroundActive = Boolean(background && (!admission?.reserve || runtime.backgroundActive));
  eventState.allowReservedBackground = runtime.backgroundActive;
  ApplyAutumn2026State(eventState, seasonalState, CONFIG.worldSeed);
  if (IS_PREVIEW) holidayRuntime.update(eventState, stepSeconds, clock.worldTimeMs, clock.presentationSeconds, director.isForcedScenario());
  if (scheduler) {
    eventState.holiday = HolidayCalendar(clock.worldTimeMs);
    eventState.thanksgiving = null;
    scheduler.update(eventState, clock.worldTimeMs, stepSeconds, { forced: director.isForcedScenario(), recharge: Boolean(runtime.rechargeActive) });
  }
  const completedStories = runtime.persistedNarrative?.record?.completedStories || [];
  eventState.remembranceCompleted = completedStories.some(entry => entry.type === REMEMBRANCE_TYPE && entry.storyYear === 2026);
  const thanksgivingActive = Boolean(eventState.thanksgiving);
  if (IS_PREVIEW && runtime.pipOverride) ApplyPipPreviewOverride(eventState, runtime.pipOverride);
  const incidentPlayback = IS_PREVIEW ? runtime.incidentPreview : null;
  if (incidentPlayback) {
    if (incidentPlayback.playing && active) {
      incidentPlayback.elapsed = Math.min(STUBBORN_ANTENNA_TOTAL_SECONDS, incidentPlayback.elapsed + stepSeconds);
      if (incidentPlayback.elapsed >= STUBBORN_ANTENNA_TOTAL_SECONDS) incidentPlayback.playing = false;
      const timeline = ResolveStubbornAntennaTimeline(incidentPlayback.elapsed);
      const nextPlayback = CreateStubbornAntennaPreview({
        variant: incidentPlayback.variant,
        beatId: timeline.beat.id,
        progress: timeline.progress,
        elapsed: timeline.elapsed,
        playing: incidentPlayback.playing,
      });
      if (IS_PREVIEW) runtime.incidentPreview = nextPlayback;
      else runtime.incidentPlayback = nextPlayback;
    }
    const currentPlayback = IS_PREVIEW ? runtime.incidentPreview : null;
    ApplyStubbornAntennaPreview(eventState, currentPlayback);
  } else if (runtime.incidentRecord && !eventState.storyIncident) {
    ApplyStubbornAntennaConsequence(eventState, runtime.incidentRecord);
  }
  const phantomPlayback = IS_PREVIEW ? runtime.phantomPreview : null;
  if (phantomPlayback) {
    if (phantomPlayback.playing && active) {
      phantomPlayback.elapsed = Math.min(PHANTOM_VISITOR_TOTAL_SECONDS, phantomPlayback.elapsed + stepSeconds);
      if (phantomPlayback.elapsed >= PHANTOM_VISITOR_TOTAL_SECONDS) phantomPlayback.playing = false;
      const timeline = ResolvePhantomVisitorTimeline(phantomPlayback.elapsed);
      const nextPlayback = CreatePhantomVisitorPreview({
        variant: phantomPlayback.variant,
        beatId: timeline.beat.id,
        progress: timeline.progress,
        elapsed: timeline.elapsed,
        playing: phantomPlayback.playing,
      });
      if (IS_PREVIEW) runtime.phantomPreview = nextPlayback;
      else runtime.phantomPlayback = nextPlayback;
    }
    const currentPhantom = IS_PREVIEW ? runtime.phantomPreview : null;
    ApplyPhantomVisitor(eventState, currentPhantom);
  }
  const remembrancePlayback = IS_PREVIEW ? runtime.remembrancePreview : null;
  if (remembrancePlayback) {
    if (remembrancePlayback.playing && active) {
      remembrancePlayback.elapsed = Math.min(REMEMBRANCE_TOTAL_SECONDS, remembrancePlayback.elapsed + stepSeconds);
      if (remembrancePlayback.elapsed >= REMEMBRANCE_TOTAL_SECONDS) remembrancePlayback.playing = false;
      const timeline = ResolveRemembranceTimeline(remembrancePlayback.elapsed);
      const nextPlayback = CreateRemembrancePreview({
        variant: remembrancePlayback.variant,
        beatId: timeline.beat.id,
        progress: timeline.progress,
        elapsed: timeline.elapsed,
        playing: remembrancePlayback.playing,
      });
      if (IS_PREVIEW) runtime.remembrancePreview = nextPlayback;
      else runtime.remembrancePlayback = nextPlayback;
    }
    const currentRemembrance = IS_PREVIEW ? runtime.remembrancePreview : null;
    ApplyRemembrance(eventState, currentRemembrance);
  }
  ApplyThanksgiving(eventState);
  const adventBlocked=Boolean(thanksgivingActive||eventState.storyIncident||eventState.phantomVisitor||eventState.remembrance||
    runtime.incidentPlayback||runtime.phantomPlayback||runtime.remembrancePlayback||runtime.dreamPlayback||
    (!IS_PREVIEW&&(runtime.incidentRecord?.milestone<STUBBORN_ANTENNA_MILESTONES['repair-presented']||
      runtime.phantomRecord?.milestone<PHANTOM_VISITOR_MILESTONES['story-complete']||
      runtime.remembranceRecord?.milestone<REMEMBRANCE_MILESTONES['observance-complete'])));
  if(IS_PREVIEW&&runtime.adventPreview) {
    if(adventBlocked||runtime.pipOverride||runtime.restPreview||eventState.phase!=='quiet'||eventState.shipVisible||eventState.visitId||runtime.seasonalPreview!=='natural')runtime.adventPreview=null;
    else {
      const p=runtime.adventPreview;
      if(p.playing){p.elapsed=Math.min(ADVENT_ACTIVITY_SECONDS,p.elapsed+stepSeconds);if(p.elapsed>=ADVENT_ACTIVITY_SECONDS)p.playing=false;}
      ApplyAdventActivity(eventState,{...p,...AdventActivityTimeline(p.elapsed)});
    }
  }
  if(IS_PREVIEW&&runtime.wreathPreview) {
    if(adventBlocked||runtime.adventPreview||runtime.pipOverride||runtime.restPreview||eventState.phase!=='quiet'||eventState.shipVisible||eventState.visitId||runtime.seasonalPreview!=='natural')runtime.wreathPreview=null;
    else ApplyWreathCeremony(eventState,{...runtime.wreathPreview,...WreathTimeline(runtime.wreathPreview.elapsed)});
  }
  const recharge = ResolvePipRecharge(CONFIG.worldSeed, clock.worldTimeMs, runtime.schedulerPreview ? { enabled: false } : CONFIG.pipRhythm);
  const incompleteIncident = thanksgivingActive || eventState.storyIncident || eventState.phantomVisitor || eventState.remembrance || eventState.adventActivity || eventState.wreathCeremony;
  const canRecharge = CanStartPipRecharge(recharge, eventState, { presentationSeconds: clock.presentationSeconds, incidentActive: incompleteIncident }) &&
    (!scheduler || !eventState.specialReservation || runtime.rechargeActive);
  runtime.rechargeActive = Boolean(canRecharge);
  if (IS_PREVIEW && runtime.restPreview) {
    const previewRecharge = { ...recharge, active: true, progress: runtime.restPreview === "settle" ? 0.08 : 0.6, cycle: 0 };
    if (runtime.restPreview === "dream" && runtime.dreamPreview && runtime.dreamPreview.playing) {
      runtime.dreamPreview = { ...AdvanceDream(runtime.dreamPreview, stepSeconds), playing: true };
      if (!runtime.dreamPreview.active) runtime.dreamPreview.playing = false;
    }
    const previewDream = runtime.restPreview === "dream" ? runtime.dreamPreview : null;
    ApplyPipRechargeState(eventState, previewRecharge, previewDream);
  } else if (canRecharge) {
    const memories = runtime.persistedNarrative && runtime.persistedNarrative.record && runtime.persistedNarrative.record.completedStories || [];
    if (!runtime.dreamPlayback && recharge.dreamEligible && runtime.lastDreamCycle !== recharge.cycle) {
      const selectedMemory = SelectDreamMemory(memories, CONFIG.worldSeed, recharge.cycle);
      runtime.dreamPlayback = CreateStoryDream(selectedMemory, CONFIG.pipRhythm);
      runtime.lastDreamCycle = recharge.cycle;
      if (runtime.dreamPlayback) Log("Pip began a " + runtime.dreamPlayback.type + " memory dream");
    }
    if (runtime.dreamPlayback && active) runtime.dreamPlayback = AdvanceDream(runtime.dreamPlayback, stepSeconds);
    ApplyPipRechargeState(eventState, recharge, runtime.dreamPlayback);
  } else {
    runtime.dreamPlayback = null;
  }
  const environmentState = environment.update(clock.worldTimeMs);
  stationScene.update(stepSeconds, eventState, environmentState, wallStep);
  stationScene.render();
  scheduler?.afterRender(clock.worldTimeMs);
  runtime.frames += 1;
  runtime.fps = runtime.fps ? runtime.fps * 0.9 + (wallStep ? 1 / wallStep : 0) * 0.1 : (wallStep ? 1 / wallStep : 0);
  const payoffEntered = runtime.previousVisitId === eventState.visitId &&
    runtime.previousCheckpoint === "task-visible" &&
    eventState.lifecycle === "presented" &&
    !["visit-presented", "departure-visible"].includes(eventState.checkpoint);
  if (!IS_PREVIEW && !eventState.forced && payoffEntered && runtime.lastCheckpointCommit !== eventState.checkpointKey) {
    const result = store.commit({ worldSeed: CONFIG.worldSeed, eventId: eventState.eventId, eventInstanceId: eventState.visitId, checkpoint: eventState.checkpoint, checkpointKey: eventState.checkpointKey, lifecycle: eventState.lifecycle, worldTimeMs: clock.worldTimeMs, presentationSeconds: clock.presentationSeconds });
    if (result.ok) { runtime.lastCheckpointCommit = eventState.checkpointKey; Log("committed natural checkpoint: " + eventState.checkpointKey); }
  }
  runtime.previousCheckpoint = eventState.checkpoint;
  runtime.previousVisitId = eventState.visitId;
  if (previewTools) previewTools.update(eventState, Snapshot());
}

function LoadPreviewTools() {
  if (!IS_PREVIEW) return;
  import("./preview-tools.js")
    .then(({ CreatePreviewTools }) => {
      previewTools = CreatePreviewTools({ director, runtime, scene: stationScene });
      previewTools.update(director.update(0, clock.worldTimeMs), Snapshot());
    })
    .catch((error) => {
      console.error("[Little Space Station] Preview tools failed to load", error);
    });
}

function Init() {
  window.addEventListener("resize", ResolutionChanged);
  try {
    const identity = CreateWorldIdentity(CONFIG.worldSeed);
    clock = new SimulationClock({ preview: IS_PREVIEW });
    store = CreateNarrativeStore({ onEvent: Log });
    runtime.persistedNarrative = store.load(CONFIG.worldSeed);
    runtime.incidentRecord = runtime.persistedNarrative.record && runtime.persistedNarrative.record.incident;
    runtime.phantomRecord = runtime.persistedNarrative.record && runtime.persistedNarrative.record.seasonalIncident && runtime.persistedNarrative.record.seasonalIncident.type === PHANTOM_VISITOR_TYPE
      ? runtime.persistedNarrative.record.seasonalIncident
      : null;
    runtime.remembranceRecord = runtime.persistedNarrative.record && runtime.persistedNarrative.record.seasonalIncident && runtime.persistedNarrative.record.seasonalIncident.type === REMEMBRANCE_TYPE
      ? runtime.persistedNarrative.record.seasonalIncident
      : null;
    runtime.clock = clock;
    runtime.store = store;
    holidayRuntime = new HolidayRuntime({ preview:IS_PREVIEW, seed:CONFIG.worldSeed, store, runtime });
    environment = new EnvironmentSystem(CONFIG.worldSeed, CONFIG.environment);
    runtime.environment = environment;
    runtime.snapshot = Snapshot;
    runtime.seed = CONFIG.worldSeed;
    runtime.config = CONFIG;
    director = new EventDirector(CONFIG, { onTransition: ({ state }) => Log("checkpoint " + state.checkpoint + " / " + state.lifecycle) });
    scheduledEvents = new ScheduledEvents({ config: CONFIG, runtime, traffic: director.scheduler, store, preview: IS_PREVIEW });
    runtime.scheduledEvents = scheduledEvents;
    stationScene = new LittleSpaceStationScene(canvas, CONFIG, identity, { preview: IS_PREVIEW });
    if (CONFIG.debug || IS_PREVIEW) console.info("[Little Space Station] identity", identity);
    LoadPreviewTools();
  } catch (error) {
    console.error("[Little Space Station] WebGL initialization failed", error);
    canvas.hidden = true;
  }
  ResolutionChanged();
  requestAnimationFrame(RunFrame);
}

Init();
