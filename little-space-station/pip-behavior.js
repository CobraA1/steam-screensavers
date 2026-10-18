function Clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export const PIP_TASK_STAGES = Object.freeze({
  standby: Object.freeze(["standby"]),
  charging: Object.freeze(["settle-charge", "charging"]),
  "dream-antenna": Object.freeze(["dream-antenna"]),
  "dream-phantom": Object.freeze(["dream-phantom"]),
  "look-around": Object.freeze(["inspect-routine"]),
  "watch-arrival": Object.freeze(["observe"]),
  "repair-light": Object.freeze(["notice", "travel-to-light", "inspect-light", "prepare-tool", "repair", "verify", "react-success", "return"]),
  "adjust-antenna": Object.freeze(["notice", "travel-to-antenna", "inspect-antenna", "prepare-tool", "adjust", "verify", "react-success", "return"]),
  "cargo-transfer": Object.freeze(["prepare", "travel-to-cargo", "inspect-cargo", "retrieve-cargo", "deliver-cargo", "stow-cargo", "verify", "react-success", "return"]),
  "seasonal-cargo": Object.freeze(["prepare", "travel-to-cargo", "return-to-cargo", "inspect-cargo", "retrieve-cargo", "deliver-cargo", "stow-cargo", "package-confirm", "verify", "react-success", "return"]),
  "seasonal-install": Object.freeze(["notice-decor", "travel-to-supplies", "collect-decoration", "carry-decoration", "install-decoration", "verify-decoration", "react-success", "return"]),
  "seasonal-cleanup": Object.freeze(["notice-decor", "travel-to-decoration", "remove-decoration", "carry-away", "stow-decoration", "verify-decoration", "return"]),
  "seasonal-oddity": Object.freeze(["notice-oddity", "inspect-oddity", "puzzled-oddity", "return"]),
  "phantom-visitor": Object.freeze(["phantom-glimpse", "phantom-investigate", "phantom-search", "phantom-reveal", "phantom-untangle", "phantom-wave", "phantom-trail", "phantom-surprise"]),
  "lights-of-remembrance": Object.freeze(["remembrance-approach", "remembrance-prepare", "remembrance-activate", "remembrance-stillness", "remembrance-return"]),
  "dispatch-exchange": Object.freeze(["prepare", "travel-to-cargo", "inspect-cargo", "retrieve-cargo", "deliver-cargo", "stow-cargo", "verify", "react-success", "return"]),
  "survey-sync": Object.freeze(["prepare", "travel-to-antenna", "inspect-antenna", "prepare-tool", "synchronize", "verify", "react-success", "return"]),
  "stubborn-antenna": Object.freeze(["notice-antenna", "investigate-stubborn-antenna", "first-antenna-repair", "false-relief", "runaway-spin", "install-repair-plate", "verify-stubborn-antenna", "story-return"]),
});

export const PIP_PREVIEW_TASKS = Object.freeze([
  Object.freeze({ id: "standby", label: "Standby" }),
  Object.freeze({ id: "charging", label: "Recharge at pad" }),
  Object.freeze({ id: "dream-antenna", label: "Antenna memory dream" }),
  Object.freeze({ id: "dream-phantom", label: "Phantom Visitor memory dream" }),
  Object.freeze({ id: "look-around", label: "Routine inspection" }),
  Object.freeze({ id: "watch-arrival", label: "Watch an arrival" }),
  Object.freeze({ id: "repair-light", label: "Repair equipment light" }),
  Object.freeze({ id: "adjust-antenna", label: "Adjust antenna" }),
  Object.freeze({ id: "cargo-transfer", label: "Transfer cargo" }),
  Object.freeze({ id: "seasonal-cargo", label: "Unload seasonal packages" }),
  Object.freeze({ id: "seasonal-install", label: "Install fall decorations" }),
  Object.freeze({ id: "seasonal-cleanup", label: "Remove Halloween decorations" }),
  Object.freeze({ id: "seasonal-oddity", label: "Inspect a Halloween oddity" }),
  Object.freeze({ id: "lights-of-remembrance", label: "Lights of Remembrance" }),
  Object.freeze({ id: "dispatch-exchange", label: "Exchange dispatch" }),
  Object.freeze({ id: "survey-sync", label: "Synchronize array" }),
]);
const COMPLETED_STAGES = new Set(["verify", "react-success", "return"]);
const CARGO_SHIP_STAGES = new Set(["prepare", "travel-to-cargo", "inspect-cargo"]);
const CARGO_CARRIED_STAGES = new Set(["retrieve-cargo", "deliver-cargo"]);

