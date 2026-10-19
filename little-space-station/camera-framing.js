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
  Object.freeze({ id: "top", label: "Top orthographic · station axes" }),
  Object.freeze({ id: "front", label: "Front orthographic (+Z) · station axes" }),
  Object.freeze({ id: "side", label: "Side orthographic (+X) · station axes" }),
]);

const ORTHOGRAPHIC_MODES = Object.freeze({
  top: Object.freeze({ axis: [0, 1, 0], up: [0, 0, -1] }),
  front: Object.freeze({ axis: [0, 0, 1], up: [0, 1, 0] }),
  side: Object.freeze({ axis: [1, 0, 0], up: [0, 1, 0] }),
});

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
    // Preview inspection only: production never creates this camera.
    this.orthographicCamera = preview ? new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 100) : null;
    this.reviewStation = null;
    this.reviewAspect = 16 / 10;
    this.reviewTarget = new THREE.Vector3();
    this.reviewAxis = new THREE.Vector3();
    this.reviewUp = new THREE.Vector3();
    this.reviewRotation = new THREE.Quaternion();
    this.reviewLocalTarget = new THREE.Vector3(-1.45, 0.05, 0.6);
  }

  setReviewStation(station) {
    if (this.preview) this.reviewStation = station;
  }

  setViewport(width, height) {
    if (!this.preview) return;
    this.reviewAspect = Math.max(1, width) / Math.max(1, height);
    this.updateOrthographicFrustum();
  }

  updateOrthographicFrustum() {
    if (!this.orthographicCamera) return;
    // The inspection frustum fits both the aft deck and front ship port.
    const halfHeight = 6.8 / this.preset.apparentScale;
    const camera = this.orthographicCamera;
    camera.left = -halfHeight * this.reviewAspect;
    camera.right = halfHeight * this.reviewAspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

  getActiveCamera() {
    return this.preview && ORTHOGRAPHIC_MODES[this.mode] ? this.orthographicCamera : this.camera;
  }

  setPreset(id) {
    if (!this.preview) return false;
    this.preset = ResolveCameraFramingPreset(id);
    this.updateOrthographicFrustum();
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
    this.updateOrthographicFrustum();
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

    const mode = ORTHOGRAPHIC_MODES[this.mode];
    if (!mode) return;
    const station = this.reviewStation;
    if (station) {
      station.updateWorldMatrix(true, false);
      station.getWorldQuaternion(this.reviewRotation);
      this.reviewTarget.copy(this.reviewLocalTarget).applyMatrix4(station.matrixWorld);
    } else {
      this.reviewRotation.identity();
      this.reviewTarget.copy(this.baseTarget);
    }
    this.reviewAxis.fromArray(mode.axis).applyQuaternion(this.reviewRotation);
    this.reviewUp.fromArray(mode.up).applyQuaternion(this.reviewRotation);
    const camera = this.orthographicCamera;
    camera.up.copy(this.reviewUp);
    camera.position.copy(this.reviewTarget).addScaledVector(this.reviewAxis, 35);
    camera.lookAt(this.reviewTarget);
    camera.updateMatrixWorld(true);
  }

  getDiagnostics() {
    return {
      preset: this.preset.id,
      apparentScale: this.preset.apparentScale,
      mode: this.mode,
    };
  }
}
