import USER_CONFIG from "./config.js";
import { LittleSpaceStationScene } from "./scene.js";
import { CreateWorldIdentity } from "./world.js";
import { EventDirector } from "./simulation-world.js";
import { SimulationClock } from "./simulation-clock.js";
import { CreateNarrativeStore } from "./persistence.js";
import { EnvironmentSystem } from "./environment.js";
import { IncidentDirector } from "./incident-director.js";
import { ApplyPipPreviewOverride } from "./pip-behavior.js";
import { AdvanceDream, ApplyPipRechargeState, CanStartPipRecharge, CreateStoryDream, ResolvePipRecharge, SelectDreamMemory } from "./pip-rhythm.js";
import { AdvanceStubbornAntennaIncident, ApplyStubbornAntennaConsequence, ApplyStubbornAntennaPreview, CreateStubbornAntennaPreview, CreateStubbornAntennaResume, ResolveStubbornAntennaTimeline, STUBBORN_ANTENNA_MILESTONES, STUBBORN_ANTENNA_TOTAL_SECONDS } from "./stubborn-antenna.js";
import { ApplyAutumn2026State, ResolveAutumn2026 } from "./autumn-2026.js";
import { AdvancePhantomVisitorIncident, ApplyPhantomVisitor, CreatePhantomVisitorPreview, CreatePhantomVisitorResume, PhantomVisitorDirector, PHANTOM_VISITOR_MILESTONES, PHANTOM_VISITOR_TOTAL_SECONDS, PHANTOM_VISITOR_TYPE, ResolvePhantomVisitorTimeline } from "./phantom-visitor.js";
import { AdvanceRemembranceIncident, ApplyRemembrance, CreateRemembrancePreview, CreateRemembranceResume, RemembranceDirector, REMEMBRANCE_MILESTONES, REMEMBRANCE_TOTAL_SECONDS, REMEMBRANCE_TYPE, ResolveRemembranceTimeline } from "./lights-of-remembrance.js";

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
};
let stationScene;
let director;
let clock;
let environment;
let store;
let storyDirector;
let phantomDirector;
let remembranceDirector;
let previewTools;
let lastFrame;

function Log(message) { if (IS_PREVIEW) { runtime.logs.unshift({ at: new Date().toISOString(), message }); runtime.logs.length = 32; } }

