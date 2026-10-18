import * as THREE from "./vendor/three.module.js";

export const CAMERA_FRAMING_PRESETS = Object.freeze([
  Object.freeze({ id: "original", label: "Original", apparentScale: 1 }),
  Object.freeze({ id: "slightly-closer", label: "Slightly closer", apparentScale: 1.15 }),
  Object.freeze({ id: "closer", label: "Closer", apparentScale: 1.25 }),
  Object.freeze({ id: "very-close", label: "Very close", apparentScale: 1.4 }),
]);

export const DEFAULT_CAMERA_PRESET_ID = "very-close";

export const CAMERA_VIEW_MODES = Object.freeze([
  Object.freeze({ id: "overview", label: "Station overview" }),
  Object.freeze({ id: "activity", label: "Activity focus" }),
]);

export function ResolveCameraFramingPreset(id) {
  return CAMERA_FRAMING_PRESETS.find((preset) => preset.id === id) || CAMERA_FRAMING_PRESETS[0];
}

export function ScaledCameraDistance(distance, apparentScale) {
  return distance / Math.max(1, Number(apparentScale) || 1);
}

export class CameraFramingController {
  constructor(camera, { preview = false, presetId = DEFAULT_CAMERA_PRESET_ID } = {}) {
    this.camera = camera;
    this.preview = preview;
    this.preset = ResolveCameraFramingPreset(presetId);
    this.mode = "overview";
    this.baseTarget = new THREE.Vector3(-0.35, 0.05, -0.2);
    this.overviewPosition = new THREE.Vector3(10.6, 6.3, 14.5);
    this.desiredPosition = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();
    this.currentPosition = this.overviewPosition.clone().sub(this.baseTarget)
      .multiplyScalar(1 / this.preset.apparentScale).add(this.baseTarget);
    this.currentTarget = this.baseTarget.clone();
    this.activityTarget = new THREE.Vector3();
    this.viewDirection = new THREE.Vector3();
  }

  setPreset(id) {
    if (!this.preview) return false;
    this.preset = ResolveCameraFramingPreset(id);
    return true;
  }

  setMode(id) {
    if (!this.preview || !CAMERA_VIEW_MODES.some((mode) => mode.id === id)) return false;
    this.mode = id;
    return true;
  }

  reset() {
    if (!this.preview) return false;
    this.preset = CAMERA_FRAMING_PRESETS[0];
    this.mode = "overview";
    return true;
  }

  update(time, frameSeconds, activityObject) {
    const drift = Math.sin(time * 0.055);
    this.overviewPosition.set(10.6 + drift * 0.34, 6.3 + Math.cos(time * 0.047) * 0.2, 14.5);

    this.viewDirection.copy(this.overviewPosition).sub(this.baseTarget);
    const overviewDistance = this.viewDirection.length();
    this.viewDirection.normalize();

    if (!this.preview) {
      this.camera.position.copy(this.baseTarget).addScaledVector(
        this.viewDirection,
        ScaledCameraDistance(overviewDistance, this.preset.apparentScale),
      );
      this.camera.lookAt(this.baseTarget);
      return;
    }

    if (this.mode === "activity" && activityObject) {
      activityObject.updateWorldMatrix(true, false);
      activityObject.getWorldPosition(this.activityTarget);
      this.activityTarget.y += 0.3;
      this.desiredTarget.copy(this.activityTarget);
      this.desiredPosition.copy(this.activityTarget).addScaledVector(
        this.viewDirection,
        ScaledCameraDistance(overviewDistance, this.preset.apparentScale * 1.62),
      );
    } else {
      this.desiredTarget.copy(this.baseTarget);
      this.desiredPosition.copy(this.baseTarget).addScaledVector(
        this.viewDirection,
        ScaledCameraDistance(overviewDistance, this.preset.apparentScale),
      );
    }

    const smoothing = 1 - Math.exp(-Math.max(0, Math.min(frameSeconds, 0.1)) * 3.2);
    this.currentPosition.lerp(this.desiredPosition, smoothing);
    this.currentTarget.lerp(this.desiredTarget, smoothing);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  getDiagnostics() {
    return {
      preset: this.preset.id,
      apparentScale: this.preset.apparentScale,
      mode: this.mode,
    };
  }
}
