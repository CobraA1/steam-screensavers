import { CreateRandom, DeriveSeed, Pick } from "./random.js";
import { ResolveServiceDeck } from "./service-deck-lifecycle.js";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const AUTUMN_2026_DATES = Object.freeze({
  autumnBegins: Date.UTC(2026, 8, 22),
  fallDecorComplete: Date.UTC(2026, 9, 1),
  halloweenPreparations: Date.UTC(2026, 9, 23),
  halloweenFinalPreparations: Date.UTC(2026, 9, 28),
  remembranceSupplies: Date.UTC(2026, 9, 30, 12),
  halloween: Date.UTC(2026, 9, 31),
  allSaints: Date.UTC(2026, 10, 1),
  cleanupBegins: Date.UTC(2026, 10, 2),
  cleanupComplete: Date.UTC(2026, 10, 4),
  autumnEnds: Date.UTC(2026, 11, 21),
  annualRenewal: Date.UTC(2027, 0, 7),
});

export const AUTUMN_PREVIEW_MODES = Object.freeze([
  Object.freeze({ id: "natural", label: "Follow 2026 calendar" }),
  Object.freeze({ id: "fall-decor", label: "General fall decorations" }),
  Object.freeze({ id: "fall-install", label: "Pip installs fall decor" }),
  Object.freeze({ id: "fall-cargo", label: "Fall delivery · 2–4 packages" }),
  Object.freeze({ id: "halloween-early", label: "Halloween · early preparations" }),
  Object.freeze({ id: "halloween-install", label: "Pip installs Halloween decor" }),
  Object.freeze({ id: "halloween-full", label: "Halloween · fully decorated" }),
  Object.freeze({ id: "halloween-cargo", label: "Halloween delivery · 2–4 packages" }),
  Object.freeze({ id: "remembrance-cargo", label: "Remembrance delivery · blue and gold" }),
  Object.freeze({ id: "halloween-oddity-light", label: "Oddity · distant drifting light" }),
  Object.freeze({ id: "halloween-oddity-shadow", label: "Oddity · crossing shadow" }),
  Object.freeze({ id: "halloween-oddity-decor", label: "Oddity · decoration moves" }),
  Object.freeze({ id: "halloween-oddity-flicker", label: "Oddity · Pip checks a flicker" }),
  Object.freeze({ id: "halloween-cleanup", label: "Halloween cleanup" }),
]);

const FALL_DECORATIONS = Object.freeze([
  Object.freeze({ id: "gourd-cluster", label: "Pumpkins and gourds", threshold: 0.16 }),
  Object.freeze({ id: "harvest-lantern", label: "Harvest lantern", threshold: 0.38 }),
  Object.freeze({ id: "warm-garland", label: "Warm light garland", threshold: 0.62 }),
  Object.freeze({ id: "leaf-sprig", label: "Copper leaf sprig", threshold: 0.84 }),
]);

const HALLOWEEN_DECORATIONS = Object.freeze([
  Object.freeze({ id: "marked-seasonal-crate", label: "Marked Halloween crate", threshold: 0.12 }),
  Object.freeze({ id: "jack-o-lantern", label: "Jack-o'-lantern", threshold: 0.3 }),
  Object.freeze({ id: "halloween-lights", label: "Orange and purple lights", threshold: 0.54 }),
  Object.freeze({ id: "ghost-pennant", label: "Ghost pennant", threshold: 0.76 }),
  Object.freeze({ id: "pip-halloween-cap", label: "Pip's Halloween cap", threshold: 0.96 }),
]);

const FALL_PACKAGE_STYLES = Object.freeze([
  Object.freeze({ symbol: "leaf", bodyColor: 0xd8b06b, railColor: 0x9a4f2f, markColor: 0xf0d889 }),
  Object.freeze({ symbol: "gourd", bodyColor: 0xc56832, railColor: 0x5f6b3b, markColor: 0xffd47a }),
  Object.freeze({ symbol: "sun", bodyColor: 0xe0c17a, railColor: 0x8c3f2d, markColor: 0x6f783e }),
  Object.freeze({ symbol: "leaf", bodyColor: 0x9b5737, railColor: 0xd59b45, markColor: 0xf3df9a }),
]);

