const KEY = "little-space-station:narrative-state:v5";
const V4_KEY = "little-space-station:narrative-state:v4";
const V3_KEY = "little-space-station:narrative-state:v3";
const V2_KEY = "little-space-station:narrative-state:v2";
const PROBE_KEY = "little-space-station:storage-probe:v5";
const VERSION = 5;
const ANTENNA_TYPE = "stubborn-antenna";
const PHANTOM_TYPE = "phantom-visitor-2026";
const REMEMBRANCE_TYPE = "lights-of-remembrance-2026";
const MAX_COMPLETED_STORIES = 12;
const ANTENNA_MILESTONES = Object.freeze({ none: 0, "payoff-presented": 1, "repair-presented": 2 });
const SEASONAL_TYPES = Object.freeze({
  [PHANTOM_TYPE]: Object.freeze({
    checkpoints: Object.freeze(["intro", "drone-revealed", "drone-freed", "story-complete"]),
    outcome: "inspection-drone-freed",
    eligibleForDream: true,
  }),
  [REMEMBRANCE_TYPE]: Object.freeze({
    checkpoints: Object.freeze(["intro", "lights-lit", "observance-complete"]),
    outcome: "remembrance-observed",
    eligibleForDream: false,
  }),
});

function Read(value) { try { return JSON.parse(value); } catch { return null; } }
function StringValue(value, fallback = "") { return typeof value === "string" ? value : fallback; }
function NumberValue(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }

function EmptyRecord(worldSeed) {
  return {
    version: VERSION,
    worldSeed,
    savedAtMs: 0,
    eventId: "",
    eventInstanceId: "",
    checkpoint: "",
    checkpointKey: "",
    lifecycle: "",
    incident: null,
    seasonalIncident: null,
    completedStories: [],
    consequences: { antennaRepairPlateYear: null, remembranceCompletedYear: null },
  };
}

function NormalizeIncident(value) {
  if (!value || value.type !== ANTENNA_TYPE || typeof value.instanceId !== "string" || !value.instanceId) return null;
  const milestone = Math.max(0, Math.min(2, NumberValue(value.milestone, ANTENNA_MILESTONES[value.checkpoint] || 0)));
  const storyYear = Math.floor(NumberValue(value.storyYear, 0));
  if (!storyYear) return null;
  return {
    type: ANTENNA_TYPE,
    instanceId: value.instanceId,
    storyYear,
    variant: Math.abs(Math.floor(NumberValue(value.variant, 0))) % 3,
    milestone,
    checkpoint: milestone >= 2 ? "repair-presented" : milestone === 1 ? "payoff-presented" : "intro",
    lifecycle: milestone >= 2 ? "resolved" : "presenting",
  };
}

function NormalizeSeasonalIncident(value) {
  const definition = value && SEASONAL_TYPES[value.type];
  if (!definition || typeof value.instanceId !== "string" || !value.instanceId) return null;
  const storyYear = Math.floor(NumberValue(value.storyYear, 0));
  if (storyYear !== 2026) return null;
  const requestedMilestone = NumberValue(value.milestone, definition.checkpoints.indexOf(value.checkpoint));
  const milestone = Math.max(0, Math.min(definition.checkpoints.length - 1, requestedMilestone));
  const resolved = milestone >= definition.checkpoints.length - 1;
  return {
    type: value.type,
    instanceId: value.instanceId,
    storyYear,
    variant: Math.abs(Math.floor(NumberValue(value.variant, 0))) % 3,
    milestone,
    checkpoint: definition.checkpoints[milestone],
    lifecycle: resolved ? "resolved" : "presenting",
  };
}

function NormalizeMemory(value) {
  if (!value || typeof value.instanceId !== "string" || !value.instanceId) return null;
  const definition = value.type === ANTENNA_TYPE
    ? { outcome: "repaired-with-plate", eligibleForDream: true }
    : SEASONAL_TYPES[value.type];
  if (!definition) return null;
  const storyYear = Math.floor(NumberValue(value.storyYear, 0));
  if (!storyYear) return null;
  return {
    type: value.type,
    instanceId: value.instanceId,
    storyYear,
    variant: Math.abs(Math.floor(NumberValue(value.variant, 0))) % 3,
    outcome: StringValue(value.outcome, definition.outcome),
    completedAtMs: NumberValue(value.completedAtMs),
    eligibleForDream: definition.eligibleForDream && value.eligibleForDream !== false,
  };
}

