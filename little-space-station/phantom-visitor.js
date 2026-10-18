import { DeriveSeed } from "./random.js";
import { AUTUMN_2026_DATES } from "./autumn-2026.js";

const Clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const PHANTOM_VISITOR_TYPE = "phantom-visitor-2026";
export const PHANTOM_VISITOR_VARIANTS = Object.freeze([
  Object.freeze({ id: "careful", label: "Careful investigation" }),
  Object.freeze({ id: "curious", label: "Bright curiosity" }),
  Object.freeze({ id: "startled", label: "Easily surprised" }),
]);

export const PHANTOM_VISITOR_BEATS = Object.freeze([
  Object.freeze({ id: "glimpse", label: "A · A white shape drifts past", duration: 7, stage: "phantom-glimpse" }),
  Object.freeze({ id: "vanish", label: "B · It vanishes when Pip approaches", duration: 7, stage: "phantom-investigate" }),
  Object.freeze({ id: "search", label: "C · Pip searches the station", duration: 9, stage: "phantom-search" }),
  Object.freeze({ id: "reveal", label: "D · A tangled inspection drone", duration: 10, stage: "phantom-reveal" }),
  Object.freeze({ id: "untangle", label: "E · Pip removes the white cover", duration: 12, stage: "phantom-untangle" }),
  Object.freeze({ id: "drone-departure", label: "F · The grateful drone departs", duration: 8, stage: "phantom-wave" }),
  Object.freeze({ id: "trailing-cover", label: "G · The empty cover follows Pip", duration: 8, stage: "phantom-trail" }),
  Object.freeze({ id: "final-surprise", label: "H · One last harmless surprise", duration: 7, stage: "phantom-surprise" }),
]);

export const PHANTOM_VISITOR_TOTAL_SECONDS = PHANTOM_VISITOR_BEATS.reduce((sum, beat) => sum + beat.duration, 0);
export const PHANTOM_VISITOR_MILESTONES = Object.freeze({ none: 0, "drone-revealed": 1, "drone-freed": 2, "story-complete": 3 });

function BeatAt(index) { return PHANTOM_VISITOR_BEATS[Math.max(0, Math.min(PHANTOM_VISITOR_BEATS.length - 1, index))]; }

export function PhantomVisitorElapsedForBeat(beatId) {
  let elapsed = 0;
  for (const beat of PHANTOM_VISITOR_BEATS) {
    if (beat.id === beatId) return elapsed;
    elapsed += beat.duration;
  }
  return 0;
}

export function ResolvePhantomVisitorTimeline(elapsedSeconds) {
  let remaining = Math.max(0, Number(elapsedSeconds) || 0);
  for (let index = 0; index < PHANTOM_VISITOR_BEATS.length; index += 1) {
    const beat = PHANTOM_VISITOR_BEATS[index];
    if (remaining < beat.duration || index === PHANTOM_VISITOR_BEATS.length - 1) {
      return { beat, beatIndex: index, progress: Clamp01(remaining / beat.duration), elapsed: Math.min(Math.max(0, elapsedSeconds || 0), PHANTOM_VISITOR_TOTAL_SECONDS) };
    }
    remaining -= beat.duration;
  }
  return { beat: BeatAt(0), beatIndex: 0, progress: 0, elapsed: 0 };
}

export function PhantomVisitorMilestone(beatId, progress = 0) {
  if (beatId === "final-surprise" && Clamp01(progress) >= 0.72) return PHANTOM_VISITOR_MILESTONES["story-complete"];
  if (["drone-departure", "trailing-cover", "final-surprise"].includes(beatId)) return PHANTOM_VISITOR_MILESTONES["drone-freed"];
  if (beatId === "untangle" && Clamp01(progress) >= 0.9) return PHANTOM_VISITOR_MILESTONES["drone-freed"];
  if (beatId === "reveal" && Clamp01(progress) >= 0.58 || beatId === "untangle") return PHANTOM_VISITOR_MILESTONES["drone-revealed"];
  return PHANTOM_VISITOR_MILESTONES.none;
}

export function CreatePhantomVisitorIncident({ variant = 0, instanceId = "" } = {}) {
  return {
    type: PHANTOM_VISITOR_TYPE,
    instanceId: instanceId || "2026:phantom-visitor:preview",
    storyYear: 2026,
    variant: Math.abs(Math.floor(Number(variant) || 0)) % PHANTOM_VISITOR_VARIANTS.length,
    milestone: 0,
    checkpoint: "intro",
    lifecycle: "presenting",
  };
}

export function AdvancePhantomVisitorIncident(incident, beatId, progress) {
  const current = incident || CreatePhantomVisitorIncident({});
  const milestone = Math.max(current.milestone || 0, PhantomVisitorMilestone(beatId, progress));
  const checkpoints = ["intro", "drone-revealed", "drone-freed", "story-complete"];
  return { ...current, milestone, checkpoint: checkpoints[milestone], lifecycle: milestone >= 3 ? "resolved" : "presenting" };
}

export function CreatePhantomVisitorPreview({ variant = 0, beatId = "glimpse", progress = 0, playing = false, elapsed = 0 } = {}) {
  const beatIndex = Math.max(0, PHANTOM_VISITOR_BEATS.findIndex((beat) => beat.id === beatId));
  const resolved = playing ? ResolvePhantomVisitorTimeline(elapsed) : { beat: BeatAt(beatIndex), beatIndex, progress: Clamp01(progress), elapsed: PhantomVisitorElapsedForBeat(BeatAt(beatIndex).id) + BeatAt(beatIndex).duration * Clamp01(progress) };
  return {
    active: true,
    playing: Boolean(playing),
    elapsed: resolved.elapsed,
    beatId: resolved.beat.id,
    beatIndex: resolved.beatIndex,
    progress: resolved.progress,
    variant: Math.abs(Math.floor(Number(variant) || 0)) % PHANTOM_VISITOR_VARIANTS.length,
  };
}

