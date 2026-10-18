import { CreateRandom, DeriveSeed, Pick } from "./random.js";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const PHASE_NAMES = Object.freeze(["quiet", "approach", "dock", "service", "departure", "afterglow"]);

export const EVENT_CATALOG = Object.freeze([
  Object.freeze({ id: "cargo-run", label: "Cargo Run", purpose: "Transfer one cargo container", visitorType: "freighter", serviceTask: "cargo-transfer", payoffCheckpoint: "cargo-transferred", serviceMinutes: [3, 8] }),
  Object.freeze({ id: "courier-stop", label: "Courier Stop", purpose: "Exchange a dispatch canister", visitorType: "courier", serviceTask: "dispatch-exchange", payoffCheckpoint: "dispatch-exchanged", serviceMinutes: [1, 3] }),
  Object.freeze({ id: "survey-call", label: "Survey Call", purpose: "Synchronize survey and communications arrays", visitorType: "surveyor", serviceTask: "survey-sync", payoffCheckpoint: "survey-synchronized", serviceMinutes: [2, 5] }),
]);

export const AMBIENT_JOBS = Object.freeze([
  Object.freeze({ id: "standby", label: "Stand by at charging point" }),
  Object.freeze({ id: "look-around", label: "Observe station traffic" }),
  Object.freeze({ id: "repair-light", label: "Repair equipment light" }),
  Object.freeze({ id: "adjust-antenna", label: "Realign communications antenna" }),
]);

const EVENT_BY_ID = new Map(EVENT_CATALOG.map((event) => [event.id, event]));
const DEFAULT_TRAFFIC = Object.freeze({
  quietGapMinutes: [6, 22],
  longGapChance: 0.28,
  longGapMinutes: [25, 55],
  approachSeconds: 20,
  dockSeconds: 8,
  departureSeconds: 18,
  afterglowSeconds: 25,
});
const DEFAULT_MAINTENANCE = Object.freeze({ slotMinutes: 15, activeChance: 0.62 });
const FORCED_DURATIONS = Object.freeze({ quiet: 3, approach: 8, dock: 3, service: 30, departure: 10, afterglow: 7 });
const SERVICE_STAGE_DEFINITIONS = Object.freeze({
  "cargo-run": Object.freeze([["prepare", 0.08], ["travel-to-cargo", 0.21], ["inspect-cargo", 0.3], ["retrieve-cargo", 0.47], ["deliver-cargo", 0.7], ["stow-cargo", 0.84], ["verify", 0.91], ["react-success", 0.95], ["return", 1]]),
  "courier-stop": Object.freeze([["prepare", 0.12], ["travel-to-cargo", 0.27], ["inspect-cargo", 0.39], ["retrieve-cargo", 0.54], ["deliver-cargo", 0.72], ["stow-cargo", 0.82], ["verify", 0.88], ["react-success", 0.92], ["return", 1]]),
  "survey-call": Object.freeze([["prepare", 0.12], ["travel-to-antenna", 0.29], ["inspect-antenna", 0.42], ["prepare-tool", 0.49], ["synchronize", 0.72], ["verify", 0.82], ["react-success", 0.88], ["return", 1]]),
});
const LIGHT_MAINTENANCE_STAGES = Object.freeze([["notice", 0.1], ["travel-to-light", 0.27], ["inspect-light", 0.41], ["prepare-tool", 0.49], ["repair", 0.7], ["verify", 0.82], ["react-success", 0.9], ["return", 1]]);
const ANTENNA_MAINTENANCE_STAGES = Object.freeze([["notice", 0.1], ["travel-to-antenna", 0.29], ["inspect-antenna", 0.43], ["prepare-tool", 0.51], ["adjust", 0.72], ["verify", 0.83], ["react-success", 0.9], ["return", 1]]);