function AddCompletion(record, incident) {
  const definition = SEASONAL_TYPES[incident.type];
  if (!definition || incident.milestone < definition.checkpoints.length - 1) return;
  if (!record.completedStories.some((entry) => entry.instanceId === incident.instanceId)) {
    record.completedStories.push({
      type: incident.type,
      instanceId: incident.instanceId,
      storyYear: incident.storyYear,
      variant: incident.variant,
      outcome: definition.outcome,
      completedAtMs: record.savedAtMs,
      eligibleForDream: definition.eligibleForDream,
    });
  }
  if (incident.type === REMEMBRANCE_TYPE) record.consequences.remembranceCompletedYear = incident.storyYear;
}

function NormalizeRecord(value, worldSeed) {
  if (!value || value.version !== VERSION || value.worldSeed !== worldSeed) return null;
  const record = EmptyRecord(worldSeed);
  record.savedAtMs = NumberValue(value.savedAtMs);
  record.eventId = StringValue(value.eventId);
  record.eventInstanceId = StringValue(value.eventInstanceId);
  record.checkpoint = StringValue(value.checkpoint);
  record.checkpointKey = StringValue(value.checkpointKey);
  record.lifecycle = StringValue(value.lifecycle);
  record.incident = NormalizeIncident(value.incident);
  record.seasonalIncident = NormalizeSeasonalIncident(value.seasonalIncident);
  record.completedStories = Array.isArray(value.completedStories) ? value.completedStories.map(NormalizeMemory).filter(Boolean) : [];
  const plateYear = NumberValue(value.consequences && value.consequences.antennaRepairPlateYear, 0);
  const remembranceYear = NumberValue(value.consequences && value.consequences.remembranceCompletedYear, 0);
  record.consequences.antennaRepairPlateYear = plateYear || null;
  record.consequences.remembranceCompletedYear = remembranceYear || null;
  if (record.incident && record.incident.milestone >= 2) {
    record.consequences.antennaRepairPlateYear = record.incident.storyYear;
    const existing = record.completedStories.find((entry) => entry.instanceId === record.incident.instanceId);
    if (!existing) {
      record.completedStories.push({ type: ANTENNA_TYPE, instanceId: record.incident.instanceId, storyYear: record.incident.storyYear, variant: record.incident.variant, outcome: "repaired-with-plate", completedAtMs: record.savedAtMs, eligibleForDream: true });
    } else if (!Number.isFinite(value.completedStories && value.completedStories.find((entry) => entry.instanceId === existing.instanceId)?.variant)) {
      existing.variant = record.incident.variant;
    }
  }
  if (record.seasonalIncident) AddCompletion(record, record.seasonalIncident);
  record.completedStories = record.completedStories.slice(-MAX_COMPLETED_STORIES);
  return record;
}

function Migrate(value, expectedVersion, worldSeed) {
  if (!value || value.version !== expectedVersion || value.worldSeed !== worldSeed) return null;
  return NormalizeRecord({ ...value, version: VERSION }, worldSeed);
}

function MigrateV2(value, worldSeed) {
  if (!value || value.version !== 2 || value.worldSeed !== worldSeed) return null;
  return NormalizeRecord({ ...EmptyRecord(worldSeed), ...value, version: VERSION }, worldSeed);
}