const HALLOWEEN_PACKAGE_STYLES = Object.freeze([
  Object.freeze({ symbol: "gourd", bodyColor: 0x542d69, railColor: 0xe36c2f, markColor: 0xffd477 }),
  Object.freeze({ symbol: "moon", bodyColor: 0xd96a32, railColor: 0x3a244f, markColor: 0xf2e5be }),
  Object.freeze({ symbol: "ghost", bodyColor: 0xe5ddc8, railColor: 0x6d3d82, markColor: 0x22202d }),
  Object.freeze({ symbol: "gourd", bodyColor: 0x2d283b, railColor: 0xbd5932, markColor: 0xf4b44d }),
]);

const REMEMBRANCE_PACKAGE_STYLES = Object.freeze([
  Object.freeze({ symbol: "sun", bodyColor: 0x315a78, railColor: 0xc9a957, markColor: 0xf4db8d }),
  Object.freeze({ symbol: "moon", bodyColor: 0xd9d6bd, railColor: 0x315a78, markColor: 0xd2ad55 }),
]);

const PACKAGE_THEMES = Object.freeze({
  fall: Object.freeze({ styles: FALL_PACKAGE_STYLES, labels: Object.freeze(["Garland fittings", "Harvest lights", "Gourd ornaments", "Copper leaf trim"]) }),
  halloween: Object.freeze({ styles: HALLOWEEN_PACKAGE_STYLES, labels: Object.freeze(["Jack-o'-lantern kit", "Purple light string", "Ghost pennant", "Moon-marked trim"]) }),
  remembrance: Object.freeze({ styles: REMEMBRANCE_PACKAGE_STYLES, labels: Object.freeze(["Memorial lamps", "Blue-and-gold fittings", "Beacon lenses", "Remembrance lights"]) }),
});

function Clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

function Stage(progress, definitions) {
  let start = 0;
  for (const [id, end] of definitions) {
    if (progress < end) return { id, progress: Clamp01((progress - start) / Math.max(0.001, end - start)) };
    start = end;
  }
  return { id: definitions.at(-1)[0], progress: 1 };
}

function PhaseFor(time) {
  const dates = AUTUMN_2026_DATES;
  if (time < dates.autumnBegins || time >= dates.autumnEnds) return "ordinary";
  if (time < dates.fallDecorComplete) return "autumn-arrival";
  if (time < dates.halloweenPreparations) return "autumn";
  if (time < dates.halloweenFinalPreparations) return "halloween-preparation";
  if (time < dates.halloween) return "halloween-final-preparation";
  if (time < dates.allSaints) return "halloween";
  if (time < dates.cleanupBegins) return "all-saints";
  if (time < dates.cleanupComplete) return "halloween-cleanup";
  return "autumn-return";
}

function NaturalFallDecorLevel(time) {
  if (time < AUTUMN_2026_DATES.autumnBegins || time >= AUTUMN_2026_DATES.autumnEnds) return 0;
  if (time >= AUTUMN_2026_DATES.fallDecorComplete) return 1;
  return Clamp01(0.12 + (time - AUTUMN_2026_DATES.autumnBegins) /
    (AUTUMN_2026_DATES.fallDecorComplete - AUTUMN_2026_DATES.autumnBegins) * 0.88);
}

function NaturalHalloweenDecorLevel(time) {
  const dates = AUTUMN_2026_DATES;
  if (time < dates.halloweenPreparations || time >= dates.cleanupComplete) return 0;
  if (time < dates.halloweenFinalPreparations) {
    return 0.12 + (time - dates.halloweenPreparations) /
      (dates.halloweenFinalPreparations - dates.halloweenPreparations) * 0.46;
  }
  if (time < dates.halloween) {
    return 0.58 + (time - dates.halloweenFinalPreparations) /
      (dates.halloween - dates.halloweenFinalPreparations) * 0.42;
  }
  if (time < dates.allSaints) return 1;
  if (time < dates.cleanupBegins) return 0.62;
  return Clamp01(0.62 * (1 - (time - dates.cleanupBegins) / (dates.cleanupComplete - dates.cleanupBegins)));
}

