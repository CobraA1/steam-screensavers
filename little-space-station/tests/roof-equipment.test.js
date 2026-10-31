import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { LittleSpaceStationScene } from '../scene.js';
import { CreateWorldIdentity } from '../station-identity.js';
import { UpdatePip } from '../pip-animation.js';
import { STUBBORN_ANTENNA_BEATS } from '../stubborn-antenna.js';

function fixture() {
  const s = Object.create(LittleSpaceStationScene.prototype);
  s.config = { worldSeed: 'roof-review' }; s.identity = CreateWorldIdentity(s.config.worldSeed);
  s.quality = { radialSegments: 14 }; s.station = new THREE.Group(); s.scene = new THREE.Scene();
  s.scene.add(s.station); s.materials = s.CreateMaterials(); s.elapsed = 0;
  s.BuildObservationDome(); s.BuildDish(); s.BuildRobot();
  return s;
}
function pose(s, task, stage, p, variant = 0) {
  UpdatePip(s, { pipTaskId: task, pipTaskStage: stage, pipTaskProgress: p, pipGestureVariant: variant });
  s.station.updateMatrixWorld(true);
}
const position = o => o.getWorldPosition(new THREE.Vector3());
const snapshot = s => [s.robot, s.robotHead, s.robotEye, ...s.robotArms.flatMap(a => [a.shoulder, a.elbow])]
  .map(o => o.matrixWorld.toArray());

test('observation dome, mast and supported charging pad occupy separate roof areas', () => {
  const s = fixture(); s.station.updateMatrixWorld(true);
  const dome = new THREE.Box3().setFromObject(s.observationDome);
  assert.ok(!dome.intersectsBox(new THREE.Box3().setFromObject(s.antennaMast)));
  assert.ok(!dome.intersectsBox(new THREE.Box3().setFromObject(s.chargingPad)));
  assert.ok(s.chargingPad.children.length >= 7);
  for (let turn = 0; turn < 24; turn++) {
    s.dishPivot.rotation.set(0, turn * Math.PI / 12, 0.81);
    s.station.updateMatrixWorld(true);
    assert.ok(!dome.intersectsBox(new THREE.Box3().setFromObject(s.dishPivot)));
  }
});

test('Pip faces the service panel and the tool touches it during all antenna repairs', () => {
  const s = fixture();
  for (const [task, stage] of [['adjust-antenna', 'adjust'], ['survey-sync', 'synchronize'],
    ['stubborn-antenna', 'first-antenna-repair'], ['stubborn-antenna', 'install-repair-plate']]) {
    for (const p of [0.72, 0.85, 1]) {
      pose(s, task, stage, p);
      const toward = s.antennaServicePoint.clone().sub(s.robot.position); toward.y = 0; toward.normalize();
      const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(s.robot.quaternion); facing.y = 0; facing.normalize();
      assert.ok(facing.dot(toward) > 0.99, task + ' facing');
      assert.ok(position(s.robotToolGlow).distanceTo(s.antennaServicePoint) < 0.012, task + ' tool contact');
    }
  }
});

test('antenna travel, recoil and repair keep Pip outside the dome, mast and rotating dish', () => {
  const s = fixture();
  const cases = [...STUBBORN_ANTENNA_BEATS.map(b => ['stubborn-antenna', b.stage]),
    ...['travel-to-antenna', 'inspect-antenna', 'prepare-tool', 'adjust', 'verify', 'return'].map(stage => ['adjust-antenna', stage]),
    ['survey-sync', 'synchronize']];
  for (let variant = 0; variant < 3; variant++) for (const [task, stage] of cases) for (let i = 0; i <= 40; i++) {
    pose(s, task, stage, i / 40, variant);
    const housing = new THREE.Box3().setFromObject(s.antennaDriveHousing);
    assert.ok(!housing.intersectsBox(new THREE.Box3().setFromObject(s.robotHead)), task + '/' + stage + ' head/housing');
    for (const part of s.robot.children.filter(o => o.geometry?.type === 'BoxGeometry')) {
      assert.ok(!housing.intersectsBox(new THREE.Box3().setFromObject(part)), task + '/' + stage + ' body/housing');
    }
    // Include every vertex of Pip's head, body, arms and tool, not just his origin.
    s.robot.traverse(o => {
      const a = o.geometry?.attributes.position; if (!a) return;
      for (let j = 0; j < a.count; j++) {
        const v = new THREE.Vector3().fromBufferAttribute(a, j).applyMatrix4(o.matrixWorld);
        const dx = v.x + 0.92, dz = v.z + 0.34;
        assert.ok(v.y < 0.93 || dx * dx + dz * dz > 0.55 ** 2 || v.y > 1.4, task + '/' + stage + ' dome');
        assert.ok(Math.hypot(v.x - 0.65, v.z + 0.18) > 0.065 || v.y < 0.93 || v.y > 2.47, task + '/' + stage + ' mast');
        assert.ok(v.distanceTo(s.dishPivot.position) > 0.67, task + '/' + stage + ' dish sweep');
      }
    });
  }
});

test('antenna poses reconstruct on reverse seeking and remain continuous at story boundaries', () => {
  const s = fixture(), fresh = fixture();
  for (let variant = 0; variant < 3; variant++) {
    for (const beat of [...STUBBORN_ANTENNA_BEATS].reverse()) {
      pose(s, 'stubborn-antenna', beat.stage, 0.65, variant);
      pose(fresh, 'stubborn-antenna', beat.stage, 0.65, variant);
      assert.deepEqual(snapshot(s), snapshot(fresh));
    }
    for (let i = 1; i < STUBBORN_ANTENNA_BEATS.length; i++) {
      pose(s, 'stubborn-antenna', STUBBORN_ANTENNA_BEATS[i - 1].stage, 1, variant);
      const before = [s.robot, s.robotHead, ...s.robotArms.map(a => a.hand)].map(position);
      const matrices = snapshot(s);
      pose(s, 'stubborn-antenna', STUBBORN_ANTENNA_BEATS[i].stage, 0, variant);
      [s.robot, s.robotHead, ...s.robotArms.map(a => a.hand)].forEach((o, j) =>
        assert.ok(position(o).distanceTo(before[j]) < 1e-8, STUBBORN_ANTENNA_BEATS[i].id + ' continuity'));
      snapshot(s).forEach((m, j) => m.forEach((v, k) => assert.ok(Math.abs(v - matrices[j][k]) < 1e-8,
        STUBBORN_ANTENNA_BEATS[i].id + ' rotation/scale continuity')));
    }
  }
});