export function CreateNarrativeStore({ onEvent = () => {}, storage = globalThis.localStorage } = {}) {
  let available = false;
  let simulatedUnavailable = false;
  let lastStatus = "unchecked";

  function report(message) { onEvent("storage: " + message); }
  function usable() { return available && !simulatedUnavailable; }
  function rawLoad(worldSeed) {
    const candidates = [
      [KEY, (value) => NormalizeRecord(value, worldSeed), "loaded"],
      [V4_KEY, (value) => Migrate(value, 4, worldSeed), "loaded legacy v4"],
      [V3_KEY, (value) => Migrate(value, 3, worldSeed), "loaded legacy v3"],
      [V2_KEY, (value) => MigrateV2(value, worldSeed), "loaded legacy v2"],
    ];
    for (const [key, normalize, status] of candidates) {
      const record = normalize(Read(storage.getItem(key)));
      if (record) return { record, status };
    }
    const empty = candidates.every(([key]) => storage.getItem(key) === null);
    return { record: null, status: empty ? "empty" : "invalid or different seed" };
  }
  function save(record) {
    const writable = { ...record, version: VERSION, savedAtMs: Date.now() };
    storage.setItem(KEY, JSON.stringify(writable));
    const readBack = NormalizeRecord(Read(storage.getItem(KEY)), writable.worldSeed);
    if (!readBack) throw new Error("read-back validation failed");
    return readBack;
  }

  function probe() {
    try {
      const value = String(Date.now());
      storage.setItem(PROBE_KEY, value);
      const passed = storage.getItem(PROBE_KEY) === value;
      storage.removeItem(PROBE_KEY);
      available = passed;
      lastStatus = passed ? "available" : "read-back failed";
    } catch (error) {
      available = false;
      lastStatus = error && error.name ? error.name : "unavailable";
    }
    report(lastStatus);
    return available;
  }

  function load(worldSeed) {
    if (!usable()) return { record: null, status: simulatedUnavailable ? "simulated unavailable" : lastStatus };
    try { return rawLoad(worldSeed); }
    catch (error) { return { record: null, status: error && error.name ? error.name : "read failed" }; }
  }

  function commit(payload) {
    if (!usable()) return { ok: false, status: simulatedUnavailable ? "simulated unavailable" : lastStatus };
    try {
      const previous = rawLoad(payload.worldSeed).record || EmptyRecord(payload.worldSeed);
      const record = save({ ...previous, ...payload, incident: previous.incident, seasonalIncident: previous.seasonalIncident, completedStories: previous.completedStories, consequences: previous.consequences });
      report("committed " + record.checkpoint);
      return { ok: true, record, status: "committed" };
    } catch (error) {
      const status = error && error.name ? error.name : "write failed";
      report(status);
      return { ok: false, status };
    }
  }

  function commitIncident(worldSeed, requested) {
    if (!usable()) return { ok: false, status: simulatedUnavailable ? "simulated unavailable" : lastStatus };
    const next = NormalizeIncident(requested);
    if (!next) return { ok: false, status: "invalid incident" };
    try {
      const previous = rawLoad(worldSeed).record || EmptyRecord(worldSeed);
      const current = previous.incident;
      const sameInstance = current && current.type === next.type && current.instanceId === next.instanceId;
      const incident = sameInstance && current.milestone > next.milestone ? current : next;
      const completedStories = [...previous.completedStories];
      const consequences = { ...previous.consequences };
      if (incident.milestone >= 2) {
        consequences.antennaRepairPlateYear = incident.storyYear;
        if (!completedStories.some((entry) => entry.instanceId === incident.instanceId)) {
          completedStories.push({ type: incident.type, instanceId: incident.instanceId, storyYear: incident.storyYear, variant: incident.variant, outcome: "repaired-with-plate", completedAtMs: Date.now(), eligibleForDream: true });
        }
      }
      const record = save({ ...previous, incident, completedStories: completedStories.slice(-MAX_COMPLETED_STORIES), consequences });
      report("incident " + incident.checkpoint);
      return { ok: true, record, status: "committed" };
    } catch (error) {
      const status = error && error.name ? error.name : "write failed";
      report(status);
      return { ok: false, status };
    }
  }

  function commitSeasonalIncident(worldSeed, requested) {
    if (!usable()) return { ok: false, status: simulatedUnavailable ? "simulated unavailable" : lastStatus };
    const next = NormalizeSeasonalIncident(requested);
    if (!next) return { ok: false, status: "invalid seasonal incident" };
    try {
      const previous = rawLoad(worldSeed).record || EmptyRecord(worldSeed);
      const current = previous.seasonalIncident;
      const currentDefinition = current && SEASONAL_TYPES[current.type];
      const currentIncomplete = current && currentDefinition && current.milestone < currentDefinition.checkpoints.length - 1;
      if (currentIncomplete && current.instanceId !== next.instanceId) return { ok: false, status: "incomplete seasonal incident" };
      const sameInstance = current && current.type === next.type && current.instanceId === next.instanceId;
      const seasonalIncident = sameInstance && current.milestone > next.milestone ? current : next;
      const working = {
        ...previous,
        seasonalIncident,
        completedStories: [...previous.completedStories],
        consequences: { ...previous.consequences },
      };
      working.savedAtMs = Date.now();
      AddCompletion(working, seasonalIncident);
      working.completedStories = working.completedStories.slice(-MAX_COMPLETED_STORIES);
      const record = save(working);
      report("seasonal incident " + seasonalIncident.checkpoint);
      return { ok: true, record, status: "committed" };
    } catch (error) {
      const status = error && error.name ? error.name : "write failed";
      report(status);
      return { ok: false, status };
    }
  }

  function clearIncident(worldSeed) {
    if (!usable()) return { ok: false, status: simulatedUnavailable ? "simulated unavailable" : lastStatus };
    try {
      const previous = rawLoad(worldSeed).record;
      if (!previous) return { ok: true, record: null, status: "empty" };
      const record = save({ ...previous, incident: null, completedStories: previous.completedStories.filter((entry) => entry.type !== ANTENNA_TYPE), consequences: { ...previous.consequences, antennaRepairPlateYear: null } });
      report("cleared stubborn antenna incident");
      return { ok: true, record, status: "cleared" };
    } catch (error) { return { ok: false, status: error && error.name ? error.name : "clear failed" }; }
  }

  function clearSeasonalIncident(worldSeed, type = null) {
    if (!usable()) return { ok: false, status: simulatedUnavailable ? "simulated unavailable" : lastStatus };
    try {
      const previous = rawLoad(worldSeed).record;
      if (!previous) return { ok: true, record: null, status: "empty" };
      const shouldClear = !type || previous.seasonalIncident && previous.seasonalIncident.type === type;
      const completedStories = type ? previous.completedStories.filter((entry) => entry.type !== type) : previous.completedStories.filter((entry) => !SEASONAL_TYPES[entry.type]);
      const consequences = { ...previous.consequences };
      if (!type || type === REMEMBRANCE_TYPE) consequences.remembranceCompletedYear = null;
      const record = save({ ...previous, seasonalIncident: shouldClear ? null : previous.seasonalIncident, completedStories, consequences });
      report("cleared seasonal incident");
      return { ok: true, record, status: "cleared" };
    } catch (error) { return { ok: false, status: error && error.name ? error.name : "clear failed" }; }
  }

  function clear() {
    try {
      for (const key of [KEY, V4_KEY, V3_KEY, V2_KEY]) storage.removeItem(key);
      report("cleared Little Space Station record");
      return { ok: true };
    } catch (error) { return { ok: false, status: error && error.name ? error.name : "clear failed" }; }
  }

  function corruptForTest() {
    if (!usable()) return { ok: false, status: "storage unavailable" };
    try { storage.setItem(KEY, "{invalid-test-record"); report("wrote invalid test record"); return { ok: true }; }
    catch (error) { return { ok: false, status: error && error.name ? error.name : "write failed" }; }
  }

  probe();
  return {
    key: KEY, load, commit, commitVisit: commit, commitIncident, commitSeasonalIncident, clearIncident, clearSeasonalIncident, clear, corruptForTest, probe,
    setSimulatedUnavailable(value) { simulatedUnavailable = Boolean(value); report(simulatedUnavailable ? "simulated unavailable" : "simulation restored"); },
    status() { return { available: usable(), nativeAvailable: available, simulatedUnavailable, lastStatus }; },
  };
}
