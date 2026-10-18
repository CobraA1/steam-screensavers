import test from "node:test";
import assert from "node:assert/strict";
import {
  ApplyStubbornAntennaPreview,
  CreateStubbornAntennaPreview,
  ResolveStubbornAntennaTimeline,
  STUBBORN_ANTENNA_BEATS,
  STUBBORN_ANTENNA_TOTAL_SECONDS,
  AdvanceStubbornAntennaIncident,
  CreateStubbornAntennaIncident,
  CreateStubbornAntennaResume,
} from "../stubborn-antenna.js";
import { ResolvePipPose } from "../pip-behavior.js";

test("stubborn antenna preview has deterministic, complete beat coverage", () => {
  assert.equal(STUBBORN_ANTENNA_BEATS.length, 8);
  assert.equal(ResolveStubbornAntennaTimeline(0).beat.id, "malfunction");
  assert.equal(ResolveStubbornAntennaTimeline(STUBBORN_ANTENNA_TOTAL_SECONDS).beat.id, "exit");
  for (const beat of STUBBORN_ANTENNA_BEATS) {
    const state = {};
    ApplyStubbornAntennaPreview(state, CreateStubbornAntennaPreview({ beatId: beat.id, progress: 0.5, variant: 2 }));
    assert.equal(state.storyIncident.preview, true);
    assert.equal(state.pipTaskId, "stubborn-antenna");
    assert.notEqual(ResolvePipPose(state.pipTaskId, state.pipTaskStage), "standby");
  }
});

test("repair plate is only a temporary visual consequence after installation begins", () => {
  const before = {};
  ApplyStubbornAntennaPreview(before, CreateStubbornAntennaPreview({ beatId: "real-repair", progress: 0.2 }));
  assert.equal(before.storyIncident.repairPlateVisible, false);
  const after = {};
  ApplyStubbornAntennaPreview(after, CreateStubbornAntennaPreview({ beatId: "real-repair", progress: 0.5 }));
  assert.equal(after.storyIncident.repairPlateVisible, true);
  assert.equal(after.antennaState, "incident-repairing");
  assert.equal(after.storyIncident.id, "stubborn-antenna");
});

test("safe resume starts at the intro or final repair and never rewinds a resolved incident", () => {
  const intro = CreateStubbornAntennaIncident({ storyYear: 2026, instanceId: "intro" });
  assert.equal(CreateStubbornAntennaResume(intro).beatId, "malfunction");
  const payoff = AdvanceStubbornAntennaIncident(intro, "runaway-spin", 0.8);
  assert.equal(CreateStubbornAntennaResume(payoff).beatId, "real-repair");
  const resolved = AdvanceStubbornAntennaIncident(payoff, "verification", 0.7);
  assert.equal(CreateStubbornAntennaResume(resolved).beatId, "exit");
});