function Clamp01(value) { return Math.max(0, Math.min(1, value)); }
function Range(random, range) { return range[0] + random() * (range[1] - range[0]); }
function MixSettings(defaults, supplied) { return Object.freeze({ ...defaults, ...(supplied || {}) }); }
function Stage(progress, stages) {
  let start = 0;
  for (const [id, end] of stages) {
    if (progress < end) return { id, progress: Clamp01((progress - start) / Math.max(0.001, end - start)) };
    start = end;
  }
  return { id: stages[stages.length - 1][0], progress: 1 };
}

export class TrafficScheduler {
  constructor(worldSeed, settings = {}) {
    this.worldSeed = worldSeed;
    this.settings = MixSettings(DEFAULT_TRAFFIC, settings);
    this.dayCache = new Map();
  }

  GenerateDay(dayIndex) {
    if (this.dayCache.has(dayIndex)) return this.dayCache.get(dayIndex);
    const random = CreateRandom(DeriveSeed(this.worldSeed, "traffic-day-v3-" + dayIndex));
    const dayStart = dayIndex * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const visits = [];
    let cursor = dayStart + this.RandomGap(random);
    let sequence = 0;
    while (cursor < dayEnd) {
      const event = Pick(random, EVENT_CATALOG);
      const serviceRange = this.settings.serviceMinutes && this.settings.serviceMinutes[event.id] || event.serviceMinutes;
      const serviceMs = Range(random, serviceRange) * MINUTE_MS;
      const approachMs = this.settings.approachSeconds * SECOND_MS;
      const dockMs = this.settings.dockSeconds * SECOND_MS;
      const departureMs = this.settings.departureSeconds * SECOND_MS;
      const afterglowMs = this.settings.afterglowSeconds * SECOND_MS;
      const resolvedMs = cursor + approachMs + dockMs + serviceMs + departureMs + afterglowMs;
      if (resolvedMs >= dayEnd) break;
      const identity = Math.floor(random() * 0xffffff).toString(36).padStart(5, "0");
      const visitId = "visit-" + dayIndex.toString(36) + "-" + sequence + "-" + event.id + "-" + identity;
      visits.push(Object.freeze({
        ...event,
        visitId,
        sequence,
        approachStartMs: cursor,
        approachEndMs: cursor + approachMs,
        dockEndMs: cursor + approachMs + dockMs,
        serviceEndMs: cursor + approachMs + dockMs + serviceMs,
        departureEndMs: cursor + approachMs + dockMs + serviceMs + departureMs,
        resolvedMs,
      }));
      cursor = resolvedMs + this.RandomGap(random);
      sequence += 1;
    }
    this.dayCache.set(dayIndex, Object.freeze(visits));
    if (this.dayCache.size > 5) {
      for (const key of this.dayCache.keys()) if (Math.abs(key - dayIndex) > 2) this.dayCache.delete(key);
    }
    return this.dayCache.get(dayIndex);
  }

  RandomGap(random) {
    const range = random() < this.settings.longGapChance ? this.settings.longGapMinutes : this.settings.quietGapMinutes;
    return Range(random, range) * MINUTE_MS;
  }

  At(worldTimeMs) {
    const dayIndex = Math.floor(worldTimeMs / DAY_MS);
    const visits = [...this.GenerateDay(dayIndex), ...this.GenerateDay(dayIndex + 1)];
    const current = visits.find((visit) => worldTimeMs >= visit.approachStartMs && worldTimeMs < visit.resolvedMs) || null;
    const next = visits.find((visit) => visit.approachStartMs > worldTimeMs) || null;
    const previous = [...this.GenerateDay(dayIndex - 1), ...this.GenerateDay(dayIndex)]
      .filter((visit) => visit.resolvedMs <= worldTimeMs).at(-1) || null;
    return { current, next, previous };
  }
}

function NaturalVisitState(visit, worldTimeMs) {
  if (!visit) return { phase: "quiet", progress: 0, phaseTime: 0 };
  const spans = [
    ["approach", visit.approachStartMs, visit.approachEndMs],
    ["dock", visit.approachEndMs, visit.dockEndMs],
    ["service", visit.dockEndMs, visit.serviceEndMs],
    ["departure", visit.serviceEndMs, visit.departureEndMs],
    ["afterglow", visit.departureEndMs, visit.resolvedMs],
  ];
  for (const [phase, start, end] of spans) {
    if (worldTimeMs < end) return { phase, progress: Clamp01((worldTimeMs - start) / (end - start)), phaseTime: (worldTimeMs - start) / SECOND_MS };
  }
  return { phase: "quiet", progress: 0, phaseTime: 0 };
}

