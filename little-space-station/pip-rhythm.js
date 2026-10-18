import { DeriveSeed } from "./random.js";
import { ResolveStubbornAntennaTimeline, STUBBORN_ANTENNA_TOTAL_SECONDS } from "./stubborn-antenna.js";
import { PHANTOM_VISITOR_TOTAL_SECONDS, PHANTOM_VISITOR_TYPE, ResolvePhantomVisitorTimeline } from "./phantom-visitor.js";

const MINUTE_MS = 60_000;
const DEFAULT_RHYTHM = Object.freeze({
  enabled: true,
  cycleMinutes: 173,
  rechargeMinutes: 11,
  dreamSeconds: 20,
  dreamChance: 0.42,
  minimumPresentationSeconds: 8,
});

function Clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function Settings(supplied) { return Object.freeze({ ...DEFAULT_RHYTHM, ...(supplied || {}) }); }

// This is deliberately separate from environmental illumination. The phase is
// derived from absolute time and a private seed, so Pip is not permanently
// asleep at any particular local hour.
export function ResolvePipRecharge(worldSeed, worldTimeMs, supplied = {}) {
  const settings = Settings(supplied);
  if (!settings.enabled) return { active: false, settings };
  const cycleMs = Math.max(20 * MINUTE_MS, Number(settings.cycleMinutes) * MINUTE_MS || 0);
  const rechargeMs = Math.min(cycleMs * 0.45, Math.max(30_000, Number(settings.rechargeMinutes) * MINUTE_MS || 0));
  const offset = DeriveSeed(worldSeed, "pip-recharge-phase-v1") % cycleMs;
  const shifted = ((Number(worldTimeMs) + offset) % cycleMs + cycleMs) % cycleMs;
  const active = shifted >= cycleMs - rechargeMs;
  const elapsedMs = active ? shifted - (cycleMs - rechargeMs) : 0;
  const cycle = Math.floor((Number(worldTimeMs) + offset) / cycleMs);
  const dreamRoll = (DeriveSeed(worldSeed, "pip-dream-roll-v1:" + cycle) >>> 0) / 0x100000000;
  return {
    active,
    cycle,
    progress: active ? Clamp01(elapsedMs / rechargeMs) : 0,
    remainingSeconds: active ? Math.max(0, (rechargeMs - elapsedMs) / 1000) : 0,
    dreamEligible: active && dreamRoll < Clamp01(settings.dreamChance),
    settings,
  };
}

export function CanStartPipRecharge(recharge, state, { presentationSeconds = 0, incidentActive = false } = {}) {
  if (!recharge || !recharge.active || incidentActive || !state) return false;
  if (presentationSeconds < recharge.settings.minimumPresentationSeconds) return false;
  if (state.phase !== "quiet" || state.visitId || state.shipVisible) return false;
  return ["standby", "look-around"].includes(state.pipTaskId);
}

export function CreateAntennaDream(memory, supplied = {}) {
  if (!memory || memory.type !== "stubborn-antenna" || !memory.eligibleForDream) return null;
  return {
    type: "stubborn-antenna",
    instanceId: memory.instanceId,
    storyYear: memory.storyYear,
    variant: memory.variant || 0,
    elapsed: 0,
    duration: Math.min(20, Math.max(12, Number(Settings(supplied).dreamSeconds) || STUBBORN_ANTENNA_TOTAL_SECONDS / 3)),
    active: true,
  };
}

export function CreatePhantomDream(memory, supplied = {}) {
  if (!memory || memory.type !== PHANTOM_VISITOR_TYPE || !memory.eligibleForDream) return null;
  return {
    type: PHANTOM_VISITOR_TYPE,
    instanceId: memory.instanceId,
    storyYear: memory.storyYear,
    variant: memory.variant || 0,
    outcome: memory.outcome || "inspection-drone-freed",
    elapsed: 0,
    duration: Math.min(22, Math.max(14, Number(Settings(supplied).dreamSeconds) || PHANTOM_VISITOR_TOTAL_SECONDS / 3)),
    active: true,
  };
}

export function CreateStoryDream(memory, supplied = {}) {
  if (!memory || !memory.eligibleForDream) return null;
  if (memory.type === PHANTOM_VISITOR_TYPE) return CreatePhantomDream(memory, supplied);
  return CreateAntennaDream(memory, supplied);
}

export function SelectDreamMemory(memories, worldSeed, cycle = 0) {
  const eligible = Array.isArray(memories) ? memories.filter((memory) => memory && memory.eligibleForDream && ["stubborn-antenna", PHANTOM_VISITOR_TYPE].includes(memory.type)) : [];
  if (!eligible.length) return null;
  const index = DeriveSeed(worldSeed, "pip-dream-memory-v1:" + cycle) % eligible.length;
  return eligible[index];
}

export function AdvanceDream(dream, stepSeconds) {
  if (!dream || !dream.active) return null;
  const elapsed = Math.min(dream.duration, Math.max(0, dream.elapsed + Math.max(0, stepSeconds)));
  return { ...dream, elapsed, active: elapsed < dream.duration };
}

export function DreamProgress(dream) {
  return dream ? Clamp01(dream.elapsed / Math.max(0.001, dream.duration)) : 0;
}

export function ResolveDreamTimeline(dream) {
  if (dream && dream.type === PHANTOM_VISITOR_TYPE) return ResolvePhantomVisitorTimeline(DreamProgress(dream) * PHANTOM_VISITOR_TOTAL_SECONDS);
  return ResolveStubbornAntennaTimeline(DreamProgress(dream) * STUBBORN_ANTENNA_TOTAL_SECONDS);
}

// A dream overlays only Pip and a small renderer-facing memory descriptor. It
// intentionally does not touch traffic, cargo, the real dish, or story facts.
export function ApplyPipRechargeState(state, recharge, dream = null) {
  if (!recharge || !recharge.active) return state;
  const dreaming = Boolean(dream && dream.active);
  const timeline = dreaming ? ResolveDreamTimeline(dream) : null;
  const phantomDream = dreaming && dream.type === PHANTOM_VISITOR_TYPE;
  state.pipTaskId = dreaming ? (phantomDream ? "dream-phantom" : "dream-antenna") : "charging";
  state.pipTaskLabel = dreaming ? (phantomDream ? "Remembering the Phantom Visitor" : "Remembering the antenna repair") : "Recharge at charging pad";
  state.pipTaskStage = dreaming ? (phantomDream ? "dream-phantom" : "dream-antenna") : recharge.progress < 0.16 ? "settle-charge" : "charging";
  state.pipTaskProgress = dreaming ? DreamProgress(dream) : recharge.progress;
  state.pipTaskOverallProgress = state.pipTaskProgress;
  state.pipGestureVariant = dreaming ? dream.variant : recharge.cycle % 3;
  state.robotActivity = state.pipTaskId;
  state.ambientJob = state.pipTaskId;
  state.ambientJobLabel = state.pipTaskLabel;
  state.lastSignificantActivity = dreaming ? (phantomDream ? "Pip remembers freeing a tiny inspection drone" : "Pip remembers a stubborn antenna") : "Pip is recharging";
  state.dream = dreaming ? { type: dream.type, instanceId: dream.instanceId, storyYear: dream.storyYear, outcome: dream.outcome, progress: DreamProgress(dream), variant: dream.variant, beatId: timeline.beat.id, beatProgress: timeline.progress } : null;
  return state;
}
