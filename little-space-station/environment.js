import { HashSeed } from "./random.js";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const TAU = Math.PI * 2;

export const ILLUMINATION_OVERRIDES = Object.freeze([
  Object.freeze({ id: "auto", label: "World time" }),
  Object.freeze({ id: "daylight", label: "Full daylight" }),
  Object.freeze({ id: "sunset", label: "Entering shadow" }),
  Object.freeze({ id: "shadow", label: "Deep shadow" }),
  Object.freeze({ id: "sunrise", label: "Emerging from shadow" }),
]);

export const SEASON_OVERRIDES = Object.freeze([
  Object.freeze({ id: "auto", label: "World date" }),
  Object.freeze({ id: "spring", label: "Spring" }),
  Object.freeze({ id: "summer", label: "Summer" }),
  Object.freeze({ id: "autumn", label: "Autumn" }),
  Object.freeze({ id: "winter", label: "Winter" }),
]);

const DEFAULTS = Object.freeze({
  dayNightCycleMinutes: 97,
  shadowFraction: 0.34,
  planetRotationHours: 24,
  seasonalYearDays: 365,
  minimumStationBrightness: 0.3,
  seasonalEffectStrength: 0.68,
});

function Clamp(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : minimum;
}

function Modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function Smooth(value) {
  const t = Clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function Offset(worldSeed, stream) {
  return HashSeed(String(worldSeed) + "::" + stream) / 4294967296;
}

function SeedOffsets(worldSeed) {
  return Object.freeze({
    illumination: Offset(worldSeed, "illumination-cycle-v1"),
    season: Offset(worldSeed, "season-cycle-v1"),
    rotation: Offset(worldSeed, "planet-rotation-v1"),
  });
}

function NormalizeSettings(settings = {}) {
  settings = settings || {};
  return Object.freeze({
    dayNightCycleMinutes: Clamp(settings.dayNightCycleMinutes ?? DEFAULTS.dayNightCycleMinutes, 5, 1440),
    shadowFraction: Clamp(settings.shadowFraction ?? DEFAULTS.shadowFraction, 0.08, 0.72),
    planetRotationHours: Clamp(settings.planetRotationHours ?? DEFAULTS.planetRotationHours, 1, 240),
    seasonalYearDays: Clamp(settings.seasonalYearDays ?? DEFAULTS.seasonalYearDays, 7, 3650),
    minimumStationBrightness: Clamp(settings.minimumStationBrightness ?? DEFAULTS.minimumStationBrightness, 0.15, 0.75),
    seasonalEffectStrength: Clamp(settings.seasonalEffectStrength ?? DEFAULTS.seasonalEffectStrength, 0, 1),
  });
}

function SeasonLabel(phase) {
  if (phase < 0.25) return "spring";
  if (phase < 0.5) return "summer";
  if (phase < 0.75) return "autumn";
  return "winter";
}

function ForcedSeasonPhase(override) {
  if (override === "spring") return 0.125;
  if (override === "summer") return 0.375;
  if (override === "autumn") return 0.625;
  if (override === "winter") return 0.875;
  return null;
}

function FillState(target, worldTimeMs, settings, offsets, overrides) {
  const time = Number.isFinite(Number(worldTimeMs)) ? Number(worldTimeMs) : 0;
  const cyclePeriodMs = settings.dayNightCycleMinutes * MINUTE_MS;
  const yearPeriodMs = settings.seasonalYearDays * DAY_MS;
  const rotationPeriodMs = settings.planetRotationHours * HOUR_MS;
  const transitionFraction = Math.min(0.09, settings.shadowFraction * 0.26);
  const sunsetStart = 0.5 - settings.shadowFraction * 0.5;
  const shadowStart = sunsetStart + transitionFraction;
  const sunriseEnd = 0.5 + settings.shadowFraction * 0.5;
  const shadowEnd = sunriseEnd - transitionFraction;

  let cyclePhase = Modulo(time / cyclePeriodMs + offsets.illumination, 1);
  if (overrides.illumination === "daylight") cyclePhase = 0.08;
  else if (overrides.illumination === "sunset") cyclePhase = (sunsetStart + shadowStart) * 0.5;
  else if (overrides.illumination === "shadow") cyclePhase = 0.5;
  else if (overrides.illumination === "sunrise") cyclePhase = (shadowEnd + sunriseEnd) * 0.5;

  let daylight = 1;
  let illuminationPhase = "full-sunlight";
  let illuminationState = "sunlight";
  let phaseProgress = sunsetStart > 0 ? cyclePhase / sunsetStart : 0;
  if (cyclePhase >= sunsetStart && cyclePhase < shadowStart) {
    phaseProgress = (cyclePhase - sunsetStart) / transitionFraction;
    daylight = 1 - Smooth(phaseProgress);
    illuminationPhase = "approaching-shadow";
    illuminationState = "transition";
  } else if (cyclePhase >= shadowStart && cyclePhase < shadowEnd) {
    phaseProgress = (cyclePhase - shadowStart) / Math.max(0.0001, shadowEnd - shadowStart);
    daylight = 0;
    illuminationPhase = "planetary-shadow";
    illuminationState = "shadow";
  } else if (cyclePhase >= shadowEnd && cyclePhase < sunriseEnd) {
    phaseProgress = (cyclePhase - shadowEnd) / transitionFraction;
    daylight = Smooth(phaseProgress);
    illuminationPhase = "emerging-from-shadow";
    illuminationState = "transition";
  } else if (cyclePhase >= sunriseEnd) {
    phaseProgress = (cyclePhase - sunriseEnd) / Math.max(0.0001, 1 - sunriseEnd);
  }

  const sunlightLevel = settings.minimumStationBrightness + daylight * (1 - settings.minimumStationBrightness);
  const shadowDepth = 1 - daylight;
  const forcedSeason = ForcedSeasonPhase(overrides.season);
  const seasonalPhase = forcedSeason === null
    ? Modulo(time / yearPeriodMs + offsets.season, 1)
    : forcedSeason;
  const seasonalWarmth = Math.sin((seasonalPhase - 0.125) * TAU);
  const planetRotationPhase = Modulo(time / rotationPeriodMs + offsets.rotation, 1);

  Object.assign(target, {
    worldTimeMs: time,
    cyclePhase,
    cyclePeriodMs,
    illuminationPhase,
    illuminationState,
    illuminationProgress: Smooth(phaseProgress),
    sunlightLevel,
    directSunlight: daylight,
    shadowDepth,
    artificialLightBoost: Smooth(shadowDepth),
    planetRotationPhase,
    seasonalPhase,
    seasonalLabel: SeasonLabel(seasonalPhase),
    seasonalWarmth,
    iceCoverage: 0.5 - seasonalWarmth * 0.5,
    seasonalSunTilt: Math.sin(seasonalPhase * TAU) * settings.seasonalEffectStrength,
    seasonalEffectStrength: settings.seasonalEffectStrength,
    minimumStationBrightness: settings.minimumStationBrightness,
    forcedIllumination: overrides.illumination !== "auto",
    forcedSeason: overrides.season !== "auto",
  });
  return target;
}

export function CalculateEnvironmentState(worldSeed, worldTimeMs, settings = {}, overrides = {}) {
  return FillState({}, worldTimeMs, NormalizeSettings(settings), SeedOffsets(worldSeed), {
    illumination: overrides.illumination || "auto",
    season: overrides.season || "auto",
  });
}

export class EnvironmentSystem {
  constructor(worldSeed, settings = {}) {
    this.worldSeed = worldSeed;
    this.settings = NormalizeSettings(settings);
    this.offsets = SeedOffsets(worldSeed);
    this.overrides = { illumination: "auto", season: "auto" };
    this.state = {};
  }

  setIlluminationOverride(value) {
    this.overrides.illumination = ILLUMINATION_OVERRIDES.some((option) => option.id === value) ? value : "auto";
  }

  setSeasonOverride(value) {
    this.overrides.season = SEASON_OVERRIDES.some((option) => option.id === value) ? value : "auto";
  }

  clearOverrides() {
    this.overrides.illumination = "auto";
    this.overrides.season = "auto";
  }

  update(worldTimeMs) {
    return FillState(this.state, worldTimeMs, this.settings, this.offsets, this.overrides);
  }
}
