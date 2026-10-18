// Slice A: an entirely temporary, preview-forced version of Pip's first story.
// The later narrative director will own durability and natural eligibility.
const Clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const STUBBORN_ANTENNA_VARIANTS = Object.freeze([
  Object.freeze({ id: "measured", label: "Measured" }),
  Object.freeze({ id: "eager", label: "Eager" }),
  Object.freeze({ id: "cautious", label: "Cautious" }),
]);

export const STUBBORN_ANTENNA_BEATS = Object.freeze([
  Object.freeze({ id: "malfunction", label: "A · Malfunction", duration: 6, stage: "notice-antenna", antennaState: "incident-stutter" }),
  Object.freeze({ id: "investigation", label: "B · Investigation", duration: 9, stage: "investigate-stubborn-antenna", antennaState: "incident-stuck" }),
  Object.freeze({ id: "first-repair", label: "C · First repair", duration: 8, stage: "first-antenna-repair", antennaState: "incident-false-normal" }),
  Object.freeze({ id: "false-success", label: "C · False success", duration: 3, stage: "false-relief", antennaState: "incident-stuck-again" }),
  Object.freeze({ id: "runaway-spin", label: "D · Unexpected spin", duration: 5, stage: "runaway-spin", antennaState: "incident-runaway-spin" }),
  Object.freeze({ id: "real-repair", label: "E · Real repair", duration: 12, stage: "install-repair-plate", antennaState: "incident-repairing" }),
  Object.freeze({ id: "verification", label: "F · Verification", duration: 6, stage: "verify-stubborn-antenna", antennaState: "incident-settling" }),
  Object.freeze({ id: "exit", label: "F · Exit", duration: 5, stage: "story-return", antennaState: "incident-patched-tracking" }),
]);

export const STUBBORN_ANTENNA_TOTAL_SECONDS = STUBBORN_ANTENNA_BEATS.reduce((sum, beat) => sum + beat.duration, 0);
export const STUBBORN_ANTENNA_INCIDENT_TYPE = "stubborn-antenna";
export const STUBBORN_ANTENNA_MILESTONES = Object.freeze({ none: 0, "payoff-presented": 1, "repair-presented": 2 });

function BeatAt(index) { return STUBBORN_ANTENNA_BEATS[Math.max(0, Math.min(STUBBORN_ANTENNA_BEATS.length - 1, index))]; }

export function StubbornAntennaElapsedForBeat(beatId) {
  let elapsed = 0;
  for (const beat of STUBBORN_ANTENNA_BEATS) {
    if (beat.id === beatId) return elapsed;
    elapsed += beat.duration;
  }
  return 0;
}

export function StubbornAntennaMilestone(beatId, progress = 0) {
  if (beatId === "verification" && Clamp01(progress) >= 0.6) return STUBBORN_ANTENNA_MILESTONES["repair-presented"];
  if (beatId === "exit") return STUBBORN_ANTENNA_MILESTONES["repair-presented"];
  if (beatId === "runaway-spin" && Clamp01(progress) >= 0.72) return STUBBORN_ANTENNA_MILESTONES["payoff-presented"];
  if (["real-repair", "verification"].includes(beatId)) return STUBBORN_ANTENNA_MILESTONES["payoff-presented"];
  return STUBBORN_ANTENNA_MILESTONES.none;
}

export function CreateStubbornAntennaIncident({ storyYear, variant = 0, instanceId = "" } = {}) {
  const year = Math.floor(Number(storyYear) || new Date().getFullYear());
  return {
    type: STUBBORN_ANTENNA_INCIDENT_TYPE,
    instanceId: instanceId || year + ":stubborn-antenna:preview",
    storyYear: year,
    variant: Math.abs(Math.floor(Number(variant) || 0)) % STUBBORN_ANTENNA_VARIANTS.length,
    milestone: STUBBORN_ANTENNA_MILESTONES.none,
    checkpoint: "intro",
    lifecycle: "presenting",
  };
}

export function AdvanceStubbornAntennaIncident(incident, beatId, progress) {
  const current = incident || CreateStubbornAntennaIncident({});
  const milestone = Math.max(current.milestone || 0, StubbornAntennaMilestone(beatId, progress));
  return {
    ...current,
    milestone,
    checkpoint: milestone >= STUBBORN_ANTENNA_MILESTONES["repair-presented"] ? "repair-presented" : milestone ? "payoff-presented" : "intro",
    lifecycle: milestone >= STUBBORN_ANTENNA_MILESTONES["repair-presented"] ? "resolved" : "presenting",
  };
}

