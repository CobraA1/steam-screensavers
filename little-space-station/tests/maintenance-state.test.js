import assert from "node:assert/strict";
import test from "node:test";

import { EventDirector } from "../simulation-world.js";

const MINUTE_MS = 60_000;
const CONFIG = Object.freeze({
  worldSeed: "maintenance-regression-station",
  testScenario: "ambient",
  maintenance: Object.freeze({ slotMinutes: 15, activeChance: 0.62 }),
});

test("light and antenna tasks expose faults, work stages, and restored outcomes", () => {
  const director = new EventDirector(CONFIG);
  const lightStates = new Set();
  const lightStages = new Set();
  const antennaStates = new Set();
  const antennaStages = new Set();
  const start = 20_000 * 24 * 60 * MINUTE_MS;

  for (let offset = 0; offset < 3 * 24 * 60 * MINUTE_MS; offset += 15_000) {
    const state = director.update(0, start + offset);
    if (state.pipTaskId === "repair-light") {
      lightStates.add(state.equipmentLightState);
      lightStages.add(state.pipTaskStage);
    }
    if (state.pipTaskId === "adjust-antenna") {
      antennaStates.add(state.antennaState);
      antennaStages.add(state.pipTaskStage);
    }
  }

  assert.ok(lightStates.has("flickering"));
  assert.ok(lightStates.has("repairing"));
  assert.ok(lightStates.has("normal"));
  assert.ok(lightStages.has("inspect-light"));
  assert.ok(lightStages.has("repair"));
  assert.ok(lightStages.has("verify"));
  assert.ok(antennaStates.has("drifted"));
  assert.ok(antennaStates.has("adjusting"));
  assert.ok(antennaStates.has("aligned"));
  assert.ok(antennaStages.has("inspect-antenna"));
  assert.ok(antennaStages.has("adjust"));
  assert.ok(antennaStages.has("verify"));
});
