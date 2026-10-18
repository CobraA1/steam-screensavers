import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { AntennaDreamVisual } from "../dream-renderer.js";
import { AdvanceDream, ApplyPipRechargeState, CreateAntennaDream } from "../pip-rhythm.js";

function Fixture() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  camera.position.set(0, 0, 12);
  camera.updateMatrixWorld();
  const head = new THREE.Object3D();
  scene.add(head);
  return { visual: new AntennaDreamVisual(scene), camera, head };
}

test("dream actors show retreat, repair and outcome while the stage stays still", () => {
  const { visual, camera, head } = Fixture();
  const show = (beatId, beatProgress, progress) => visual.update({ type: "stubborn-antenna", beatId, beatProgress, progress, variant: 2 }, camera, head);
  show("first-repair", 0.5, 0.35);
  const workPosition = visual.pip.position.x;
  assert.equal(visual.tool.visible, true);
  assert.equal(visual.plate.visible, false);
  show("runaway-spin", 0.5, 0.53);
  assert.ok(visual.pip.position.x < workPosition - 0.5);
  assert.equal(visual.sweep.visible, true);
  assert.equal(visual.tool.visible, false);
  show("real-repair", 0.7, 0.72);
  assert.equal(visual.plate.visible, true);
  assert.equal(visual.tool.visible, true);
  assert.equal(visual.sweep.visible, false);
  assert.ok(visual.root.quaternion.equals(camera.quaternion));
  show("exit", 1, 1);
  assert.ok(visual.materials.every(({ material }) => material.opacity === 0));
  visual.update(null, camera, head);
  assert.equal(visual.root.visible, false);
});

test("dream stays in the camera bounds in a close or narrow view", () => {
  const { visual, camera, head } = Fixture();
  camera.position.z = 5;
  camera.aspect = 0.7;
  camera.updateProjectionMatrix();
  visual.update({ type: "stubborn-antenna", beatId: "verification", beatProgress: 0.5, progress: 0.85 }, camera, head);
  visual.root.updateMatrixWorld(true);
  for (const corner of [new THREE.Vector3(-2.74, 2.52, 0), new THREE.Vector3(0.3, 0.68, 0)]) {
    visual.root.localToWorld(corner);
    corner.project(camera);
    assert.ok(Math.abs(corner.x) < 1 && Math.abs(corner.y) < 1);
  }
});

test("a dream finishes without rewriting its memory or live station facts", () => {
  const memory = Object.freeze({ type: "stubborn-antenna", instanceId: "saved", storyYear: 2026, variant: 2, eligibleForDream: true });
  const dream = CreateAntennaDream(memory);
  const state = { antennaState: "tracking", cargoState: "ship", visitId: "visit-1", storyIncident: { repairPlateVisible: true } };
  const facts = JSON.stringify(state);
  ApplyPipRechargeState(state, { active: true, cycle: 1, progress: 0.6 }, dream);
  assert.equal(state.dream.variant, 2);
  ApplyPipRechargeState(state, { active: true, cycle: 1, progress: 0.6 }, AdvanceDream(dream, dream.duration));
  assert.equal(state.dream, null);
  assert.equal(state.pipTaskId, "charging");
  const { antennaState, cargoState, visitId, storyIncident } = state;
  assert.equal(JSON.stringify({ antennaState, cargoState, visitId, storyIncident }), facts);
  assert.equal(memory.variant, 2);
});
