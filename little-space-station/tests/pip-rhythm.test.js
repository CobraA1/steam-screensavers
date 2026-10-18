import test from "node:test";
import assert from "node:assert/strict";
import { ApplyPipRechargeState, CanStartPipRecharge, CreateAntennaDream, CreatePhantomDream, CreateStoryDream, ResolvePipRecharge, SelectDreamMemory } from "../pip-rhythm.js";

const SETTINGS = Object.freeze({ cycleMinutes: 20, rechargeMinutes: 4, dreamChance: 1, dreamSeconds: 16, minimumPresentationSeconds: 3 });

test("Pip's recharge phase is deterministic and independent from light or locale", () => {
  const time = Date.UTC(2026, 9, 31, 22, 0, 0);
  assert.deepEqual(ResolvePipRecharge("rhythm", time, SETTINGS), ResolvePipRecharge("rhythm", time, SETTINGS));
  const active = ResolvePipRecharge("rhythm", time, { ...SETTINGS, cycleMinutes: 20, rechargeMinutes: 9 });
  assert.equal(typeof active.cycle, "number");
});

test("completed Phantom memories can be selected for a read-only dream", () => {
  const antenna = { type: "stubborn-antenna", instanceId: "antenna", storyYear: 2026, variant: 2, eligibleForDream: true };
  const phantom = { type: "phantom-visitor-2026", instanceId: "phantom", storyYear: 2026, variant: 1, outcome: "inspection-drone-freed", eligibleForDream: true };
  const remembrance = { type: "lights-of-remembrance-2026", instanceId: "saints", storyYear: 2026, eligibleForDream: false };
  const selections = new Set(Array.from({ length: 32 }, (_, cycle) => SelectDreamMemory([antenna, phantom, remembrance], "rhythm", cycle).type));
  assert.deepEqual([...selections].sort(), ["phantom-visitor-2026", "stubborn-antenna"]);
  assert.equal(CreateStoryDream(remembrance), null);
  assert.equal(CreateStoryDream(phantom).type, "phantom-visitor-2026");

  const dream = CreatePhantomDream(phantom, SETTINGS);
  const state = { antennaState: "incident-patched-tracking", shipVisible: false, storyIncident: { repairPlateVisible: true } };
  const facts = JSON.stringify(state);
  ApplyPipRechargeState(state, { active: true, settings: SETTINGS, progress: 0.6, cycle: 7 }, dream);
  assert.equal(state.pipTaskId, "dream-phantom");
  assert.equal(state.dream.type, "phantom-visitor-2026");
  const { antennaState, shipVisible, storyIncident } = state;
  assert.equal(JSON.stringify({ antennaState, shipVisible, storyIncident }), facts);
});

test("recharge waits for a quiet standby window and dreams only overlay Pip", () => {
  const recharge = { active: true, settings: SETTINGS };
  const quiet = { phase: "quiet", visitId: "", shipVisible: false, pipTaskId: "standby" };
  assert.equal(CanStartPipRecharge(recharge, quiet, { presentationSeconds: 4 }), true);
  assert.equal(CanStartPipRecharge(recharge, { ...quiet, pipTaskId: "cargo-transfer" }, { presentationSeconds: 4 }), false);
  const dream = CreateAntennaDream({ type: "stubborn-antenna", instanceId: "memory", storyYear: 2026, variant: 2, eligibleForDream: true }, SETTINGS);
  const state = { antennaState: "tracking", shipVisible: false };
  ApplyPipRechargeState(state, { ...recharge, progress: 0.6, cycle: 1 }, dream);
  assert.equal(state.pipTaskId, "dream-antenna");
  assert.equal(state.antennaState, "tracking");
  assert.equal(state.shipVisible, false);
});