function ResolveInstallation(worldSeed, time, decorLevel, previewMode) {
  const forced = previewMode === "fall-install";
  const insideInstallWindow = time >= AUTUMN_2026_DATES.autumnBegins && time < AUTUMN_2026_DATES.fallDecorComplete;
  const slotMs = 35 * MINUTE_MS;
  const slot = Math.floor(time / slotMs);
  const slotProgress = ((time % slotMs) + slotMs) % slotMs / slotMs;
  const random = CreateRandom(DeriveSeed(worldSeed, "autumn-install-v1-" + slot));
  const start = 0.15 + random() * 0.42;
  const duration = 100 * SECOND_MS / slotMs;
  const naturallyActive = insideInstallWindow && random() < 0.36 && slotProgress >= start && slotProgress < start + duration;
  if (!forced && !naturallyActive) return null;

  const progress = forced ? 0.63 : Clamp01((slotProgress - start) / duration);
  const decorationIndex = forced
    ? 2
    : Math.min(FALL_DECORATIONS.length - 1, Math.max(0, Math.floor(decorLevel * FALL_DECORATIONS.length)));
  const stage = Stage(progress, [
    ["notice-decor", 0.1],
    ["travel-to-supplies", 0.25],
    ["collect-decoration", 0.36],
    ["carry-decoration", 0.58],
    ["install-decoration", 0.76],
    ["verify-decoration", 0.87],
    ["react-success", 0.93],
    ["return", 1],
  ]);
  return Object.freeze({
    active: true,
    forced,
    targetId: FALL_DECORATIONS[decorationIndex].id,
    targetLabel: FALL_DECORATIONS[decorationIndex].label,
    overallProgress: progress,
    stage: stage.id,
    stageProgress: stage.progress,
    variant: DeriveSeed(worldSeed, "autumn-install-gesture-v1-" + slot) % 3,
  });
}

function ResolveHalloweenActivity(worldSeed, time, decorLevel, previewMode) {
  const forcedInstall = previewMode === "halloween-install";
  const forcedCleanup = previewMode === "halloween-cleanup";
  const installing = time >= AUTUMN_2026_DATES.halloweenPreparations && time < AUTUMN_2026_DATES.halloween;
  const cleaning = time >= AUTUMN_2026_DATES.cleanupBegins && time < AUTUMN_2026_DATES.cleanupComplete;
  const slotMs = 31 * MINUTE_MS;
  const slot = Math.floor(time / slotMs);
  const slotProgress = ((time % slotMs) + slotMs) % slotMs / slotMs;
  const random = CreateRandom(DeriveSeed(worldSeed, "halloween-activity-v1-" + slot));
  const start = 0.1 + random() * 0.5;
  const duration = 105 * SECOND_MS / slotMs;
  const naturallyActive = (installing || cleaning) && random() < 0.4 && slotProgress >= start && slotProgress < start + duration;
  if (!forcedInstall && !forcedCleanup && !naturallyActive) return null;
  const action = forcedCleanup || cleaning ? "remove" : "install";
  const progress = forcedInstall ? 0.67 : forcedCleanup ? 0.52 : Clamp01((slotProgress - start) / duration);
  const visibleCount = Math.max(1, Math.ceil(decorLevel * HALLOWEEN_DECORATIONS.length));
  const index = action === "remove"
    ? Math.min(HALLOWEEN_DECORATIONS.length - 1, visibleCount - 1)
    : Math.min(HALLOWEEN_DECORATIONS.length - 1, Math.max(0, visibleCount - 1));
  const decoration = HALLOWEEN_DECORATIONS[index];
  const stages = action === "remove"
    ? [["notice-decor", 0.1], ["travel-to-decoration", 0.26], ["remove-decoration", 0.48], ["carry-away", 0.7], ["stow-decoration", 0.84], ["verify-decoration", 0.93], ["return", 1]]
    : [["notice-decor", 0.1], ["travel-to-supplies", 0.25], ["collect-decoration", 0.36], ["carry-decoration", 0.58], ["install-decoration", 0.76], ["verify-decoration", 0.87], ["react-success", 0.93], ["return", 1]];
  const stage = Stage(progress, stages);
  return Object.freeze({
    active: true,
    forced: forcedInstall || forcedCleanup,
    action,
    targetId: decoration.id,
    targetLabel: decoration.label,
    overallProgress: progress,
    stage: stage.id,
    stageProgress: stage.progress,
    variant: DeriveSeed(worldSeed, "halloween-activity-gesture-v1-" + slot) % 3,
  });
}

