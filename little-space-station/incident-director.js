import { DeriveSeed } from "./random.js";
import { CreateStubbornAntennaIncident, STUBBORN_ANTENNA_TOTAL_SECONDS } from "./stubborn-antenna.js";

const DEFAULT_STORY = Object.freeze({
  enabled: true,
  minimumSessionSeconds: 12,
  minimumQuietWindowSeconds: STUBBORN_ANTENNA_TOTAL_SECONDS + 12,
  opportunityWindowMinutes: 30,
  opportunityChance: 0.18,
});

function Clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function Settings(supplied) { return Object.freeze({ ...DEFAULT_STORY, ...(supplied || {}) }); }

export function IsStubbornAntennaWindowSafe(state, settings = DEFAULT_STORY) {
  if (!state || state.phase !== "quiet" || state.visitId || state.shipVisible) return false;
  if (!state.nextArrivalMs || !Number.isFinite(state.worldTimeMs)) return false;
  const timeUntilArrival = (state.nextArrivalMs - state.worldTimeMs) / 1000;
  if (timeUntilArrival < settings.minimumQuietWindowSeconds) return false;
  // Cargo and survey tasks are never pre-empted. An ordinary antenna adjustment
  // also needs to finish before the story takes ownership of the dish.
  if (["cargo-transfer", "dispatch-exchange", "survey-sync", "adjust-antenna"].includes(state.pipTaskId)) return false;
  return ["standby", "look-around"].includes(state.pipTaskId);
}

export class IncidentDirector {
  constructor(config = {}, { onTransition = () => {} } = {}) {
    this.worldSeed = config.worldSeed || "little-station-001";
    this.settings = Settings(config.story);
    this.onTransition = onTransition;
    this.quietPresentationSeconds = 0;
    this.started = false;
    this.lastWorldTimeMs = null;
  }

  update({ stepSeconds = 0, presentationSeconds = 0, eventState, worldTimeMs = Date.now(), hasSavedIncident = false, forcedScenario = false } = {}) {
    if (!this.settings.enabled || this.started || hasSavedIncident || forcedScenario) return null;
    const expectedAdvanceMs = Math.max(0, stepSeconds) * 1000;
    if (this.lastWorldTimeMs !== null && Math.abs((worldTimeMs - this.lastWorldTimeMs) - expectedAdvanceMs) > 2_000) {
      this.quietPresentationSeconds = 0;
      this.lastWorldTimeMs = worldTimeMs;
      return null;
    }
    this.lastWorldTimeMs = worldTimeMs;
    const safe = IsStubbornAntennaWindowSafe(eventState, this.settings);
    this.quietPresentationSeconds = safe ? this.quietPresentationSeconds + Math.max(0, stepSeconds) : 0;
    if (!safe || presentationSeconds < this.settings.minimumSessionSeconds || this.quietPresentationSeconds < this.settings.minimumSessionSeconds) return null;

    const year = new Date(worldTimeMs).getUTCFullYear();
    const windowMs = Math.max(1, this.settings.opportunityWindowMinutes) * 60_000;
    const window = Math.floor(worldTimeMs / windowMs);
    const score = (DeriveSeed(this.worldSeed, "stubborn-antenna-opportunity-v1:" + year + ":" + window) >>> 0) / 0x100000000;
    if (score >= Clamp01(this.settings.opportunityChance)) return null;

    const variant = DeriveSeed(this.worldSeed, "stubborn-antenna-variant-v1:" + year + ":" + window) % 3;
    const incident = CreateStubbornAntennaIncident({
      storyYear: year,
      variant,
      instanceId: year + ":stubborn-antenna:" + window.toString(36),
    });
    this.started = true;
    this.onTransition({ incident, state: "pending" });
    return incident;
  }
}
