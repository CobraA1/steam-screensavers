import { DeriveSeed } from "./random.js";
import { AUTUMN_2026_DATES } from "./autumn-2026.js";

const Clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const REMEMBRANCE_TYPE = "lights-of-remembrance-2026";
export const REMEMBRANCE_VARIANTS = Object.freeze([
  Object.freeze({ id: "measured", label: "Measured observance" }),
  Object.freeze({ id: "gentle", label: "Gentle observance" }),
  Object.freeze({ id: "still", label: "Quiet observance" }),
]);
export const REMEMBRANCE_BEATS = Object.freeze([
  Object.freeze({ id: "approach", label: "A · Pip approaches the memorial", duration: 7, stage: "remembrance-approach" }),
  Object.freeze({ id: "prepare", label: "B · Pip carefully checks each light", duration: 7, stage: "remembrance-prepare" }),
  Object.freeze({ id: "activation", label: "C · Golden lights awaken", duration: 8, stage: "remembrance-activate" }),
  Object.freeze({ id: "stillness", label: "D · A quiet moment of remembrance", duration: 13, stage: "remembrance-stillness" }),
  Object.freeze({ id: "return", label: "E · Pip quietly returns to duty", duration: 7, stage: "remembrance-return" }),
]);
export const REMEMBRANCE_TOTAL_SECONDS = REMEMBRANCE_BEATS.reduce((sum, beat) => sum + beat.duration, 0);
export const REMEMBRANCE_MILESTONES = Object.freeze({ none: 0, "lights-lit": 1, "observance-complete": 2 });

function BeatAt(index) { return REMEMBRANCE_BEATS[Math.max(0, Math.min(REMEMBRANCE_BEATS.length - 1, index))]; }

export function RemembranceElapsedForBeat(beatId) {
  let elapsed = 0;
  for (const beat of REMEMBRANCE_BEATS) {
    if (beat.id === beatId) return elapsed;
    elapsed += beat.duration;
  }
  return 0;
}

export function ResolveRemembranceTimeline(elapsedSeconds) {
  let remaining = Math.max(0, Number(elapsedSeconds) || 0);
  for (let index = 0; index < REMEMBRANCE_BEATS.length; index += 1) {
    const beat = REMEMBRANCE_BEATS[index];
    if (remaining < beat.duration || index === REMEMBRANCE_BEATS.length - 1) {
      return { beat, beatIndex: index, progress: Clamp01(remaining / beat.duration), elapsed: Math.min(Math.max(0, Number(elapsedSeconds) || 0), REMEMBRANCE_TOTAL_SECONDS) };
    }
    remaining -= beat.duration;
  }
  return { beat: BeatAt(0), beatIndex: 0, progress: 0, elapsed: 0 };
}

export function RemembranceMilestone(beatId, progress = 0) {
  if (beatId === "return" && Clamp01(progress) >= 0.82) return REMEMBRANCE_MILESTONES["observance-complete"];
  if (beatId === "stillness" || beatId === "return" || beatId === "activation" && Clamp01(progress) >= 0.62) return REMEMBRANCE_MILESTONES["lights-lit"];
  return REMEMBRANCE_MILESTONES.none;
}

export function CreateRemembranceIncident({ variant = 0, instanceId = "" } = {}) {
  return {
    type: REMEMBRANCE_TYPE,
    instanceId: instanceId || "2026:lights-of-remembrance:preview",
    storyYear: 2026,
    variant: Math.abs(Math.floor(Number(variant) || 0)) % REMEMBRANCE_VARIANTS.length,
    milestone: 0,
    checkpoint: "intro",
    lifecycle: "presenting",
  };
}

export function AdvanceRemembranceIncident(incident, beatId, progress) {
  const current = incident || CreateRemembranceIncident({});
  const milestone = Math.max(current.milestone || 0, RemembranceMilestone(beatId, progress));
  const checkpoints = ["intro", "lights-lit", "observance-complete"];
  return { ...current, milestone, checkpoint: checkpoints[milestone], lifecycle: milestone >= 2 ? "resolved" : "presenting" };
}

export function CreateRemembrancePreview({ variant = 0, beatId = "approach", progress = 0, playing = false, elapsed = 0 } = {}) {
  const beatIndex = Math.max(0, REMEMBRANCE_BEATS.findIndex((beat) => beat.id === beatId));
  const resolved = playing
    ? ResolveRemembranceTimeline(elapsed)
    : { beat: BeatAt(beatIndex), beatIndex, progress: Clamp01(progress), elapsed: RemembranceElapsedForBeat(BeatAt(beatIndex).id) + BeatAt(beatIndex).duration * Clamp01(progress) };
  return {
    active: true,
    playing: Boolean(playing),
    elapsed: resolved.elapsed,
    beatId: resolved.beat.id,
    beatIndex: resolved.beatIndex,
    progress: resolved.progress,
    variant: Math.abs(Math.floor(Number(variant) || 0)) % REMEMBRANCE_VARIANTS.length,
  };
}