function ResolveHalloweenOddity(worldSeed, time, previewMode) {
  const forcedMap = {
    "halloween-oddity-light": "distant-light",
    "halloween-oddity-shadow": "crossing-shadow",
    "halloween-oddity-decor": "decor-shift",
    "halloween-oddity-flicker": "pip-flicker",
  };
  if (forcedMap[previewMode]) return Object.freeze({ id: forcedMap[previewMode], progress: 0.55, forced: true });
  if (time < AUTUMN_2026_DATES.halloweenPreparations || time >= AUTUMN_2026_DATES.allSaints) return null;
  const slotMs = 11 * MINUTE_MS;
  const slot = Math.floor(time / slotMs);
  const slotProgress = ((time % slotMs) + slotMs) % slotMs / slotMs;
  const random = CreateRandom(DeriveSeed(worldSeed, "halloween-oddity-v1-" + slot));
  const active = random() < 0.16;
  const start = 0.2 + random() * 0.52;
  const duration = (8 + random() * 8) * SECOND_MS / slotMs;
  if (!active || slotProgress < start || slotProgress >= start + duration) return null;
  const id = Pick(random, ["distant-light", "crossing-shadow", "decor-shift", "pip-flicker"]);
  return Object.freeze({ id, progress: Clamp01((slotProgress - start) / duration), forced: false });
}

export function ResolveAutumn2026(worldSeed, worldTimeMs, { previewMode = "natural", deckConfig = {}, deckPreview = null } = {}) {
  const time = Number.isFinite(worldTimeMs) ? worldTimeMs : Date.now();
  let serviceDeck = ResolveServiceDeck(time, deckConfig, deckPreview);
  if (previewMode !== "natural" && !deckPreview) {
    serviceDeck = Object.freeze({ ...serviceDeck, active: true, ready: true, assembly: 1,
      action: null, status: "preview-forced", stage: "installed" });
  }
  const forcedDecor = previewMode !== "natural";
  const fallDecorLevel = forcedDecor ? 1 : NaturalFallDecorLevel(time);
  const forcedHalloweenLevel = previewMode === "halloween-early" ? 0.46
    : previewMode === "halloween-cleanup" ? 0.62
      : previewMode.startsWith("halloween-") ? 1 : null;
  const halloweenDecorLevel = forcedHalloweenLevel === null ? NaturalHalloweenDecorLevel(time) : forcedHalloweenLevel;
  let phase = PhaseFor(time);
  if (previewMode === "halloween-cleanup") phase = "halloween-cleanup";
  else if (previewMode.startsWith("halloween-")) phase = previewMode === "halloween-early" ? "halloween-preparation" : "halloween";
  else if (forcedDecor && phase === "ordinary") phase = "autumn";
  const fallDecorations = FALL_DECORATIONS
    .filter((decoration) => fallDecorLevel >= decoration.threshold)
    .map((decoration) => decoration.id);
  const halloweenDecorations = HALLOWEEN_DECORATIONS
    .filter((decoration) => halloweenDecorLevel >= decoration.threshold)
    .map((decoration) => decoration.id);
  const installation = serviceDeck.ready ? (ResolveInstallation(worldSeed, time, fallDecorLevel, previewMode) ||
    ResolveHalloweenActivity(worldSeed, time, halloweenDecorLevel, previewMode)) : null;
  const ambientOddity = ResolveHalloweenOddity(worldSeed, time, previewMode);
  return Object.freeze({
    storyYear: 2026,
    phase,
    activeHoliday: phase === "halloween" || phase === "halloween-preparation" || phase === "halloween-final-preparation" ? "Halloween" : phase === "all-saints" ? "All Saints' Day" : null,
    fallDecorLevel,
    halloweenDecorLevel,
    cleanupProgress: phase === "halloween-cleanup" ? Clamp01((time - AUTUMN_2026_DATES.cleanupBegins) / (AUTUMN_2026_DATES.cleanupComplete - AUTUMN_2026_DATES.cleanupBegins)) : phase === "autumn-return" ? 1 : 0,
    fallDecorations: Object.freeze(fallDecorations),
    halloweenDecorations: Object.freeze(halloweenDecorations),
    installedDecorations: Object.freeze(serviceDeck.ready ? [...fallDecorations, ...halloweenDecorations] : []),
    installation,
    ambientOddity,
    serviceDeck,
    serviceDeckActive: serviceDeck.active,
    serviceDeckStatus: serviceDeck.status,
    remembranceFixtureAvailable: time >= AUTUMN_2026_DATES.remembranceSupplies && time < AUTUMN_2026_DATES.cleanupComplete,
    remembranceLightsRemain: time >= AUTUMN_2026_DATES.allSaints && time < AUTUMN_2026_DATES.cleanupBegins,
    previewMode,
    forced: previewMode !== "natural",
  });
}