export function CreatePhantomVisitorResume(incident) {
  if (!incident || incident.type !== PHANTOM_VISITOR_TYPE || incident.milestone >= 3) return null;
  const beatId = incident.milestone >= 2 ? "trailing-cover" : incident.milestone >= 1 ? "reveal" : "glimpse";
  return CreatePhantomVisitorPreview({ variant: incident.variant, beatId, elapsed: PhantomVisitorElapsedForBeat(beatId), playing: true });
}

export function ApplyPhantomVisitor(state, preview) {
  if (!preview || !preview.active) return state;
  const resolved = CreatePhantomVisitorPreview(preview);
  const beat = BeatAt(resolved.beatIndex);
  state.phantomVisitor = {
    id: PHANTOM_VISITOR_TYPE,
    beatId: beat.id,
    beatIndex: resolved.beatIndex,
    progress: resolved.progress,
    overallProgress: (resolved.beatIndex + resolved.progress) / PHANTOM_VISITOR_BEATS.length,
    variant: resolved.variant,
    preview: Boolean(preview.preview),
  };
  state.pipTaskId = "phantom-visitor";
  state.pipTaskLabel = "Pip and the Phantom Visitor";
  state.pipTaskStage = beat.stage;
  state.pipTaskProgress = resolved.progress;
  state.pipTaskOverallProgress = state.phantomVisitor.overallProgress;
  state.pipGestureVariant = resolved.variant;
  state.robotActivity = "phantom-visitor";
  state.ambientJob = "phantom-visitor";
  state.ambientJobLabel = "Phantom Visitor · " + beat.label.split("·").at(-1).trim();
  state.lastSignificantActivity = "Phantom Visitor — " + beat.id.replaceAll("-", " ");
  state.cargoState = "none";
  state.equipmentLightState = "normal";
  return state;
}

export function IsPhantomVisitorWindow(worldTimeMs) {
  return worldTimeMs >= AUTUMN_2026_DATES.halloweenFinalPreparations && worldTimeMs < AUTUMN_2026_DATES.allSaints;
}

export function IsPhantomVisitorWindowSafe(state, minimumQuietWindowSeconds = PHANTOM_VISITOR_TOTAL_SECONDS + 12) {
  if (!state || state.phase !== "quiet" || state.visitId || state.shipVisible) return false;
  if (!Number.isFinite(state.nextArrivalMs) || !Number.isFinite(state.worldTimeMs)) return false;
  if ((state.nextArrivalMs - state.worldTimeMs) / 1000 < minimumQuietWindowSeconds) return false;
  return ["standby", "look-around"].includes(state.pipTaskId);
}

export class PhantomVisitorDirector {
  constructor(config = {}) {
    this.worldSeed = config.worldSeed || "little-station-001";
    this.minimumSessionSeconds = Math.max(4, Number(config.story && config.story.minimumSessionSeconds) || 12);
    this.minimumQuietWindowSeconds = PHANTOM_VISITOR_TOTAL_SECONDS + 12;
    this.opportunityWindowMs = Math.max(5, Number(config.story && config.story.phantomOpportunityWindowMinutes) || 18) * 60_000;
    this.opportunityChance = Number.isFinite(config.story && config.story.phantomOpportunityChance)
      ? Clamp01(config.story.phantomOpportunityChance)
      : 0.58;
    this.quietPresentationSeconds = 0;
    this.lastWorldTimeMs = null;
    this.started = false;
  }

  update({ stepSeconds = 0, presentationSeconds = 0, eventState, worldTimeMs = Date.now(), completedStories = [], hasIncompleteIncident = false, forcedScenario = false } = {}) {
    if (this.started || hasIncompleteIncident || forcedScenario || !IsPhantomVisitorWindow(worldTimeMs)) return null;
    if (completedStories.some((entry) => entry.type === PHANTOM_VISITOR_TYPE && entry.storyYear === 2026)) return null;
    const expectedAdvanceMs = Math.max(0, stepSeconds) * 1000;
    if (this.lastWorldTimeMs !== null && Math.abs((worldTimeMs - this.lastWorldTimeMs) - expectedAdvanceMs) > 2_000) {
      this.quietPresentationSeconds = 0;
      this.lastWorldTimeMs = worldTimeMs;
      return null;
    }
    this.lastWorldTimeMs = worldTimeMs;
    const safe = IsPhantomVisitorWindowSafe(eventState, this.minimumQuietWindowSeconds);
    this.quietPresentationSeconds = safe ? this.quietPresentationSeconds + Math.max(0, stepSeconds) : 0;
    if (!safe || presentationSeconds < this.minimumSessionSeconds || this.quietPresentationSeconds < this.minimumSessionSeconds) return null;
    const window = Math.floor(worldTimeMs / this.opportunityWindowMs);
    const score = (DeriveSeed(this.worldSeed, "phantom-opportunity-v1:" + window) >>> 0) / 0x100000000;
    if (score >= this.opportunityChance) return null;
    const identity = DeriveSeed(this.worldSeed, "phantom-instance-v1:2026").toString(36);
    this.started = true;
    return CreatePhantomVisitorIncident({
      variant: DeriveSeed(this.worldSeed, "phantom-variant-v1:2026") % PHANTOM_VISITOR_VARIANTS.length,
      instanceId: "2026:phantom-visitor:" + identity,
    });
  }
}
