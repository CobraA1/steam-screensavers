const HOUR_MS = 60 * 60 * 1000;

export const WORLD_TIME_UNITS = Object.freeze({
  hour: HOUR_MS,
  day: 24 * HOUR_MS,
  week: 7 * 24 * HOUR_MS,
});

export class SimulationClock {
  constructor({ worldTimeMs = Date.now(), preview = false } = {}) {
    this.preview = preview;
    this.worldTimeMs = worldTimeMs;
    this.worldMode = preview ? "simulated" : "live";
    this.presentationSeconds = 0;
    this.animationSeconds = 0;
  }

  advance(wallSeconds, presentationSeconds, animationSeconds) {
    if (this.worldMode === "live") this.worldTimeMs = Date.now();
    else this.worldTimeMs += Math.max(0, presentationSeconds) * 1000;
    this.presentationSeconds += Math.max(0, presentationSeconds);
    this.animationSeconds += Math.max(0, animationSeconds);
  }

  setWorldTime(value) {
    const time = Number(value);
    if (!Number.isFinite(time)) return false;
    this.worldTimeMs = time;
    this.worldMode = "simulated";
    return true;
  }

  useActualTime() {
    this.worldMode = "live";
    this.worldTimeMs = Date.now();
  }

  jumpWorld(unit, amount = 1) {
    const duration = WORLD_TIME_UNITS[unit];
    const multiplier = Number(amount);
    if (!duration || !Number.isFinite(multiplier)) return false;
    this.worldTimeMs += duration * multiplier;
    this.worldMode = "simulated";
    return true;
  }

  restartPresentation() {
    this.presentationSeconds = 0;
    this.animationSeconds = 0;
  }

  snapshot() {
    return {
      actualTimeMs: Date.now(),
      worldTimeMs: this.worldTimeMs,
      worldMode: this.worldMode,
      presentationSeconds: this.presentationSeconds,
      animationSeconds: this.animationSeconds,
    };
  }
}