function SeasonalThemeFor(time) {
  if (time < AUTUMN_2026_DATES.autumnBegins || time >= AUTUMN_2026_DATES.cleanupComplete) return null;
  if (time >= AUTUMN_2026_DATES.remembranceSupplies && time < AUTUMN_2026_DATES.cleanupBegins) return "remembrance";
  if (time >= AUTUMN_2026_DATES.halloweenPreparations) return "halloween";
  return "fall";
}

function ShipmentChance(theme, time) {
  if (theme === "fall") {
    return time < AUTUMN_2026_DATES.fallDecorComplete ? 0.48 : 0.18;
  }
  if (theme === "halloween") return 0.46;
  if (theme === "remembrance") return 0.58;
  return 0;
}

export function CreateSeasonalManifest(worldSeed, visit, { forceTheme = null } = {}) {
  if (!visit || visit.eventId !== "cargo-run" && visit.id !== "cargo-run") return null;
  const visitTime = Number.isFinite(visit.approachStartMs) ? visit.approachStartMs : visit.worldTimeMs;
  const theme = forceTheme || SeasonalThemeFor(visitTime);
  if (!theme) return null;
  const visitId = visit.visitId || "preview-cargo";
  const random = CreateRandom(DeriveSeed(worldSeed, "seasonal-cargo-v1-" + visitId));
  if (!forceTheme && random() >= ShipmentChance(theme, visitTime)) return null;
  const packageCount = 2 + Math.floor(random() * 3);
  const packages = [];
  for (let index = 0; index < packageCount; index += 1) {
    const themeStyle = PACKAGE_THEMES[theme] || PACKAGE_THEMES.fall;
    const style = Pick(random, themeStyle.styles);
    packages.push(Object.freeze({
      id: visitId + ":package-" + (index + 1),
      label: themeStyle.labels[Math.floor(random() * themeStyle.labels.length)],
      symbol: style.symbol,
      bodyColor: style.bodyColor,
      railColor: style.railColor,
      markColor: style.markColor,
      scale: 0.82 + random() * 0.24,
    }));
  }
  return Object.freeze({
    id: "2026:" + theme + "-shipment:" + visitId,
    visitId,
    theme,
    packageCount,
    packages: Object.freeze(packages),
  });
}

export function GetUpcomingSeasonalShipments(worldSeed, scheduler, worldTimeMs, limit = 3) {
  if (!scheduler || typeof scheduler.GenerateDay !== "function") return Object.freeze([]);
  const startDay = Math.floor(worldTimeMs / DAY_MS);
  const shipments = [];
  for (let offset = 0; offset < 15 && shipments.length < limit; offset += 1) {
    for (const visit of scheduler.GenerateDay(startDay + offset)) {
      if (visit.approachStartMs <= worldTimeMs || visit.eventId !== "cargo-run") continue;
      const manifest = CreateSeasonalManifest(worldSeed, visit);
      if (manifest) shipments.push(Object.freeze({ visitId: visit.visitId, atMs: visit.approachStartMs, theme: manifest.theme, packageCount: manifest.packageCount, packages: manifest.packages }));
      if (shipments.length >= limit) break;
    }
  }
  return Object.freeze(shipments);
}

