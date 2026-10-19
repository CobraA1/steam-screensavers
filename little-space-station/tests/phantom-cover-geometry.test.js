import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { CreatePhantomCoverMesh } from "../phantom-cover-geometry.js";
import { PhantomVisitorVisual } from "../phantom-renderer.js";
import { PhantomDreamVisual } from "../phantom-dream-renderer.js";
import { PhantomActors } from "../phantom-choreography.js";

function dreamFixture() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  camera.position.z = 12;
  camera.updateMatrixWorld();
  const head = new THREE.Object3D();
  scene.add(head);
  return { scene, camera, head };
}

test("Phantom cover is one continuous, outward-facing, rounded-and-flared shell", () => {
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 });
  const cover = CreatePhantomCoverMesh(material);
  assert.equal(cover.geometry.type, "LatheGeometry");
  assert.equal(cover.material.side, THREE.FrontSide);
  assert.equal(cover.name, "phantom-cover-shell");
  const bounds = new THREE.Box3().setFromObject(cover);
  assert.ok(bounds.min.y < -0.37 && bounds.max.y > 0.2);
  assert.ok(bounds.max.x >= 0.29);
  const miniature = CreatePhantomCoverMesh(material.clone(), { scale: 0.86, offsetY: 0.08 });
  assert.strictEqual(miniature.geometry, cover.geometry);
  assert.notStrictEqual(miniature.material, cover.material);
});

test("live Phantom covers remain separate actors with one shell and independent fades", () => {
  const robotHome = new THREE.Vector3(-0.2, 1.16, 0.72);
  const visual = new PhantomVisitorVisual({ station: new THREE.Group(), robotHome });
  for (const cover of [visual.cover, visual.looseCover]) {
    assert.equal(cover.children.length, 1);
    assert.equal(cover.children[0].material.side, THREE.FrontSide);
  }
  assert.strictEqual(visual.cover.children[0].geometry, visual.looseCover.children[0].geometry);
  assert.notStrictEqual(visual.cover.children[0].material, visual.looseCover.children[0].material);
  const story = (beatId, progress) => ({ id: "phantom-visitor-2026", beatId, progress });
  visual.update(story("glimpse", 0.4));
  assert.equal(visual.cover.visible, true);
  assert.equal(visual.looseCover.visible, false);
  const alpha = PhantomActors("glimpse", 0.4, robotHome.toArray()).coverOpacity;
  assert.ok(Math.abs(visual.cover.children[0].material.opacity - alpha * 0.9) < 1e-8);
  visual.update(story("drone-departure", 0.5));
  assert.equal(visual.cover.visible, false);
  assert.equal(visual.looseCover.visible, true);
  visual.update(story("final-surprise", 0.97));
  assert.ok(visual.looseCover.children[0].material.opacity < 0.9);
  visual.update(story("glimpse", 0.4)); // reverse seek restores the first cover
  assert.equal(visual.cover.visible, true);
});

test("Phantom dream preserves independent fades and resets after reverse scrubbing", () => {
  const { scene, camera, head } = dreamFixture();
  const visual = new PhantomDreamVisual(scene);
  assert.equal(visual.cover.children.length, 1);
  assert.equal(visual.cover.children[0].geometry.type, "LatheGeometry");
  assert.equal(visual.ghostMaterial.side, THREE.FrontSide);
  const dream = (beatId, beatProgress, progress = 0.5) => ({
    type: "phantom-visitor-2026", beatId, beatProgress, progress, variant: 1,
  });
  visual.update(dream("untangle", 0.6), camera, head);
  assert.equal(visual.cover.visible, true);
  assert.ok(Math.abs(visual.ghostMaterial.opacity - 0.82) < 1e-8);
  visual.update(dream("final-surprise", 0.99, 0.95), camera, head);
  assert.ok(visual.ghostMaterial.opacity < 0.82);
  visual.update(dream("untangle", 0.6), camera, head);
  assert.ok(Math.abs(visual.ghostMaterial.opacity - 0.82) < 1e-8);
  visual.update(null, camera, head);
  assert.equal(visual.root.visible, false);
});
