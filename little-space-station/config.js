// The Little Space Station configuration.
// Edit values here, then restart the screensaver. There is intentionally no production UI.
export default Object.freeze({
  // Any string or number. The same seed recreates the same station and traffic schedule.
  worldSeed: "little-station-001",

  // Multiplies presentation and animation time. Try 2 or 4 while testing sequences.
  simulationSpeed: 1,

  // Slow calendar-based installation from Sep 22 00:00 UTC, and dismantling
  // ending Jan 7 00:00 UTC. Each process takes this many hours (1–48).
  serviceDeck: Object.freeze({ transitionHours: 24 }),

  // "low", "medium", or "high". Controls geometry detail and star density.
  visualQuality: "medium",

  // Caps WebGL resolution on high-DPI displays to control heat and power use.
  maxPixelRatio: 1.5,

  // Production camera framing. Other valid values are "original", "slightly-closer",
  // and "closer". Preview mode exposes all four for comparison.
  cameraFraming: "very-close",

  // Writes lifecycle and checkpoint changes to the developer console.
  debug: false,

  // Stylized absolute-time environment. Values are clamped to safe ranges by
  // environment.js. Changing these does not require or create saved state.
  environment: Object.freeze({
    // One sunlight-to-shadow orbit in real-world minutes.
    dayNightCycleMinutes: 97,
    // Fraction of the cycle occupied by sunset, shadow, and sunrise.
    shadowFraction: 0.34,
    // Slow visible rotation of the procedural planet.
    planetRotationHours: 24,
    // Length of the fictional seasonal year in real-world days.
    seasonalYearDays: 365,
    // Keeps station geometry readable on televisions during deep shadow.
    minimumStationBrightness: 0.3,
    // 0 disables seasonal tint/ice changes; 1 uses their full safe range.
    seasonalEffectStrength: 0.68,
  }),

  // Absolute-time traffic schedule. Gaps are deterministic for the world seed.
  // All ranges are [minimum, maximum]. Times are easy to tune in minutes.
  traffic: Object.freeze({
    quietGapMinutes: [6, 22],
    longGapChance: 0.28,
    longGapMinutes: [25, 55],
    serviceMinutes: Object.freeze({
      "courier-stop": [1, 3],
      "survey-call": [2, 5],
      "cargo-run": [3, 8],
    }),
    approachSeconds: 20,
    dockSeconds: 8,
    departureSeconds: 18,
    afterglowSeconds: 25,
  }),

  // Pip gets at most one coherent maintenance assignment per slot and rests
  // for the remainder. Increase slotMinutes for an even quieter station.
  maintenance: Object.freeze({
    slotMinutes: 15,
    activeChance: 0.62,
  }),

  // A seeded, absolute-time duty rhythm independent of the orbital light cycle.
  // Pip only starts a recharge in a quiet, conflict-free moment.
  pipRhythm: Object.freeze({
    enabled: true,
    cycleMinutes: 173,
    rechargeMinutes: 11,
    dreamSeconds: 20,
    dreamChance: 0.42,
    minimumPresentationSeconds: 8,
  }),

  // The first story is intentionally uncommon. It begins only in a quiet,
  // conflict-free window and is recorded before it can take over Pip and dish.
  story: Object.freeze({
    enabled: true,
    minimumSessionSeconds: 12,
    minimumQuietWindowSeconds: 70,
    opportunityWindowMinutes: 30,
    opportunityChance: 0.18,
    // Halloween-only Phantom Visitor opportunity sampling. The story still
    // waits for enough clear time before the next scheduled ship.
    phantomOpportunityWindowMinutes: 18,
    phantomOpportunityChance: 0.58,
  }),

  // "auto" follows the deterministic schedule. Other options are "cargo-run",
  // "courier-stop", "survey-call", and "ambient".
  // Preview mode also exposes these choices through its event console.
  testScenario: "auto",
});