function ApplySeasonalCargo(state, manifest) {
  const progress = Clamp01(state.pipTaskOverallProgress ?? state.progress);
  const count = manifest.packageCount;
  let stage;
  let packageIndex = 0;
  let cargoState = "ship";
  if (progress < 0.06) {
    stage = { id: "prepare", progress: progress / 0.06 };
  } else if (progress < 0.86) {
    const packagePosition = Clamp01((progress - 0.06) / 0.8) * count;
    packageIndex = Math.min(count - 1, Math.floor(packagePosition));
    const packageProgress = packagePosition - packageIndex;
    stage = Stage(packageProgress, [
      [packageIndex === 0 ? "travel-to-cargo" : "return-to-cargo", 0.13],
      ["inspect-cargo", 0.24],
      ["retrieve-cargo", 0.4],
      ["deliver-cargo", 0.7],
      ["stow-cargo", 0.9],
      ["package-confirm", 1],
    ]);
    cargoState = stage.id === "retrieve-cargo" || stage.id === "deliver-cargo"
      ? "carried"
      : stage.id === "stow-cargo"
        ? "stowing"
        : stage.id === "package-confirm"
          ? "stored"
          : "ship";
  } else {
    const finish = (progress - 0.86) / 0.14;
    stage = Stage(finish, [["verify", 0.36], ["react-success", 0.62], ["return", 1]]);
    packageIndex = count;
    cargoState = "stored";
  }
  Object.assign(state, {
    seasonalCargo: manifest,
    cargoManifest: manifest.packages,
    cargoPackageCount: count,
    cargoPackageIndex: packageIndex,
    cargoState,
    pipTaskId: "seasonal-cargo",
    pipTaskLabel: "Unload " + manifest.theme + " supplies",
    pipTaskStage: stage.id,
    pipTaskProgress: Clamp01(stage.progress),
    pipTaskOverallProgress: progress,
    robotActivity: "seasonal-cargo",
    ambientJob: "seasonal-cargo",
    ambientJobLabel: "Seasonal cargo · package " + Math.min(count, packageIndex + 1) + " of " + count,
    lastSignificantActivity: "Seasonal delivery — " + stage.id.replaceAll("-", " "),
  });
}

function ApplyInstallation(state, installation) {
  if (!installation || state.phase !== "quiet") return;
  const removing = installation.action === "remove";
  Object.assign(state, {
    pipTaskId: removing ? "seasonal-cleanup" : "seasonal-install",
    pipTaskLabel: (removing ? "Remove " : "Install ") + installation.targetLabel,
    pipTaskStage: installation.stage,
    pipTaskProgress: installation.stageProgress,
    pipTaskOverallProgress: installation.overallProgress,
    pipGestureVariant: installation.variant,
    robotActivity: removing ? "seasonal-cleanup" : "seasonal-install",
    ambientJob: removing ? "seasonal-cleanup" : "seasonal-install",
    ambientJobLabel: (removing ? "Remove " : "Install ") + installation.targetLabel,
    cargoState: "none",
    equipmentLightState: "normal",
    antennaState: "tracking",
    lastSignificantActivity: (removing ? "Halloween cleanup — " : "Seasonal decorating — ") + installation.stage.replaceAll("-", " "),
  });
}

function ApplyOddity(state, oddity, installation) {
  if (!oddity || oddity.id !== "pip-flicker" || installation || state.phase !== "quiet") return;
  const stage = Stage(oddity.progress, [["notice-oddity", 0.24], ["inspect-oddity", 0.72], ["puzzled-oddity", 0.88], ["return", 1]]);
  Object.assign(state, {
    pipTaskId: "seasonal-oddity",
    pipTaskLabel: "Investigate an unusual light flicker",
    pipTaskStage: stage.id,
    pipTaskProgress: stage.progress,
    pipTaskOverallProgress: oddity.progress,
    pipGestureVariant: 2,
    robotActivity: "seasonal-oddity",
    ambientJob: "seasonal-oddity",
    ambientJobLabel: "Examine a harmless flicker",
    equipmentLightState: oddity.progress < 0.72 ? "flickering" : "normal",
    lastSignificantActivity: "Halloween oddity — " + stage.id.replaceAll("-", " "),
  });
}

export function ApplyAutumn2026State(state, seasonal, worldSeed) {
  state.seasonal = seasonal;
  state.cargoManifest = null;
  state.cargoPackageCount = state.cargoState === "none" ? 0 : 1;
  state.cargoPackageIndex = 0;
  state.seasonalCargo = null;

  if (state.eventId === "cargo-run" && state.phase === "service") {
    const manifest = CreateSeasonalManifest(worldSeed, {
      eventId: state.eventId,
      visitId: state.visitId,
      approachStartMs: state.visitStartMs,
      worldTimeMs: state.worldTimeMs,
    }, { forceTheme: seasonal.previewMode === "fall-cargo" ? "fall" : seasonal.previewMode === "halloween-cargo" ? "halloween" : seasonal.previewMode === "remembrance-cargo" ? "remembrance" : null });
    if (manifest) ApplySeasonalCargo(state, manifest);
  }
  ApplyInstallation(state, seasonal.installation);
  ApplyOddity(state, seasonal.ambientOddity, seasonal.installation);
  return state;
}

export function GetFallDecorationCatalog() { return FALL_DECORATIONS; }
