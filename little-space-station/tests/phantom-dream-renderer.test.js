import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { PhantomDreamVisual } from "../phantom-dream-renderer.js";

function Fixture() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  camera.position.set(0, 0, 12);
  camera.updateMatrixWorld();
  const head = new THREE.Object3D();
  scene.add(head);
  return { visual: new PhantomDreamVisual(scene), camera, head };
}

test("Phantom dream clearly retells the cover, drone, release and final joke", () => {
  const { visual, camera, head } = Fixture();
  const show = (beatId, beatProgress, progress) => visual.update({ type: "phantom-visitor-2026", beatId, beatProgress, progress, variant: 1 }, camera, head);
  show("glimpse", 0.5, 0.08);
  assert.equal(visual.cover.visible, true);
  assert.equal(visual.drone.visible, false);
  show("reveal", 0.6, 0.48);
  assert.equal(visual.cover.visible, true);
  assert.equal(visual.drone.visible, true);
  show("untangle", 0.5, 0.62);
  assert.ok(visual.pipArm.rotation.z > 0.5);
  assert.ok(visual.cover.position.y > visual.drone.position.y + 0.25, "cover is lifted off the drone");
  visual.root.updateMatrixWorld(true);
  const hand = visual.hand.getWorldPosition(new THREE.Vector3());
  const hem = visual.cover.parent.localToWorld(new THREE.Vector3(visual.cover.position.x, visual.cover.position.y - 0.18, 0.34));
  assert.ok(hand.distanceTo(hem) < 0.02, "miniature Pip actually touches the hem");
  show("drone-departure", 0.8, 0.76);
  assert.ok(visual.drone.position.x > 0.8);
  show("trailing-cover", 0.5, 0.88);
  assert.equal(visual.drone.visible, false);
  assert.ok(visual.cover.position.x > visual.pip.position.x);
  show("final-surprise", 0.45, 0.94);
  assert.notEqual(visual.pip.rotation.z, 0);
  assert.ok(visual.root.quaternion.equals(camera.quaternion));
  visual.update(null, camera, head);
  assert.equal(visual.root.visible, false);
});

test("Phantom dream bubble remains inside a narrow close camera", () => {
  const { visual, camera, head } = Fixture();
  camera.position.z = 5;
  camera.aspect = 0.7;
  camera.updateProjectionMatrix();
  visual.update({ type: "phantom-visitor-2026", beatId: "reveal", beatProgress: 0.5, progress: 0.5 }, camera, head);
  visual.root.updateMatrixWorld(true);
  for (const corner of [new THREE.Vector3(-2.74, 2.52, 0), new THREE.Vector3(0.3, 0.68, 0)]) {
    visual.root.localToWorld(corner);
    corner.project(camera);
    assert.ok(Math.abs(corner.x) < 1 && Math.abs(corner.y) < 1);
  }
});
