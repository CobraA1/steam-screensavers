import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { PhantomActors, PHANTOM_WORK } from "../phantom-choreography.js";
import { PHANTOM_VISITOR_BEATS } from "../phantom-visitor.js";
import { PhantomVisitorVisual } from "../phantom-renderer.js";
import { PhantomDreamVisual } from "../phantom-dream-renderer.js";
import { LittleSpaceStationScene } from "../scene.js";
import { UpdatePip } from "../pip-animation.js";
import { CreatePhantomDream, ApplyPipRechargeState } from "../pip-rhythm.js";

test("live actors retain position and opacity across every adjacent beat", () => {
  for (let i = 1; i < PHANTOM_VISITOR_BEATS.length; i++) {
    const a = PhantomActors(PHANTOM_VISITOR_BEATS[i - 1].id, 1);
    const b = PhantomActors(PHANTOM_VISITOR_BEATS[i].id, 0);
    for (const actor of ["cover", "drone"]) {
      assert.ok(Math.abs(a[actor + "Opacity"] - b[actor + "Opacity"]) < 1e-9);
      if (a[actor + "Opacity"] > 0) assert.ok(new THREE.Vector3(...a[actor]).distanceTo(new THREE.Vector3(...b[actor])) < 1e-9);
    }
  }
});

test("live visitor seeks reconstruct transforms without residue from later beats", () => {
  const fixture = () => new PhantomVisitorVisual({ station: new THREE.Group(), robotHome: new THREE.Vector3(-0.2, 1.16, 0.72) });
  const visual = fixture(), fresh = fixture();
  const show = (v, beatId, progress) => v.update({ id: "phantom-visitor-2026", beatId, progress });
  show(visual, "untangle", 0.8);
  show(visual, "final-surprise", 0.8);
  show(visual, "reveal", 0.7);
  show(fresh, "reveal", 0.7);
  assert.deepEqual(visual.cover.rotation.toArray(), fresh.cover.rotation.toArray());
  assert.deepEqual(visual.drone.position.toArray(), fresh.drone.position.toArray());
  assert.equal(visual.cover.userData.materials[0].opacity, fresh.cover.userData.materials[0].opacity);
});

test("Pip faces the revealed drone and the real hand reaches the moving cloth", () => {
  const scene = Object.create(LittleSpaceStationScene.prototype);
  scene.scene = new THREE.Scene(); scene.station = new THREE.Group(); scene.scene.add(scene.station);
  const mat = new THREE.MeshStandardMaterial();
  scene.materials = new Proxy({}, { get: () => mat }); scene.elapsed = 0;
  scene.BuildRobot();
  for (const progress of [0, 0.25, 0.5, 0.65]) {
    UpdatePip(scene, { pipTaskId: "phantom-visitor", pipTaskStage: "phantom-untangle", pipTaskProgress: progress });
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), scene.robot.rotation.y);
    const toward = new THREE.Vector3(...PHANTOM_WORK).sub(scene.robot.position); toward.y = 0;
    assert.ok(forward.dot(toward.normalize()) > 0.99);
    const actors = PhantomActors("untangle", progress);
    const grip = new THREE.Vector3(...actors.cover).add(new THREE.Vector3(0.15, -0.05, 0));
    const hand = scene.robotArms[1].hand.getWorldPosition(new THREE.Vector3());
    assert.ok(hand.distanceTo(grip) < 0.035, "hand gap at " + progress + ": " + hand.distanceTo(grip));
  }
});

test("dream beat boundaries keep visible actors continuous and seeking resets opacity", () => {
  const scene = new THREE.Scene(), visual = new PhantomDreamVisual(scene);
  const camera = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100); camera.position.z = 12;
  const head = new THREE.Object3D(); scene.add(head);
  const show = (beatId, beatProgress) => visual.update({ type: "phantom-visitor-2026", beatId, beatProgress, progress: 0.5 }, camera, head);
  for (let i = 1; i < PHANTOM_VISITOR_BEATS.length; i++) {
    show(PHANTOM_VISITOR_BEATS[i - 1].id, 1);
    const pip = visual.pip.position.clone(), cover = visual.cover.position.clone(), visible = visual.cover.visible;
    show(PHANTOM_VISITOR_BEATS[i].id, 0);
    assert.ok(pip.distanceTo(visual.pip.position) < 1e-9);
    if (visible) assert.ok(cover.distanceTo(visual.cover.position) < 1e-9);
  }
  show("drone-departure", 1); assert.ok(visual.droneMaterials.every(m => m.opacity === 0));
  show("reveal", 1); assert.ok(visual.droneMaterials.every(m => m.opacity === 1));
});

test("Phantom dream carries original memory identity without mutating world facts", () => {
  const memory = { type: "phantom-visitor-2026", instanceId: "2026:phantom:test", storyYear: 2026,
    outcome: "inspection-drone-freed", variant: 2, eligibleForDream: true };
  const original = structuredClone(memory);
  const dream = CreatePhantomDream(memory); dream.elapsed = dream.duration * 0.65;
  const state = { cargoState: "stored", antennaState: "damaged", visitId: "next-ship", worldTimeMs: Date.UTC(2027, 1, 1) };
  const before = { ...state };
  ApplyPipRechargeState(state, { active: true, progress: 0.6, cycle: 1 }, dream);
  for (const key of Object.keys(before)) assert.equal(state[key], before[key]);
  assert.deepEqual(memory, original);
  assert.equal(state.dream.storyYear, 2026); assert.equal(state.dream.outcome, memory.outcome);
  assert.equal(state.dream.variant, 2); assert.equal(state.dream.instanceId, memory.instanceId);
});
