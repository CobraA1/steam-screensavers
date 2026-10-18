// Calendar-derived module construction. Work unfolds across a full day, but
// rigid parts move only during brief, distinct lifts instead of gliding for
// hours. The remaining time is staging, fastening, inspection, or quiet.
// No save record, missed-frame replay, or persistent per-frame animation.
const HOUR_MS = 3_600_000;
export const DECK_INSTALL_START = Date.UTC(2026, 8, 22);
export const DECK_REMOVE_END = Date.UTC(2027, 0, 7);
export const DECK_STAGES = Object.freeze([
  "coupling", "supports", "floor", "cabin", "railings", "lighting",
]);
const Clamp = (x) => Math.max(0, Math.min(1, x));
const Smooth = (x) => { const t = Clamp(x); return t * t * (3 - 2 * t); };

// Fraction of one four-hour stage spent on each job. The short lift is the only
// time a rigid subassembly moves; it is locked in place otherwise. Workers
// have separate site surveys, fastening shifts, and a final inspection.
export const DECK_WORK_WINDOWS = Object.freeze([
  Object.freeze({ kind: "survey", from: 0.08, to: 0.19 }),
  Object.freeze({ kind: "lift", from: 0.395, to: 0.405 }),
  Object.freeze({ kind: "fasten", from: 0.52, to: 0.67 }),
  Object.freeze({ kind: "inspect", from: 0.81, to: 0.91 }),
]);
// During removal, the same riggers unfasten each part *before* lifting it
// away. An inspection afterward checks the exposed attachment site.
export const DECK_REMOVE_WORK_WINDOWS = Object.freeze([
  DECK_WORK_WINDOWS[0],
  Object.freeze({ kind: "unfasten", from: 0.26, to: 0.37 }),
  DECK_WORK_WINDOWS[1],
  DECK_WORK_WINDOWS[3],
]);
const LIFT_WINDOW = DECK_WORK_WINDOWS[1];

export function DeckDurationMs(config = {}) {
  const hours = Number(config.transitionHours);
  return (Number.isFinite(hours) ? Math.max(1, Math.min(48, hours)) : 24) * HOUR_MS;
}

export function DeckWorkAt(stageProgress, action = "install") {
  const fraction = Clamp(stageProgress);
  const windows = action === "remove" ? DECK_REMOVE_WORK_WINDOWS : DECK_WORK_WINDOWS;
  for (const window of windows) {
    if (fraction >= window.from && fraction < window.to) {
      return { kind: window.kind, progress: (fraction - window.from) / (window.to - window.from),
        from: window.from, to: window.to };
    }
  }
  return { kind: "quiet", progress: 0, from: fraction, to: fraction };
}

// 0 before the lift, 1 afterward. This stepwise construction level prevents
// half-installed parts from hovering in midair for hours during quiet periods.
export function DeckLiftFraction(stageProgress) {
  return Smooth((Clamp(stageProgress) - LIFT_WINDOW.from) / (LIFT_WINDOW.to - LIFT_WINDOW.from));
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

  const stageIndex = Math.min(DECK_STAGES.length - 1, Math.floor(progress * DECK_STAGES.length));
  const stageProgress = progress === 1 ? 1 : progress * DECK_STAGES.length - stageIndex;
  const lift = DeckLiftFraction(stageProgress);
  const assembly = action === "install" ? (stageIndex + lift) / DECK_STAGES.length
    : action === "remove" ? (DECK_STAGES.length - stageIndex - lift) / DECK_STAGES.length
      : status === "installed" ? 1 : 0;
  const active = action ? !(action === "remove" && progress === 1) : status === "installed";
  const ready = active && assembly === 1 && action !== "remove" && (action !== "install" || progress === 1);
  const work = action && progress < 1 ? DeckWorkAt(stageProgress, action) : DeckWorkAt(1, action);
  return Object.freeze({ active, status, action, progress, assembly, durationMs, ready,
    stage: action ? DECK_STAGES[action === "install" ? stageIndex : 5 - stageIndex] : status,
    stageIndex, stageProgress, work,
  });
}

// Existing rigid-part travel path: offscreen aft approach, align over the
// target, lower vertically; reversed during dismantling.
export function DeckPartPose(assembly, index) {
  const progress = Clamp(assembly * DECK_STAGES.length - index);
  const arrival = Smooth(progress / 0.12);
  const alignment = Smooth((progress - 0.12) / 0.43);
  const lowering = Smooth((progress - 0.55) / 0.3);
  return { visible: progress > 0, progress,
    x: -38 + 35 * arrival + 3 * alignment,
    y: 2 * (1 - lowering), z: 8 - 6 * arrival - 2 * alignment,
    yaw: -0.12 * (1 - alignment),
  };
}
