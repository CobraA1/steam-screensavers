import test from "node:test";
import assert from "node:assert/strict";
import { CreateNarrativeStore } from "../persistence.js";

function MemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test("v2 visit records migrate on the next write without losing visit history", () => {
  const storage = MemoryStorage();
  const worldSeed = "migration-test";
  storage.setItem("little-space-station:narrative-state:v2", JSON.stringify({
    version: 2, worldSeed, eventId: "courier", eventInstanceId: "visit-7",
    checkpoint: "task-visible", checkpointKey: "visit-7:task", lifecycle: "presented",
  }));
  const store = CreateNarrativeStore({ storage });
  assert.equal(store.load(worldSeed).status, "loaded legacy v2");
  const committed = store.commitIncident(worldSeed, {
    type: "stubborn-antenna", instanceId: "2026:stubborn-antenna:test", storyYear: 2026, variant: 1, milestone: 1,
  });
  assert.equal(committed.ok, true);
  assert.equal(committed.record.version, 5);
  assert.equal(committed.record.eventInstanceId, "visit-7");
  assert.equal(committed.record.incident.checkpoint, "payoff-presented");
});

test("incident milestones are monotonic and completion installs one plate fact", () => {
  const store = CreateNarrativeStore({ storage: MemoryStorage() });
  const worldSeed = "incident-test";
  const incident = { type: "stubborn-antenna", instanceId: "2026:stubborn-antenna:test", storyYear: 2026, variant: 2, milestone: 2 };
  const first = store.commitIncident(worldSeed, incident);
  const retry = store.commitIncident(worldSeed, { ...incident, milestone: 1 });
  assert.equal(first.record.incident.checkpoint, "repair-presented");
  assert.equal(retry.record.incident.checkpoint, "repair-presented");
  assert.equal(retry.record.consequences.antennaRepairPlateYear, 2026);
  assert.equal(retry.record.completedStories.length, 1);
  assert.equal(retry.record.completedStories[0].eligibleForDream, true);
  assert.equal(retry.record.completedStories[0].variant, 2);
});

test("v3 completed antenna records migrate into bounded dream memory", () => {
  const storage = MemoryStorage();
  const worldSeed = "v3-memory-test";
  storage.setItem("little-space-station:narrative-state:v3", JSON.stringify({
    version: 3, worldSeed, savedAtMs: 44,
    incident: { type: "stubborn-antenna", instanceId: "2026:stubborn-antenna:memory", storyYear: 2026, variant: 1, milestone: 2 },
    completedStories: [{ type: "stubborn-antenna", instanceId: "2026:stubborn-antenna:memory", storyYear: 2026 }],
    consequences: { antennaRepairPlateYear: 2026 },
  }));
  const store = CreateNarrativeStore({ storage });
  const loaded = store.load(worldSeed);
  assert.equal(loaded.status, "loaded legacy v3");
  assert.equal(loaded.record.completedStories[0].eligibleForDream, true);
  assert.equal(loaded.record.completedStories[0].variant, 1);
});

test("clearing only the incident preserves the ordinary visit checkpoint", () => {
  const store = CreateNarrativeStore({ storage: MemoryStorage() });
  const worldSeed = "clear-test";
  store.commit({ worldSeed, eventId: "freighter", eventInstanceId: "visit-9", checkpoint: "task-visible", checkpointKey: "visit-9:task", lifecycle: "presented" });
  store.commitIncident(worldSeed, { type: "stubborn-antenna", instanceId: "2026:stubborn-antenna:test", storyYear: 2026, milestone: 2 });
  const cleared = store.clearIncident(worldSeed);
  assert.equal(cleared.record.incident, null);
  assert.equal(cleared.record.eventInstanceId, "visit-9");
  assert.equal(cleared.record.consequences.antennaRepairPlateYear, null);
});

test("v4 antenna history migrates alongside the new seasonal incident slot", () => {
  const storage = MemoryStorage();
  const worldSeed = "v4-migration";
  storage.setItem("little-space-station:narrative-state:v4", JSON.stringify({
    version: 4,
    worldSeed,
    incident: { type: "stubborn-antenna", instanceId: "2026:stubborn-antenna:v4", storyYear: 2026, variant: 2, milestone: 2 },
    completedStories: [],
    consequences: { antennaRepairPlateYear: 2026 },
  }));
  const loaded = CreateNarrativeStore({ storage }).load(worldSeed);
  assert.equal(loaded.status, "loaded legacy v4");
  assert.equal(loaded.record.version, 5);
  assert.equal(loaded.record.incident.milestone, 2);
  assert.equal(loaded.record.seasonalIncident, null);
  assert.equal(loaded.record.completedStories[0].type, "stubborn-antenna");
});

test("seasonal checkpoints are monotonic and completion creates one dream-eligible Phantom memory", () => {
  const store = CreateNarrativeStore({ storage: MemoryStorage() });
  const worldSeed = "phantom-persistence";
  const base = { type: "phantom-visitor-2026", instanceId: "2026:phantom-visitor:test", storyYear: 2026, variant: 1 };
  assert.equal(store.commitSeasonalIncident(worldSeed, { ...base, milestone: 1 }).record.seasonalIncident.checkpoint, "drone-revealed");
  assert.equal(store.commitSeasonalIncident(worldSeed, { ...base, milestone: 0 }).record.seasonalIncident.milestone, 1);
  const complete = store.commitSeasonalIncident(worldSeed, { ...base, milestone: 3 });
  const retried = store.commitSeasonalIncident(worldSeed, { ...base, milestone: 3 });
  assert.equal(complete.record.seasonalIncident.lifecycle, "resolved");
  assert.equal(retried.record.completedStories.filter((entry) => entry.type === "phantom-visitor-2026").length, 1);
  assert.equal(retried.record.completedStories.find((entry) => entry.type === "phantom-visitor-2026").eligibleForDream, true);
  assert.equal(retried.record.consequences.antennaRepairPlateYear, null);
});

test("All Saints completion is independent, idempotent, and deliberately excluded from dreams", () => {
  const store = CreateNarrativeStore({ storage: MemoryStorage() });
  const worldSeed = "remembrance-persistence";
  const phantom = { type: "phantom-visitor-2026", instanceId: "2026:phantom-visitor:done", storyYear: 2026, variant: 1, milestone: 3 };
  assert.equal(store.commitSeasonalIncident(worldSeed, phantom).ok, true);
  const remembrance = { type: "lights-of-remembrance-2026", instanceId: "2026:lights-of-remembrance:test", storyYear: 2026, variant: 2 };
  assert.equal(store.commitSeasonalIncident(worldSeed, { ...remembrance, milestone: 1 }).record.seasonalIncident.checkpoint, "lights-lit");
  assert.equal(store.commitSeasonalIncident(worldSeed, { ...remembrance, milestone: 0 }).record.seasonalIncident.milestone, 1);
  const complete = store.commitSeasonalIncident(worldSeed, { ...remembrance, milestone: 2 });
  const retried = store.commitSeasonalIncident(worldSeed, { ...remembrance, milestone: 2 });
  assert.equal(complete.record.consequences.remembranceCompletedYear, 2026);
  assert.equal(retried.record.completedStories.filter((entry) => entry.type === "lights-of-remembrance-2026").length, 1);
  assert.equal(retried.record.completedStories.find((entry) => entry.type === "lights-of-remembrance-2026").eligibleForDream, false);
  assert.equal(retried.record.completedStories.some((entry) => entry.type === "phantom-visitor-2026"), true);
});
