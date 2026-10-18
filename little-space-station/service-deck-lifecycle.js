// Calendar-derived assembly: no save record, launch timer, or accumulated drift.
const HOUR_MS = 3_600_000;
export const DECK_INSTALL_START = Date.UTC(2026, 8, 22);
export const DECK_REMOVE_END = Date.UTC(2027, 0, 7);
export const DECK_STAGES = Object.freeze([
  "coupling", "supports", "floor", "cabin", "railings", "lighting",
]);
const Clamp = (x) => Math.max(0, Math.min(1, x));
export function DeckDurationMs(config = {}) {
  const hours = Number(config.transitionHours);
  return (Number.isFinite(hours) ? Math.max(1, Math.min(48, hours)) : 6) * HOUR_MS;
}

export function ResolveServiceDeck(time, config = {}, preview = null) {
  const durationMs = DeckDurationMs(config);
  let action = null;
  let progress = 0;
  let status = time < DECK_INSTALL_START ? "not-installed" : time >= DECK_REMOVE_END ? "renewed-away" : "installed";
  if (time >= DECK_INSTALL_START && time < DECK_INSTALL_START + durationMs) {
    action = "install";
    progress = (time - DECK_INSTALL_START) / durationMs;
  } else if (time >= DECK_REMOVE_END - durationMs && time < DECK_REMOVE_END) {
    action = "remove";
    progress = (time - (DECK_REMOVE_END - durationMs)) / durationMs;
  }
  if (preview && ["install", "remove"].includes(preview.action)) {
    action = preview.action;
    progress = Clamp(Number(preview.progress) || 0);
  }
  if (action) status = action === "install" ? "installing" : "removing";
  if (action && progress === 1) status = action === "install" ? "installed" : "renewed-away";
  const active = action ? !(action === "remove" && progress === 1) : status === "installed";
  const assembly = action ? (action === "install" ? progress : 1 - progress) : status === "installed" ? 1 : 0;
  const stageIndex = Math.min(5, Math.floor(progress * 6));
  return Object.freeze({ active, status, action, progress, assembly, durationMs,
    ready: active && assembly === 1 && action !== "remove",
    stage: action ? DECK_STAGES[action === "install" ? stageIndex : 5 - stageIndex] : status,
    stageProgress: progress === 1 ? 1 : progress * 6 - stageIndex,
  });
}

// Each rigid subassembly arrives from the clear aft/+Z corridor. The final
// portion is a slow precision alignment; the last 15% is a fastening hold.
export function DeckPartPose(assembly, index) {
  const progress = Clamp(assembly * 6 - index);
  const smooth = (value) => { const t = Clamp(value); return t * t * (3 - 2 * t); };
  // Arrive from outside even a wide preview, spend most of the stage close to
  // the site, then lower vertically. Reverse playback lifts clear of the cabin
  // before moving aft, so railings and lamps cannot sweep through its walls.
  const arrival = smooth(progress / 0.12);
  const alignment = smooth((progress - 0.12) / 0.43);
  const lowering = smooth((progress - 0.55) / 0.3);
  return { visible: progress > 0, progress,
    x: -38 + 35 * arrival + 3 * alignment,
    y: 2 * (1 - lowering), z: 8 - 6 * arrival - 2 * alignment,
    yaw: -0.12 * (1 - alignment),
  };
}