export function CreateStubbornAntennaResume(incident) {
  if (!incident) return null;
  if (incident.milestone >= STUBBORN_ANTENNA_MILESTONES["repair-presented"]) {
    return CreateStubbornAntennaPreview({ variant: incident.variant, beatId: "exit", progress: 0.55, playing: false });
  }
  const beatId = incident.milestone >= STUBBORN_ANTENNA_MILESTONES["payoff-presented"] ? "real-repair" : "malfunction";
  return CreateStubbornAntennaPreview({ variant: incident.variant, beatId, elapsed: StubbornAntennaElapsedForBeat(beatId), playing: true });
}

export function ResolveStubbornAntennaTimeline(elapsedSeconds) {
  let remaining = Math.max(0, Number(elapsedSeconds) || 0);
  for (let index = 0; index < STUBBORN_ANTENNA_BEATS.length; index += 1) {
    const beat = STUBBORN_ANTENNA_BEATS[index];
    if (remaining < beat.duration || index === STUBBORN_ANTENNA_BEATS.length - 1) {
      return { beat, beatIndex: index, progress: Clamp01(remaining / beat.duration), elapsed: Math.min(Math.max(0, elapsedSeconds || 0), STUBBORN_ANTENNA_TOTAL_SECONDS) };
    }
    remaining -= beat.duration;
  }
  return { beat: BeatAt(0), beatIndex: 0, progress: 0, elapsed: 0 };
}

export function CreateStubbornAntennaPreview({ variant = 0, beatId = "malfunction", progress = 0, playing = false, elapsed = 0 } = {}) {
  const beatIndex = Math.max(0, STUBBORN_ANTENNA_BEATS.findIndex((beat) => beat.id === beatId));
  const resolved = playing ? ResolveStubbornAntennaTimeline(elapsed) : { beat: BeatAt(beatIndex), beatIndex, progress: Clamp01(progress), elapsed: 0 };
  return { active: true, playing: Boolean(playing), elapsed: resolved.elapsed, beatId: resolved.beat.id, beatIndex: resolved.beatIndex, progress: resolved.progress, variant: Math.abs(Math.floor(Number(variant) || 0)) % STUBBORN_ANTENNA_VARIANTS.length };
}

// Mutates transient EventDirector output in preview only. It deliberately has no
// storage calls, so forcing, jumping, and scrubbing cannot change story history.
export function ApplyStubbornAntennaPreview(state, preview) {
  if (!preview || !preview.active) return state;
  const resolved = CreateStubbornAntennaPreview(preview);
  const beat = BeatAt(resolved.beatIndex);
  const plateVisible = beat.id === "real-repair" ? resolved.progress >= 0.38 : beat.id === "verification" || beat.id === "exit";
  state.storyIncident = { id: "stubborn-antenna", preview: true, beatId: beat.id, beatIndex: resolved.beatIndex, progress: resolved.progress, variant: resolved.variant, repairPlateVisible: plateVisible };
  state.pipTaskId = "stubborn-antenna";
  state.pipTaskLabel = "Stubborn antenna";
  state.pipTaskStage = beat.stage;
  state.pipTaskProgress = resolved.progress;
  state.pipTaskOverallProgress = (resolved.beatIndex + resolved.progress) / STUBBORN_ANTENNA_BEATS.length;
  state.pipGestureVariant = resolved.variant;
  state.robotActivity = "stubborn-antenna";
  state.ambientJob = "stubborn-antenna";
  state.ambientJobLabel = "Stubborn antenna (preview)";
  state.lastSignificantActivity = "Pip — " + beat.label.replace(/^.[^·]*·\s*/, "");
  state.antennaState = beat.antennaState;
  state.equipmentLightState = "normal";
  state.cargoState = "none";
  return state;
}

// A resolved record needs only the visible world consequence. It deliberately
// leaves Pip and ordinary traffic alone.
export function ApplyStubbornAntennaConsequence(state, incident) {
  if (!incident || incident.type !== STUBBORN_ANTENNA_INCIDENT_TYPE || incident.milestone < STUBBORN_ANTENNA_MILESTONES["repair-presented"]) return state;
  state.storyIncident = {
    id: STUBBORN_ANTENNA_INCIDENT_TYPE,
    preview: false,
    beatId: "exit",
    beatIndex: STUBBORN_ANTENNA_BEATS.length - 1,
    progress: 0.55,
    variant: incident.variant,
    repairPlateVisible: true,
  };
  state.antennaState = "incident-patched-tracking";
  return state;
}