function CheckpointFor(event, phase, progress) {
  if (phase === "quiet") return { id: "eligible", lifecycle: "eligible" };
  if (phase === "approach") return progress < 0.35 ? { id: "arrival-pending", lifecycle: "pending" } : { id: "arrival-visible", lifecycle: "presenting" };
  if (phase === "dock") return { id: "visitor-docked", lifecycle: "presenting" };
  if (phase === "service") {
    if (progress < 0.12) return { id: "service-started", lifecycle: "presenting" };
    if (progress < 0.82) return { id: "task-visible", lifecycle: "presenting" };
    return { id: event.payoffCheckpoint, lifecycle: "presented" };
  }
  if (phase === "departure") return progress < 0.55 ? { id: "visit-presented", lifecycle: "presented" } : { id: "departure-visible", lifecycle: "presented" };
  return { id: "visit-resolved", lifecycle: "resolved" };
}

function ServiceTask(event, progress) {
  const stage = Stage(progress, SERVICE_STAGE_DEFINITIONS[event.id]);
  let cargoState = "none";
  if (event.id === "cargo-run") cargoState = progress < 0.3 ? "ship" : progress < 0.7 ? "carried" : progress < 0.84 ? "stowing" : "stored";
  if (event.id === "courier-stop") cargoState = progress < 0.39 ? "ship" : progress < 0.72 ? "carried" : progress < 0.82 ? "stowing" : "stored";
  return {
    pipTaskId: event.serviceTask,
    pipTaskLabel: event.purpose,
    pipTaskStage: stage.id,
    pipTaskProgress: stage.progress,
    pipTaskOverallProgress: progress,
    pipGestureVariant: DeriveSeed(event.visitId || event.id, "pip-service-gesture-v1") % 3,
    cargoState,
    equipmentLightState: "normal",
    antennaState: event.id === "survey-call" ? (progress < 0.49 ? "waiting" : progress < 0.72 ? "synchronizing" : "aligned") : "tracking",
    lastSignificantActivity: event.label + " — " + stage.id.replaceAll("-", " "),
  };
}

function MaintenanceState(worldSeed, worldTimeMs, settings = {}) {
  const config = MixSettings(DEFAULT_MAINTENANCE, settings);
  const slotMs = config.slotMinutes * MINUTE_MS;
  const slot = Math.floor(worldTimeMs / slotMs);
  const random = CreateRandom(DeriveSeed(worldSeed, "maintenance-slot-v3-" + slot));
  const slotProgress = (worldTimeMs % slotMs) / slotMs;
  const active = random() < config.activeChance;
  const choice = random();
  const taskId = !active ? (choice < 0.45 ? "look-around" : "standby") : choice < 0.55 ? "repair-light" : "adjust-antenna";
  const start = 0.12 + random() * 0.16;
  const end = Math.min(0.82, start + 0.38 + random() * 0.16);
  const gestureVariant = Math.floor(random() * 3);
  const taskProgress = Clamp01((slotProgress - start) / Math.max(0.001, end - start));
  if (!active || slotProgress < start || slotProgress >= end) {
    const completed = active && slotProgress >= end;
    return {
      pipTaskId: taskId === "look-around" && !completed ? "look-around" : "standby",
      pipTaskLabel: completed ? "Rest after maintenance" : taskId === "look-around" ? "Perform routine visual inspection" : "Stand by at charging point",
      pipTaskStage: taskId === "look-around" && !completed ? "inspect-routine" : "standby",
      pipTaskProgress: slotProgress,
      pipTaskOverallProgress: taskProgress,
      pipGestureVariant: gestureVariant,
      cargoState: "none",
      equipmentLightState: taskId === "repair-light" && !completed ? "flickering" : "normal",
      antennaState: taskId === "adjust-antenna" && !completed ? "drifted" : "tracking",
      lastSignificantActivity: completed ? (taskId === "repair-light" ? "Equipment light repaired" : "Communications antenna realigned") : "Station quiet",
    };
  }
  const stages = taskId === "repair-light" ? LIGHT_MAINTENANCE_STAGES : ANTENNA_MAINTENANCE_STAGES;
  const stage = Stage(taskProgress, stages);
  return {
    pipTaskId: taskId,
    pipTaskLabel: taskId === "repair-light" ? "Repair malfunctioning equipment light" : "Realign communications antenna",
    pipTaskStage: stage.id,
    pipTaskProgress: stage.progress,
    pipTaskOverallProgress: taskProgress,
    pipGestureVariant: gestureVariant,
    cargoState: "none",
    equipmentLightState: taskId === "repair-light" && taskProgress < 0.7 ? (stage.id === "repair" ? "repairing" : "flickering") : "normal",
    antennaState: taskId === "adjust-antenna" ? (taskProgress < 0.51 ? "drifted" : taskProgress < 0.72 ? "adjusting" : "aligned") : "tracking",
    lastSignificantActivity: (taskId === "repair-light" ? "Light repair" : "Antenna adjustment") + " — " + stage.id.replaceAll("-", " "),
  };
}

