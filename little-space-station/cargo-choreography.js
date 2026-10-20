import * as THREE from './vendor/three.module.js';

const smooth = value => { const t = THREE.MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); };
export function CargoHandContact(scene, dispatch, side, target) {
  if (dispatch) target.x -= side * 0.09;
  else {
    // Keep each hand on its own side while Pip turns around a far-side load.
    target.x += side * 0.23 * Math.cos(scene.robot.rotation.y);
    target.z -= side * 0.23 * Math.sin(scene.robot.rotation.y);
  }
  return target;
}
export function CargoRackPosition(scene, index, count, target) {
  target.set(count > 2 ? -0.34 + Math.floor(index / 2) * 0.57 : -0.25, 0.03, index % 2 ? -0.66 : 0.66);
  scene.ship.localToWorld(target);
  return scene.station.worldToLocal(target);
}
// All transfer anchors are station-local, with +Z being the exposed service face.
export function TransferPosition(scene, state, target) {
  const dispatch = state.pipTaskId === 'dispatch-exchange';
  const stage = state.pipTaskStage;
  const p = state.pipTaskProgress || 0;
  const scratch = scene.transferScratch ||= { carry: new THREE.Vector3(), start: new THREE.Vector3(), lip: new THREE.Vector3() };
  scratch.carry.set(dispatch ? -0.28 : 0, 0.4, 0.27);
  scene.robot.localToWorld(scratch.carry);
  scene.station.worldToLocal(scratch.carry);
  if (dispatch) {
    scratch.start.set(0, 0, 0.01);
    scene.courierDispatchBay.localToWorld(scratch.start);
    scene.station.worldToLocal(scratch.start);
  } else {
    CargoRackPosition(scene, state.cargoPackageIndex || 0, state.cargoPackageCount || 1, scratch.start);
  }
  scratch.lip.copy(scratch.start);
  scratch.lip.z += dispatch ? 0.34 : (state.cargoPackageIndex % 2 ? -0.18 : 0.18);
  if (stage === 'retrieve-cargo') {
    return p < 0.4
      ? target.lerpVectors(scratch.start, scratch.lip, smooth(p / 0.4))
      : target.lerpVectors(scratch.lip, scratch.carry, smooth((p - 0.4) / 0.6));
  }
  if (stage === 'stow-cargo') {
    scratch.lip.set(1.05, 0.48, 1.42);
    return p < 0.55
      ? target.lerpVectors(scratch.carry, scratch.lip, smooth(p / 0.55))
      : target.lerpVectors(scratch.lip, scene.cargoEnd, smooth((p - 0.55) / 0.45));
  }
  return target.copy(scratch.carry);
}