function Snapshot() { return { clocks: clock ? clock.snapshot() : {}, state: director ? director.state : {}, environment: environment ? { ...environment.state } : {}, storage: store ? store.status() : {}, runtime: { ...runtime, logs: [...runtime.logs] }, render: stationScene && stationScene.getDiagnostics ? stationScene.getDiagnostics() : {}, pip: stationScene && stationScene.getPipDiagnostics ? stationScene.getPipDiagnostics() : {}, camera: stationScene && stationScene.getCameraDiagnostics ? stationScene.getCameraDiagnostics() : {} }; }

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
  const eventState = director.update(stepSeconds, clock.worldTimeMs);
  // EventDirector reuses this object; a finished dream must not linger.
  eventState.dream = null;
  eventState.storyIncident = null;
  eventState.phantomVisitor = null;
  eventState.remembrance = null;
  if (IS_PREVIEW && runtime.deckPreview && runtime.deckPreview.playing) {
    runtime.deckPreview.progress = Math.min(1, runtime.deckPreview.progress + stepSeconds / runtime.deckPreview.durationSeconds);
    if (runtime.deckPreview.progress >= 1) runtime.deckPreview.playing = false;
  }
  const seasonalState = ResolveAutumn2026(CONFIG.worldSeed, clock.worldTimeMs, {
    previewMode: IS_PREVIEW ? runtime.seasonalPreview : "natural",
    deckConfig: CONFIG.serviceDeck,
    deckPreview: IS_PREVIEW ? runtime.deckPreview : null,
  });
  ApplyAutumn2026State(eventState, seasonalState, CONFIG.worldSeed);
  const completedStories = runtime.persistedNarrative && runtime.persistedNarrative.record && runtime.persistedNarrative.record.completedStories || [];
  eventState.remembranceCompleted = completedStories.some((entry) => entry.type === REMEMBRANCE_TYPE && entry.storyYear === 2026);
  const antennaIncompleteBeforeSelection = runtime.incidentPlayback || (runtime.incidentRecord && runtime.incidentRecord.milestone < STUBBORN_ANTENNA_MILESTONES["repair-presented"]);
  if (!IS_PREVIEW && !runtime.phantomPlayback && !runtime.remembrancePlayback && !antennaIncompleteBeforeSelection) {
    const selectedPhantom = phantomDirector.update({
      stepSeconds,
      presentationSeconds: clock.presentationSeconds,
      eventState,
      worldTimeMs: clock.worldTimeMs,
      completedStories,
      hasIncompleteIncident: Boolean(
        runtime.phantomRecord && runtime.phantomRecord.milestone < PHANTOM_VISITOR_MILESTONES["story-complete"] ||
        runtime.remembranceRecord && runtime.remembranceRecord.milestone < REMEMBRANCE_MILESTONES["observance-complete"],
      ),
      forcedScenario: director.isForcedScenario(),
    });
    if (selectedPhantom) {
      const result = store.commitSeasonalIncident(CONFIG.worldSeed, selectedPhantom);
      runtime.phantomRecord = result.ok ? result.record.seasonalIncident : selectedPhantom;
      runtime.persistedNarrative = result.ok ? { record: result.record, status: result.status } : runtime.persistedNarrative;
      runtime.phantomPlayback = CreatePhantomVisitorResume(runtime.phantomRecord);
      Log(result.ok ? "started Phantom Visitor" : "started in-memory Phantom Visitor");
    }
  }
  if (!IS_PREVIEW && !runtime.remembrancePlayback && !runtime.phantomPlayback && !antennaIncompleteBeforeSelection) {
    const selectedRemembrance = remembranceDirector.update({
      stepSeconds,
      presentationSeconds: clock.presentationSeconds,
      eventState,
      worldTimeMs: clock.worldTimeMs,
      completedStories,
      hasIncompleteIncident: Boolean(runtime.remembranceRecord && runtime.remembranceRecord.milestone < REMEMBRANCE_MILESTONES["observance-complete"]),
      forcedScenario: director.isForcedScenario(),
    });
    if (selectedRemembrance) {
      const result = store.commitSeasonalIncident(CONFIG.worldSeed, selectedRemembrance);
      runtime.remembranceRecord = result.ok ? result.record.seasonalIncident : selectedRemembrance;
      runtime.persistedNarrative = result.ok ? { record: result.record, status: result.status } : runtime.persistedNarrative;
      runtime.remembrancePlayback = CreateRemembranceResume(runtime.remembranceRecord);
      Log(result.ok ? "started Lights of Remembrance" : "started in-memory Lights of Remembrance");
    }
  }
  if (!IS_PREVIEW && !runtime.incidentPlayback && !runtime.incidentRecord && !runtime.phantomPlayback && !runtime.remembrancePlayback) {
    const selected = storyDirector.update({
      stepSeconds,
      presentationSeconds: clock.presentationSeconds,
      eventState,
      worldTimeMs: clock.worldTimeMs,
      forcedScenario: director.isForcedScenario(),
    });
    if (selected) {
      const result = store.commitIncident(CONFIG.worldSeed, selected);
      runtime.incidentRecord = result.ok ? result.record.incident : selected;
      runtime.persistedNarrative = result.ok ? { record: result.record, status: result.status } : runtime.persistedNarrative;
      runtime.incidentPlayback = CreateStubbornAntennaResume(runtime.incidentRecord);
      Log(result.ok ? "started natural antenna incident" : "started in-memory antenna incident");
    }
  }
  if (IS_PREVIEW && runtime.pipOverride) ApplyPipPreviewOverride(eventState, runtime.pipOverride);
  const incidentPlayback = IS_PREVIEW ? runtime.incidentPreview : runtime.incidentPlayback;
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
    const currentPlayback = IS_PREVIEW ? runtime.incidentPreview : runtime.incidentPlayback;
    ApplyStubbornAntennaPreview(eventState, currentPlayback);
    if (!IS_PREVIEW && runtime.incidentRecord) {
      const nextIncident = AdvanceStubbornAntennaIncident(runtime.incidentRecord, currentPlayback.beatId, currentPlayback.progress);
      if (nextIncident.milestone > runtime.incidentRecord.milestone) {
        const result = store.commitIncident(CONFIG.worldSeed, nextIncident);
        if (result.ok) {
          runtime.incidentRecord = result.record.incident;
          runtime.persistedNarrative = { record: result.record, status: result.status };
          Log("committed antenna " + nextIncident.checkpoint);
        }
      }
      if (runtime.incidentRecord.milestone >= STUBBORN_ANTENNA_MILESTONES["repair-presented"]) runtime.incidentPlayback = null;
    }
  } else if (runtime.incidentRecord) {
    ApplyStubbornAntennaConsequence(eventState, runtime.incidentRecord);
  }
  const phantomPlayback = IS_PREVIEW ? runtime.phantomPreview : runtime.phantomPlayback;
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
    const currentPhantom = IS_PREVIEW ? runtime.phantomPreview : runtime.phantomPlayback;
    ApplyPhantomVisitor(eventState, currentPhantom);
    if (!IS_PREVIEW && runtime.phantomRecord) {
      const nextIncident = AdvancePhantomVisitorIncident(runtime.phantomRecord, currentPhantom.beatId, currentPhantom.progress);
      if (nextIncident.milestone > runtime.phantomRecord.milestone) {
        const result = store.commitSeasonalIncident(CONFIG.worldSeed, nextIncident);
        if (result.ok) {
          runtime.phantomRecord = result.record.seasonalIncident;
          runtime.persistedNarrative = { record: result.record, status: result.status };
          Log("committed Phantom Visitor " + nextIncident.checkpoint);
        } else runtime.phantomRecord = nextIncident;
      }
      if (runtime.phantomRecord.milestone >= PHANTOM_VISITOR_MILESTONES["story-complete"]) runtime.phantomPlayback = null;
    }
  }
  const remembrancePlayback = IS_PREVIEW ? runtime.remembrancePreview : runtime.remembrancePlayback;
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
    const currentRemembrance = IS_PREVIEW ? runtime.remembrancePreview : runtime.remembrancePlayback;
    ApplyRemembrance(eventState, currentRemembrance);
    if (!IS_PREVIEW && runtime.remembranceRecord) {
      const nextIncident = AdvanceRemembranceIncident(runtime.remembranceRecord, currentRemembrance.beatId, currentRemembrance.progress);
      if (nextIncident.milestone > runtime.remembranceRecord.milestone) {
        const result = store.commitSeasonalIncident(CONFIG.worldSeed, nextIncident);
        if (result.ok) {
          runtime.remembranceRecord = result.record.seasonalIncident;
          runtime.persistedNarrative = { record: result.record, status: result.status };
          Log("committed Lights of Remembrance " + nextIncident.checkpoint);
        } else runtime.remembranceRecord = nextIncident;
      }
      if (runtime.remembranceRecord.milestone >= REMEMBRANCE_MILESTONES["observance-complete"]) runtime.remembrancePlayback = null;
    }
  }
  const recharge = ResolvePipRecharge(CONFIG.worldSeed, clock.worldTimeMs, CONFIG.pipRhythm);
  const incompleteIncident = runtime.incidentPlayback || runtime.phantomPlayback || runtime.remembrancePlayback ||
    (runtime.incidentRecord && runtime.incidentRecord.milestone < STUBBORN_ANTENNA_MILESTONES["repair-presented"]) ||
    (runtime.phantomRecord && runtime.phantomRecord.type === PHANTOM_VISITOR_TYPE && runtime.phantomRecord.milestone < PHANTOM_VISITOR_MILESTONES["story-complete"]) ||
    (runtime.remembranceRecord && runtime.remembranceRecord.type === REMEMBRANCE_TYPE && runtime.remembranceRecord.milestone < REMEMBRANCE_MILESTONES["observance-complete"]);
  const canRecharge = CanStartPipRecharge(recharge, eventState, { presentationSeconds: clock.presentationSeconds, incidentActive: incompleteIncident });
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
    if (!IS_PREVIEW && runtime.incidentRecord && runtime.incidentRecord.milestone < STUBBORN_ANTENNA_MILESTONES["repair-presented"]) {
      runtime.incidentPlayback = CreateStubbornAntennaResume(runtime.incidentRecord);
    }
    if (!IS_PREVIEW && runtime.phantomRecord && runtime.phantomRecord.milestone < PHANTOM_VISITOR_MILESTONES["story-complete"]) {
      runtime.phantomPlayback = CreatePhantomVisitorResume(runtime.phantomRecord);
    }
    if (!IS_PREVIEW && runtime.remembranceRecord && runtime.remembranceRecord.milestone < REMEMBRANCE_MILESTONES["observance-complete"]) {
      runtime.remembrancePlayback = CreateRemembranceResume(runtime.remembranceRecord);
    }
    runtime.clock = clock;
    runtime.store = store;
    environment = new EnvironmentSystem(CONFIG.worldSeed, CONFIG.environment);
    storyDirector = new IncidentDirector(CONFIG, { onTransition: ({ state }) => Log("antenna story " + state) });
    phantomDirector = new PhantomVisitorDirector(CONFIG);
    remembranceDirector = new RemembranceDirector(CONFIG);
    runtime.environment = environment;
    runtime.snapshot = Snapshot;
    runtime.seed = CONFIG.worldSeed;
    director = new EventDirector(CONFIG, { onTransition: ({ state }) => Log("checkpoint " + state.checkpoint + " / " + state.lifecycle) });
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