export class EventDirector {
  constructor(config, { onTransition = () => {} } = {}) {
    this.config = config;
    this.worldSeed = config.worldSeed;
    this.onTransition = onTransition;
    this.scheduler = new TrafficScheduler(config.worldSeed, config.traffic);
    this.forcedEventId = EVENT_BY_ID.has(config.testScenario) ? config.testScenario : null;
    this.ambientOnly = config.testScenario === "ambient";
    this.forcedElapsed = 0;
    this.previousTransitionKey = "";
    this.state = { phase: "quiet", progress: 0, checkpoint: "eligible", lifecycle: "eligible", worldTimeMs: Date.now(), visitId: "", pendingEvents: [] };
  }

  getCatalog() { return EVENT_CATALOG; }
  isForcedScenario() { return this.ambientOnly || this.forcedEventId !== null; }
  forceEvent(eventId) { this.ambientOnly = eventId === "ambient"; this.forcedEventId = EVENT_BY_ID.has(eventId) ? eventId : null; this.forcedElapsed = 0; return this.update(0, this.state.worldTimeMs); }
  clearForce() { this.ambientOnly = false; this.forcedEventId = null; return this.update(0, this.state.worldTimeMs); }
  restart() { this.forcedElapsed = 0; return this.update(0, this.state.worldTimeMs); }
  jumpToPhase(phaseName) {
    if (!PHASE_NAMES.includes(phaseName)) return this.state;
    if (!this.forcedEventId) this.forcedEventId = this.state.eventId || EVENT_CATALOG[0].id;
    let elapsed = 0;
    for (const name of PHASE_NAMES) { if (name === phaseName) break; elapsed += FORCED_DURATIONS[name]; }
    this.forcedElapsed = elapsed + 0.02;
    return this.update(0, this.state.worldTimeMs);
  }

  ForcedState(stepSeconds) {
    this.forcedElapsed += Math.max(0, stepSeconds);
    if (this.ambientOnly) return { event: null, visit: null, phase: "quiet", progress: 0, phaseTime: this.forcedElapsed };
    const event = EVENT_BY_ID.get(this.forcedEventId) || EVENT_CATALOG[0];
    const duration = PHASE_NAMES.reduce((total, phase) => total + FORCED_DURATIONS[phase], 0);
    const cycleTime = this.forcedElapsed % duration;
    let cursor = 0;
    for (const phase of PHASE_NAMES) {
      const end = cursor + FORCED_DURATIONS[phase];
      if (cycleTime < end) return { event, visit: { ...event, visitId: "forced-" + event.id, serviceEndMs: this.state.worldTimeMs + FORCED_DURATIONS.service * SECOND_MS }, phase, progress: (cycleTime - cursor) / FORCED_DURATIONS[phase], phaseTime: cycleTime - cursor };
      cursor = end;
    }
    return { event, visit: null, phase: "quiet", progress: 0, phaseTime: 0 };
  }

