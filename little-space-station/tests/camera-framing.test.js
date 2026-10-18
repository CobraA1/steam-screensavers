import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
  assert.deepEqual(CAMERA_VIEW_MODES.map((mode) => mode.id), ["overview", "activity"]);
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
