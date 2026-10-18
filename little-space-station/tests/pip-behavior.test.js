import assert from "node:assert/strict";
import test from "node:test";

import { ApplyPipPreviewOverride, PIP_TASK_STAGES, ResolvePipPose } from "../pip-behavior.js";
import { EventDirector } from "../simulation-world.js";

const CONFIG = Object.freeze({
  worldSeed: "pip-regression-station",
  testScenario: "cargo-run",
  maintenance: Object.freeze({ slotMinutes: 15, activeChance: 0.62 }),
});

test("maintenance and cargo stages resolve to distinct readable poses", () => {
  assert.equal(ResolvePipPose("repair-light", "inspect-light"), "inspect-light");
  assert.equal(ResolvePipPose("repair-light", "repair"), "repair-light");
  assert.equal(ResolvePipPose("adjust-antenna", "adjust"), "adjust-antenna");
  assert.equal(ResolvePipPose("cargo-transfer", "retrieve-cargo"), "grasp-cargo");
  assert.equal(ResolvePipPose("cargo-transfer", "deliver-cargo"), "carry-cargo");
  assert.equal(ResolvePipPose("look-around", "inspect-routine"), "routine-inspection");
  assert.equal(ResolvePipPose("repair-light", "react-success"), "satisfied");
});

test("preview overrides produce coherent task, equipment, and cargo states", () => {
  const state = {};
  ApplyPipPreviewOverride(state, { taskId: "repair-light", stage: "repair", progress: 0.5, variant: 2 });
  assert.deepEqual([state.pipTaskId, state.pipTaskStage, state.equipmentLightState, state.pipGestureVariant], ["repair-light", "repair", "repairing", 2]);

  ApplyPipPreviewOverride(state, { taskId: "cargo-transfer", stage: "deliver-cargo", progress: 0.4, variant: 1 });
  assert.equal(state.cargoState, "carried");
  ApplyPipPreviewOverride(state, { taskId: "cargo-transfer", stage: "stow-cargo", progress: 0.4, variant: 1 });
  assert.equal(state.cargoState, "stowing");
  ApplyPipPreviewOverride(state, { taskId: "cargo-transfer", stage: "verify", progress: 0.4, variant: 1 });
  assert.equal(state.cargoState, "stored");
});

test("every preview task stage has a valid pose and bounded progress", () => {
  for (const [taskId, stages] of Object.entries(PIP_TASK_STAGES)) {
    for (const stage of stages) {
      const state = {};
      ApplyPipPreviewOverride(state, { taskId, stage, progress: 3, variant: 7 });
      assert.ok(ResolvePipPose(taskId, stage));
      assert.ok(state.pipTaskProgress >= 0 && state.pipTaskProgress <= 1);
      assert.ok(state.pipTaskOverallProgress >= 0 && state.pipTaskOverallProgress <= 1);
    }
  }
});

test("seeded Pip task variants reconstruct across directors", () => {
  const first = new EventDirector(CONFIG);
  const second = new EventDirector(CONFIG);
  first.update(26, 1_700_000_000_000);
  second.update(26, 1_700_000_000_000);
  assert.deepEqual(
    [first.state.pipTaskId, first.state.pipTaskStage, first.state.pipGestureVariant],
    [second.state.pipTaskId, second.state.pipTaskStage, second.state.pipGestureVariant],
  );
});
