import test from "node:test";
import assert from "node:assert/strict";
import { IncidentDirector, IsStubbornAntennaWindowSafe } from "../incident-director.js";

const SETTINGS = Object.freeze({
  enabled: true,
  minimumSessionSeconds: 2,
  minimumQuietWindowSeconds: 70,
  opportunityWindowMinutes: 30,
  opportunityChance: 1,
});

function QuietState(overrides = {}) {
  const worldTimeMs = Date.UTC(2026, 5, 3, 12, 0, 0);
  return {
    phase: "quiet",
    visitId: "",
    shipVisible: false,
    worldTimeMs,
    nextArrivalMs: worldTimeMs + 90_000,
    pipTaskId: "standby",
    ...overrides,
  };
}

test("natural story selection is deterministic and waits for visible quiet time", () => {
  const config = { worldSeed: "story-regression", story: SETTINGS };
  const first = new IncidentDirector(config);
  const second = new IncidentDirector(config);
  const state = QuietState();
  assert.equal(first.update({ stepSeconds: 1, presentationSeconds: 1, eventState: state, worldTimeMs: state.worldTimeMs }), null);
  const a = first.update({ stepSeconds: 1, presentationSeconds: 2, eventState: QuietState({ worldTimeMs: state.worldTimeMs + 1_000, nextArrivalMs: state.nextArrivalMs + 1_000 }), worldTimeMs: state.worldTimeMs + 1_000 });
  const b = second.update({ stepSeconds: 2, presentationSeconds: 2, eventState: state, worldTimeMs: state.worldTimeMs });
  assert.deepEqual(a, b);
  assert.match(a.instanceId, /^2026:stubborn-antenna:/);
  assert.equal(first.update({ stepSeconds: 10, presentationSeconds: 12, eventState: state, worldTimeMs: state.worldTimeMs }), null);
});

test("cargo, survey, antenna work, forced scenarios, and short gaps cannot start the story", () => {
  for (const pipTaskId of ["cargo-transfer", "dispatch-exchange", "survey-sync", "adjust-antenna"]) {
    assert.equal(IsStubbornAntennaWindowSafe(QuietState({ pipTaskId }), SETTINGS), false);
  }
  assert.equal(IsStubbornAntennaWindowSafe(QuietState({ nextArrivalMs: QuietState().worldTimeMs + 69_000 }), SETTINGS), false);
  const director = new IncidentDirector({ worldSeed: "story-regression", story: SETTINGS });
  const state = QuietState();
  assert.equal(director.update({ stepSeconds: 5, presentationSeconds: 5, eventState: state, worldTimeMs: state.worldTimeMs, forcedScenario: true }), null);
  assert.equal(director.update({ stepSeconds: 1, presentationSeconds: 1, eventState: state, worldTimeMs: state.worldTimeMs }), null);
  assert.equal(director.update({ stepSeconds: 0, presentationSeconds: 2, eventState: state, worldTimeMs: state.worldTimeMs + 30 * 24 * 60 * 60_000 }), null);
});
