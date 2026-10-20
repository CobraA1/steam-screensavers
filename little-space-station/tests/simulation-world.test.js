import assert from "node:assert/strict";
import test from "node:test";

import { EventDirector, TrafficScheduler } from "../simulation-world.js";
import { SimulationClock } from "../simulation-clock.js";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const CONFIG = Object.freeze({
  worldSeed: "regression-station",
  testScenario: "auto",
  traffic: Object.freeze({
    quietGapMinutes: [6, 22],
    longGapChance: 0.28,
    longGapMinutes: [25, 55],
    approachSeconds: 20,
    dockSeconds: 8,
    departureSeconds: 18,
    afterglowSeconds: 25,
  }),
  maintenance: Object.freeze({ slotMinutes: 15, activeChance: 0.62 }),
});

function visitSignature(visits) {
  return visits.map(({ visitId, eventId, id, approachStartMs, serviceEndMs, resolvedMs }) => ({
    visitId,
    eventId: eventId || id,
    approachStartMs,
    serviceEndMs,
    resolvedMs,
  }));
}

test("traffic is deterministic for a seed and timestamp", () => {
  const first = new TrafficScheduler(CONFIG.worldSeed, CONFIG.traffic);
  const second = new TrafficScheduler(CONFIG.worldSeed, CONFIG.traffic);
  assert.deepEqual(visitSignature(first.GenerateDay(20_000)), visitSignature(second.GenerateDay(20_000)));
  assert.deepEqual(first.At(20_000 * DAY_MS + 12 * 60 * MINUTE_MS), second.At(20_000 * DAY_MS + 12 * 60 * MINUTE_MS));
});

test("different seeds produce different schedules", () => {
  const first = new TrafficScheduler("station-alpha", CONFIG.traffic);
  const second = new TrafficScheduler("station-beta", CONFIG.traffic);
  assert.notDeepEqual(visitSignature(first.GenerateDay(20_000)), visitSignature(second.GenerateDay(20_000)));
});

test("visits have real quiet gaps, valid service durations, and never overlap", () => {
  const scheduler = new TrafficScheduler(CONFIG.worldSeed, CONFIG.traffic);
  const visits = scheduler.GenerateDay(20_000);
  assert.ok(visits.length > 4);
  for (let index = 0; index < visits.length; index += 1) {
    const visit = visits[index];
    const serviceMinutes = (visit.serviceEndMs - visit.dockEndMs) / MINUTE_MS;
    assert.ok(serviceMinutes >= visit.serviceMinutes[0]);
    assert.ok(serviceMinutes <= visit.serviceMinutes[1]);
    if (index > 0) {
      const gapMinutes = (visit.approachStartMs - visits[index - 1].resolvedMs) / MINUTE_MS;
      assert.ok(gapMinutes >= CONFIG.traffic.quietGapMinutes[0]);
      assert.ok(visit.approachStartMs >= visits[index - 1].resolvedMs);
    }
  }
});

test("absolute time reconstructs an in-progress visit without replay", () => {
  const scheduler = new TrafficScheduler(CONFIG.worldSeed, CONFIG.traffic);
  const visit = scheduler.GenerateDay(20_000)[2];
  const time = visit.dockEndMs + (visit.serviceEndMs - visit.dockEndMs) * 0.55;
  const first = new EventDirector(CONFIG).update(0, time);
  const second = new EventDirector(CONFIG).update(0, time);
  assert.equal(first.visitId, visit.visitId);
  assert.equal(first.phase, "service");
  assert.deepEqual(
    [first.visitId, first.pipTaskId, first.pipTaskStage, first.cargoState, first.antennaState],
    [second.visitId, second.pipTaskId, second.pipTaskStage, second.cargoState, second.antennaState],
  );
});

test("Pip task stages have recognizable beginnings, work, and outcomes", () => {
  const director = new EventDirector({ ...CONFIG, testScenario: "cargo-run" });
  director.jumpToPhase('service');
  assert.equal(director.state.phase, "service");
  assert.equal(director.state.pipTaskStage, "prepare");
  director.update(54, 54_000);
  assert.match(director.state.pipTaskStage, /cargo/);
  assert.notEqual(director.state.cargoState, "none");
  director.update(115, 169_000);
  assert.equal(director.state.cargoState, "stored");
  assert.match(director.state.pipTaskStage, /verify|react-success|return/);
});

test('forced freight leaves time for a multi-package service and leisurely maneuvers', () => {
  const director=new EventDirector({...CONFIG,testScenario:'cargo-run'});
  director.jumpToPhase('dock'); director.update(13,0);
  assert.equal(director.state.phase,'dock');
  director.jumpToPhase('service'); director.update(179,0);
  assert.equal(director.state.phase,'service');
  director.update(1,0); assert.equal(director.state.phase,'departure');
  director.update(39,0); assert.equal(director.state.phase,'departure');
});

test("courier visits reconstruct a dedicated dispatch canister lifecycle", () => {
  const first = new EventDirector({ ...CONFIG, testScenario: "courier-stop" });
  const second = new EventDirector({ ...CONFIG, testScenario: "courier-stop" });
  first.jumpToPhase('service'); second.jumpToPhase('service');
  const samples = [0, 12, 10, 10, 10];
  for (const seconds of samples) {
    const firstState = { ...first.update(seconds, seconds * 1000) };
    const secondState = { ...second.update(seconds, seconds * 1000) };
    assert.equal(firstState.cargoKind, "dispatch");
    assert.deepEqual(
      [firstState.phase, firstState.pipTaskStage, firstState.cargoState, firstState.cargoKind],
      [secondState.phase, secondState.pipTaskStage, secondState.cargoState, secondState.cargoKind],
    );
  }
});

test("forced preview visits do not change the natural schedule", () => {
  const director = new EventDirector(CONFIG);
  const time = 20_000 * DAY_MS + 8 * 60 * MINUTE_MS;
  const before = { ...director.update(0, time) };
  director.forceEvent("survey-call");
  director.update(9, time + 9_000);
  director.clearForce();
  const after = director.update(0, time);
  assert.deepEqual([after.visitId, after.phase, after.checkpointKey], [before.visitId, before.phase, before.checkpointKey]);
});

test("checkpoint keys are scoped to unique visit identities", () => {
  const scheduler = new TrafficScheduler(CONFIG.worldSeed, CONFIG.traffic);
  const [firstVisit, secondVisit] = scheduler.GenerateDay(20_000);
  const director = new EventDirector(CONFIG);
  const stateFor = (visit) => ({ ...director.update(0, visit.dockEndMs + (visit.serviceEndMs - visit.dockEndMs) * 0.9) });
  const first = stateFor(firstVisit);
  const second = stateFor(secondVisit);
  assert.equal(first.lifecycle, "presented");
  assert.equal(second.lifecycle, "presented");
  assert.notEqual(first.visitId, second.visitId);
  assert.notEqual(first.checkpointKey, second.checkpointKey);
});

test("preview clock pauses, steps, and jumps predictably", () => {
  const clock = new SimulationClock({ worldTimeMs: 1_000_000, preview: true });
  clock.advance(1, 0, 0);
  assert.equal(clock.worldTimeMs, 1_000_000);
  clock.advance(1, 1, 1);
  assert.equal(clock.worldTimeMs, 1_001_000);
  clock.jumpWorld("hour");
  assert.equal(clock.worldTimeMs, 1_001_000 + 60 * MINUTE_MS);
});
