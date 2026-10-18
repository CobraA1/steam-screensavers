import assert from "node:assert/strict";
import test from "node:test";

import { CalculateEnvironmentState, EnvironmentSystem } from "../environment.js";
import { EventDirector } from "../simulation-world.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const SETTINGS = Object.freeze({
  dayNightCycleMinutes: 97,
  shadowFraction: 0.34,
  planetRotationHours: 24,
  seasonalYearDays: 365,
  minimumStationBrightness: 0.3,
  seasonalEffectStrength: 0.38,
});

test("environment is deterministic for a seed and timestamp", () => {
  const first = CalculateEnvironmentState("environment-seed", 1_725_123_456_789, SETTINGS);
  const second = CalculateEnvironmentState("environment-seed", 1_725_123_456_789, SETTINGS);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, CalculateEnvironmentState("another-seed", 1_725_123_456_789, SETTINGS));
});

test("illumination is continuous across cycle and phase boundaries", () => {
  const period = SETTINGS.dayNightCycleMinutes * 60_000;
  const samples = [];
  for (let index = 0; index <= 4096; index += 1) {
    samples.push(CalculateEnvironmentState("continuity-seed", index / 4096 * period, SETTINGS).sunlightLevel);
  }
  let largestStep = 0;
  for (let index = 1; index < samples.length; index += 1) {
    largestStep = Math.max(largestStep, Math.abs(samples[index] - samples[index - 1]));
  }
  assert.ok(largestStep < 0.02);
});

test("seasonal effects remain continuous across fictional-year boundaries", () => {
  const year = SETTINGS.seasonalYearDays * DAY_MS;
  const before = CalculateEnvironmentState("season-seed", year - 1000, SETTINGS);
  const after = CalculateEnvironmentState("season-seed", year + 1000, SETTINGS);
  assert.ok(Math.abs(before.seasonalWarmth - after.seasonalWarmth) < 0.001);
  assert.ok(Math.abs(before.iceCoverage - after.iceCoverage) < 0.001);
});

test("time jumps reconstruct state directly", () => {
  const system = new EnvironmentSystem("jump-seed", SETTINGS);
  const jumped = { ...system.update(1_800_000_000_000) };
  const direct = CalculateEnvironmentState("jump-seed", 1_800_000_000_000, SETTINGS);
  assert.deepEqual(jumped, direct);
});

test("preview overrides are temporary and do not alter traffic state", () => {
  const system = new EnvironmentSystem("override-seed", SETTINGS);
  const time = 1_725_123_456_789;
  const natural = { ...system.update(time) };
  const director = new EventDirector({ worldSeed: "override-seed", testScenario: "auto" });
  const trafficBefore = { ...director.update(0, time) };
  system.setIlluminationOverride("shadow");
  system.setSeasonOverride("winter");
  const forced = { ...system.update(time) };
  assert.equal(forced.illuminationState, "shadow");
  assert.equal(forced.seasonalLabel, "winter");
  system.clearOverrides();
  assert.deepEqual({ ...system.update(time) }, natural);
  const trafficAfter = director.update(0, time);
  assert.deepEqual(
    [trafficAfter.visitId, trafficAfter.phase, trafficAfter.pipTaskId],
    [trafficBefore.visitId, trafficBefore.phase, trafficBefore.pipTaskId],
  );
});