  update(stepSeconds, worldTimeMs = Date.now()) {
    const schedule = this.scheduler.At(worldTimeMs);
    let event;
    let visit;
    let phaseState;
    if (this.isForcedScenario()) {
      const forced = this.ForcedState(stepSeconds);
      event = forced.event; visit = forced.visit; phaseState = forced;
    } else {
      visit = schedule.current;
      event = visit;
      phaseState = NaturalVisitState(visit, worldTimeMs);
    }
    return this.SetState({ event, visit, schedule, worldTimeMs, ...phaseState });
  }

  SetState({ event, visit, schedule, worldTimeMs, phase, progress, phaseTime }) {
    const state = this.state;
    const fallbackEvent = event || EVENT_CATALOG[0];
    const visitId = visit ? visit.visitId : "";
    const checkpoint = CheckpointFor(fallbackEvent, phase, progress);
    const service = event && phase === "service" ? ServiceTask(event, progress) : null;
    const maintenance = service || MaintenanceState(this.worldSeed, worldTimeMs, this.config.maintenance);
    if (event && phase !== "service" && (phase === "approach" || phase === "dock")) {
      maintenance.pipTaskId = "watch-arrival";
      maintenance.pipTaskLabel = "Monitor arriving vessel";
      maintenance.pipTaskStage = "observe";
      maintenance.pipTaskProgress = Clamp01(progress);
      maintenance.pipTaskOverallProgress = Clamp01(progress);
      maintenance.pipGestureVariant = DeriveSeed(visitId || event.id, "pip-arrival-gesture-v1") % 3;
    }
    Object.assign(state, maintenance, {
      phase,
      progress: Clamp01(progress),
      phaseTime,
      cycle: visit ? visit.sequence : -1,
      eventId: event ? event.id : "",
      eventLabel: event ? event.label : "No scheduled visitor",
      visitPurpose: event ? event.purpose : "Station operations",
      visitId,
      visitStartMs: visit ? visit.approachStartMs : null,
      visitorType: event ? event.visitorType : "none",
      serviceTask: event ? event.serviceTask : "",
      checkpoint: checkpoint.id,
      checkpointKey: (visitId || "quiet") + ":" + checkpoint.id,
      lifecycle: checkpoint.lifecycle,
      worldTimeMs,
      forced: this.isForcedScenario(),
      shipVisible: Boolean(event) && phase !== "quiet" && phase !== "afterglow",
      shipTravel: phase === "approach" ? SmoothStep(progress) : phase === "departure" ? 1 - SmoothStep(progress) : phase === "dock" || phase === "service" ? 1 : 0,
      robotActivity: service ? "visitor-service" : maintenance.pipTaskId,
      ambientJob: maintenance.pipTaskId,
      ambientJobLabel: maintenance.pipTaskLabel,
      ambientProgress: maintenance.pipTaskOverallProgress,
      nextArrivalMs: schedule.next ? schedule.next.approachStartMs : null,
      scheduledDepartureMs: visit && visit.serviceEndMs ? visit.serviceEndMs : null,
      remainingDockSeconds: visit && phase !== "departure" && phase !== "afterglow" ? Math.max(0, (visit.serviceEndMs - worldTimeMs) / SECOND_MS) : 0,
      pendingEvents: schedule.next ? [{ id: schedule.next.visitId, label: schedule.next.label, at: schedule.next.approachStartMs }] : [],
    });
    const transitionKey = state.checkpointKey + ":" + state.pipTaskId + ":" + state.pipTaskStage;
    if (transitionKey !== this.previousTransitionKey) this.onTransition({ state: { ...state }, phaseChanged: true, checkpointChanged: true });
    this.previousTransitionKey = transitionKey;
    return state;
  }
}

export function SmoothStep(value) { const t = Clamp01(value); return t * t * (3 - 2 * t); }