export function ResolvePipPose(taskId, stage) {
  if (taskId === "charging") return stage === "settle-charge" ? "settle-charge" : "charging";
  if (taskId === "dream-antenna") return "dream-antenna";
  if (taskId === "dream-phantom") return "dream-antenna";
  if (taskId === "stubborn-antenna") {
    if (stage === "notice-antenna") return "antenna-notice";
    if (stage === "investigate-stubborn-antenna") return "inspect-stubborn-antenna";
    if (stage === "first-antenna-repair") return "first-antenna-repair";
    if (stage === "false-relief") return "false-relief";
    if (stage === "runaway-spin") return "startled-antenna";
    if (stage === "install-repair-plate") return "install-repair-plate";
    if (stage === "verify-stubborn-antenna") return "verify-stubborn-antenna";
    if (stage === "story-return") return "story-satisfied";
  }
  if (taskId === "phantom-visitor") {
    if (stage === "phantom-glimpse") return "phantom-glimpse";
    if (stage === "phantom-investigate") return "phantom-investigate";
    if (stage === "phantom-search") return "phantom-search";
    if (stage === "phantom-reveal") return "phantom-reveal";
    if (stage === "phantom-untangle") return "phantom-untangle";
    if (stage === "phantom-wave") return "phantom-wave";
    if (stage === "phantom-trail") return "phantom-trail";
    if (stage === "phantom-surprise") return "phantom-surprise";
  }
  if (taskId === "lights-of-remembrance") {
    if (stage === "remembrance-approach") return "remembrance-approach";
    if (stage === "remembrance-prepare") return "remembrance-prepare";
    if (stage === "remembrance-activate") return "remembrance-activate";
    if (stage === "remembrance-stillness") return "remembrance-stillness";
    if (stage === "remembrance-return") return "remembrance-return";
  }
  if (stage === "standby") return "standby";
  if (stage === "notice-decor" || stage === "notice-oddity") return "notice";
  if (stage === "observe") return "observe";
  if (stage === "inspect-routine") return "routine-inspection";
  if (stage === "notice") return taskId === "repair-light" ? "notice-fault" : "notice";
  if (stage.startsWith("travel-to-") || stage === "return-to-cargo") return "travel";
  if (stage === "prepare") return taskId.includes("cargo") || taskId === "dispatch-exchange" ? "prepare-cargo" : "prepare";
  if (stage === "prepare-tool") return taskId === "repair-light" ? "prepare-repair-tool" : "prepare-antenna-tool";
  if (stage === "inspect-light") return "inspect-light";
  if (stage === "inspect-oddity") return "inspect-light";
  if (stage === "puzzled-oddity") return "verify-light";
  if (stage === "repair") return "repair-light";
  if (stage === "inspect-antenna") return "inspect-antenna";
  if (stage === "adjust") return "adjust-antenna";
  if (stage === "synchronize") return "synchronize-array";
  if (stage === "inspect-cargo") return "inspect-cargo";
  if (stage === "retrieve-cargo" || stage === "collect-decoration" || stage === "remove-decoration") return "grasp-cargo";
  if (stage === "deliver-cargo" || stage === "carry-decoration" || stage === "carry-away") return "carry-cargo";
  if (stage === "stow-cargo" || stage === "install-decoration" || stage === "stow-decoration") return "stow-cargo";
  if (stage === "package-confirm" || stage === "verify-decoration") return "verify-cargo";
  if (stage === "verify") {
    if (taskId === "repair-light") return "verify-light";
    if (taskId === "adjust-antenna" || taskId === "survey-sync") return "verify-antenna";
    return "verify-cargo";
  }
  if (stage === "react-success") return "satisfied";
  if (stage === "return") return "return";
  return "standby";
}

export function PreviousPipPose(taskId, stage) {
  const stages = PIP_TASK_STAGES[taskId] || PIP_TASK_STAGES.standby;
  const index = stages.indexOf(stage);
  return index > 0 ? ResolvePipPose(taskId, stages[index - 1]) : "standby";
}

export function ApplyPipPreviewOverride(state, override) {
  if (!override || !PIP_TASK_STAGES[override.taskId]) return state;
  const taskId = override.taskId;
  const stages = PIP_TASK_STAGES[taskId];
  const stage = stages.includes(override.stage) ? override.stage : stages[0];
  const progress = Clamp01(override.progress);
  const stageIndex = stages.indexOf(stage);

  state.pipTaskId = taskId;
  state.pipTaskLabel = (PIP_PREVIEW_TASKS.find((task) => task.id === taskId) || PIP_PREVIEW_TASKS[0]).label;
  state.pipTaskStage = stage;
  state.pipTaskProgress = progress;
  state.pipTaskOverallProgress = (stageIndex + progress) / stages.length;
  state.pipGestureVariant = Number.isFinite(override.variant) ? Math.abs(Math.floor(override.variant)) % 3 : 1;
  state.robotActivity = taskId;
  state.ambientJob = taskId;
  state.ambientJobLabel = state.pipTaskLabel + " (preview)";
  state.lastSignificantActivity = "Pip preview — " + stage.replaceAll("-", " ");
  state.equipmentLightState = "normal";
  state.antennaState = "tracking";
  state.cargoState = "none";

  if (taskId === "repair-light") {
    state.equipmentLightState = stage === "repair" ? "repairing" : COMPLETED_STAGES.has(stage) ? "normal" : "flickering";
  } else if (taskId === "adjust-antenna") {
    state.antennaState = stage === "adjust" ? "adjusting" : COMPLETED_STAGES.has(stage) ? "aligned" : "drifted";
  } else if (taskId === "survey-sync") {
    state.antennaState = stage === "synchronize" ? "synchronizing" : COMPLETED_STAGES.has(stage) ? "aligned" : "waiting";
  } else if (taskId === "cargo-transfer" || taskId === "dispatch-exchange" || taskId === "seasonal-cargo") {
    if (CARGO_SHIP_STAGES.has(stage)) state.cargoState = "ship";
    else if (CARGO_CARRIED_STAGES.has(stage)) state.cargoState = "carried";
    else if (stage === "stow-cargo") state.cargoState = "stowing";
    else state.cargoState = "stored";
  }
  return state;
}