export function CreateRemembranceResume(incident) {
  if (!incident || incident.type !== REMEMBRANCE_TYPE || incident.milestone >= 2) return null;
  const beatId = incident.milestone >= 1 ? "stillness" : "approach";
  return CreateRemembrancePreview({ variant: incident.variant, beatId, elapsed: RemembranceElapsedForBeat(beatId), playing: true });
}

export function ApplyRemembrance(state, preview) {
  if (!preview || !preview.active) return state;
  const resolved = CreateRemembrancePreview(preview);
  const beat = BeatAt(resolved.beatIndex);
  state.remembrance = {
    id: REMEMBRANCE_TYPE,
    beatId: beat.id,
    beatIndex: resolved.beatIndex,
    progress: resolved.progress,
    overallProgress: (resolved.beatIndex + resolved.progress) / REMEMBRANCE_BEATS.length,
    lightLevel: beat.id === "activation" ? Clamp01(resolved.progress / 0.72) : ["stillness", "return"].includes(beat.id) ? 1 : 0,
    variant: resolved.variant,
    preview: Boolean(preview.preview),
  };
  state.pipTaskId = "lights-of-remembrance";
  state.pipTaskLabel = "The Lights of Remembrance";
  state.pipTaskStage = beat.stage;
  state.pipTaskProgress = resolved.progress;
  state.pipTaskOverallProgress = state.remembrance.overallProgress;
  state.pipGestureVariant = resolved.variant;
  state.robotActivity = "lights-of-remembrance";
  state.ambientJob = "lights-of-remembrance";
  state.ambientJobLabel = "All Saints' Day · " + beat.label.split("·").at(-1).trim();
  state.lastSignificantActivity = "Lights of Remembrance — " + beat.id;
  state.cargoState = "none";
  state.equipmentLightState = "normal";
  return state;
}

export function IsRemembranceWindow(worldTimeMs) {
  return worldTimeMs >= AUTUMN_2026_DATES.allSaints && worldTimeMs < AUTUMN_2026_DATES.cleanupComplete;
}

export function IsRemembranceWindowSafe(state, minimumQuietWindowSeconds = REMEMBRANCE_TOTAL_SECONDS + 12) {
  if (!state || state.phase !== "quiet" || state.visitId || state.shipVisible) return false;
  if (!Number.isFinite(state.nextArrivalMs) || !Number.isFinite(state.worldTimeMs)) return false;
  if ((state.nextArrivalMs - state.worldTimeMs) / 1000 < minimumQuietWindowSeconds) return false;
  return ["standby", "look-around"].includes(state.pipTaskId);
}

export class RemembranceDirector {
  constructor(config = {}) {
    this.worldSeed = config.worldSeed || "little-station-001";
    this.minimumSessionSeconds = Math.max(4, Number(config.story && config.story.minimumSessionSeconds) || 12);
    this.minimumQuietWindowSeconds = REMEMBRANCE_TOTAL_SECONDS + 12;
    this.quietPresentationSeconds = 0;
    this.lastWorldTimeMs = null;
    this.started = false;
  }

  update({ stepSeconds = 0, presentationSeconds = 0, eventState, worldTimeMs = Date.now(), completedStories = [], hasIncompleteIncident = false, forcedScenario = false } = {}) {
    if (this.started || hasIncompleteIncident || forcedScenario || !IsRemembranceWindow(worldTimeMs)) return null;
    if (completedStories.some((entry) => entry.type === REMEMBRANCE_TYPE && entry.storyYear === 2026)) return null;
    const expectedAdvanceMs = Math.max(0, stepSeconds) * 1000;
    if (this.lastWorldTimeMs !== null && Math.abs((worldTimeMs - this.lastWorldTimeMs) - expectedAdvanceMs) > 2_000) {
      this.quietPresentationSeconds = 0;
      this.lastWorldTimeMs = worldTimeMs;
      return null;
    }
    this.lastWorldTimeMs = worldTimeMs;
    const safe = IsRemembranceWindowSafe(eventState, this.minimumQuietWindowSeconds);
    this.quietPresentationSeconds = safe ? this.quietPresentationSeconds + Math.max(0, stepSeconds) : 0;
    if (!safe || presentationSeconds < this.minimumSessionSeconds || this.quietPresentationSeconds < this.minimumSessionSeconds) return null;
    this.started = true;
    return CreateRemembranceIncident({
      variant: DeriveSeed(this.worldSeed, "remembrance-variant-v1:2026") % REMEMBRANCE_VARIANTS.length,
      instanceId: "2026:lights-of-remembrance:" + DeriveSeed(this.worldSeed, "remembrance-instance-v1:2026").toString(36),
    });
  }
}
