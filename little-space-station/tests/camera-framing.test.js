import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as THREE from "../vendor/three.module.js";

import {
  CAMERA_FRAMING_PRESETS,
  CAMERA_VIEW_MODES,
  CameraFramingController,
  DEFAULT_CAMERA_PRESET_ID,
  ResolveCameraFramingPreset,
  ScaledCameraDistance,
} from "../camera-framing.js";
import { EXPANSION_LAYOUTS } from "../expansion-preview.js";

test("camera presets encode the requested apparent scales", () => {
  assert.deepEqual(
    CAMERA_FRAMING_PRESETS.map(({ id, apparentScale }) => [id, apparentScale]),
    [["original", 1], ["slightly-closer", 1.15], ["closer", 1.25], ["very-close", 1.4]],
  );
  assert.equal(ScaledCameraDistance(14, 1.4), 10);
  assert.equal(ResolveCameraFramingPreset("missing").id, "original");
  assert.equal(DEFAULT_CAMERA_PRESET_ID, "very-close");
});

test("preview camera controls retain mode across presentation updates and reset cleanly", () => {
  const camera = { position: { copy() {} }, lookAt() {} };
  const controller = new CameraFramingController(camera, { preview: true });
  const worldState = Object.freeze({ visitId: "visit-7", shipTravel: 0.42, pipTaskProgress: 0.61 });
  const before = { ...worldState };

  controller.setPreset("very-close");
  controller.setMode("activity");
  assert.deepEqual(controller.getDiagnostics(), { preset: "very-close", apparentScale: 1.4, mode: "activity" });
  assert.deepEqual(worldState, before);

  controller.reset();
  assert.deepEqual(controller.getDiagnostics(), { preset: "original", apparentScale: 1, mode: "overview" });
  assert.deepEqual(CAMERA_VIEW_MODES.map((mode) => mode.id), ["overview", "activity", "top", "front", "side"]);
});

test("production camera uses the approved close default and ignores experimental setters", () => {
  const camera = { position: { copy() {} }, lookAt() {} };
  const controller = new CameraFramingController(camera);
  assert.equal(controller.setPreset("very-close"), false);
  assert.equal(controller.setMode("activity"), false);
  assert.deepEqual(controller.getDiagnostics(), { preset: "very-close", apparentScale: 1.4, mode: "overview" });
});

test("expansion catalog remains bounded and non-simulating", () => {
  assert.deepEqual(
    EXPANSION_LAYOUTS.map(({ id, additions }) => [id, additions]),
    [["current", 0], ["moderate", 3], ["developed", 6]],
  );
});

test("preview geometry remains behind the dynamic preview boundary and routes stay fixed", () => {
  const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const sceneSource = readFileSync(new URL("../scene.js", import.meta.url), "utf8");
  assert.match(appSource, /if \(!IS_PREVIEW\) return;\s*import\("\.\/preview-tools\.js"\)/);
  assert.doesNotMatch(appSource, /expansion-preview/);
  assert.match(sceneSource, /shipApproach = new THREE\.Vector3\(18, 5, -7\)/);
  assert.match(sceneSource, /shipDock = new THREE\.Vector3\(3\.55, 0\.03, 0\.02\)/);
  assert.match(sceneSource, /shipBackout = new THREE\.Vector3\(7\.2, 0\.38, 0\.15\)/);
  assert.match(sceneSource, /shipDeparture = new THREE\.Vector3\(19, 4, -9\)/);
});

test("preview orthographic views use station-local orthogonal axes", () => {
  const perspective = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  const station = new THREE.Group();
  station.position.set(-0.7, 0.15, 0);
  station.rotation.set(-0.06, -0.28, -0.06);
  station.updateWorldMatrix(true, false);
  const controller = new CameraFramingController(perspective, { preview: true });
  controller.setReviewStation(station);
  controller.setViewport(1280, 800);
  assert.strictEqual(controller.getActiveCamera(), perspective);
  const center = new THREE.Vector3(-1.45, 0.05, 0.6).applyMatrix4(station.matrixWorld);
  const q = new THREE.Quaternion();
  station.getWorldQuaternion(q);
  const expectedAxes = {
    top: [0, 1, 0], front: [1, 0, 0], side: [0, 0, 1],
  };
  for (const [mode, axes] of Object.entries(expectedAxes)) {
    assert.equal(controller.setMode(mode), true);
    controller.update(12, 0.016);
    const ortho = controller.getActiveCamera();
    assert.ok(ortho.isOrthographicCamera);
    assert.ok(Math.abs(ortho.right / ortho.top - 1.6) < 1e-9);
    const actual = ortho.position.clone().sub(center).normalize();
    const expected = new THREE.Vector3(...axes).applyQuaternion(q);
    assert.ok(actual.distanceTo(expected) < 1e-5, mode + " direction");
  }
  controller.setViewport(800, 1280);
  assert.ok(Math.abs(controller.getActiveCamera().right / controller.getActiveCamera().top - 0.625) < 1e-9);
  controller.reset();
  assert.strictEqual(controller.getActiveCamera(), perspective);
});

test("production never constructs or accepts an orthographic review camera", () => {
  const perspective = new THREE.PerspectiveCamera(39, 1.6, 0.1, 100);
  const controller = new CameraFramingController(perspective);
  assert.equal(controller.orthographicCamera, null);
  assert.equal(controller.setMode("top"), false);
  assert.strictEqual(controller.getActiveCamera(), perspective);
});
