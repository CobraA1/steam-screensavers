import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { LittleSpaceStationScene } from '../scene.js';
import { CreateWorldIdentity } from '../station-identity.js';
import { BuildStationDetails, UpdateStationDetails } from '../station-details.js';
import { UpdatePip } from '../pip-animation.js';
import { ApplyPipPreviewOverride } from '../pip-behavior.js';
import { SmoothStep } from '../simulation-world.js';
import { CargoRackPosition, CargoHandContact } from '../cargo-choreography.js';

export function Fixture() {
  const s = Object.create(LittleSpaceStationScene.prototype);
  s.config = { worldSeed: 'courier-geometry' }; s.identity = CreateWorldIdentity(s.config.worldSeed);
  s.scene = new THREE.Scene(); s.station = new THREE.Group(); s.scene.add(s.station);
  s.materials = s.CreateMaterials(); s.elapsed = 0;
  Object.assign(s, BuildStationDetails(s.station, s.materials));
  s.BuildVisitor(); s.BuildRobot();
  s.shipDock = new THREE.Vector3(3.55, 0.03, 0.02);
  s.shipBackout = new THREE.Vector3(5.8, 0.03, 0.02);
  s.shipDeparture = new THREE.Vector3(19, 0.03, -9);
  s.shipApproach = new THREE.Vector3(20, 3, 4);
  return s;
}

test('dock and service meet in the same complete Pip pose', () => {
  for (const task of ['cargo-transfer', 'dispatch-exchange']) {
    const s = Fixture();
    UpdatePip(s, { phase: 'dock', pipTaskId: 'watch-arrival', pipTaskStage: 'observe', pipTaskProgress: 1 });
    const objects = [s.robot, s.robotHead, s.robotEye, ...s.robotArms.flatMap(a => [a.shoulder, a.elbow])];
    const before = objects.map(o => [o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
    Pose(s, task, 'prepare', 0);
    objects.forEach((o, i) => {
      assert.ok(o.position.distanceTo(before[i][0]) < 1e-8);
      assert.ok(o.quaternion.angleTo(before[i][1]) < 1e-7);
      assert.ok(o.scale.distanceTo(before[i][2]) < 1e-8);
    });
  }
});

test('turn uses balanced torque couples and reverses jets to brake', () => {
  const s = Fixture();
  const run = p => s.UpdateShip({phase: 'departure', progress: p, shipTravel: 1-SmoothStep(p), shipVisible: true, visitorType: 'freighter'});
  for (const [p, sign] of [[.4, 1], [.65, -1]]) {
    run(p);
    const jets = s.shipRcs.filter(j => j.plume.visible);
    assert.equal(jets.length, 2);
    assert.equal(jets.reduce((sum,j)=>sum-j.direction,0), 0);
    assert.equal(Math.sign(jets.reduce((sum,j)=>sum-j.z*j.direction,0)),sign);
    assert.equal(s.shipExhaust.visible,false);
  }
  run(.36); const start=s.ship.quaternion.clone(); run(.3601);
  assert.ok(start.angleTo(s.ship.quaternion)<.00001);
  run(.70); const end=s.ship.quaternion.clone(); run(.6999);
  assert.ok(end.angleTo(s.ship.quaternion)<.00001);
  assert.ok(s.ship.position.distanceTo(s.shipBackout)<1e-8);
});

test('paired racks mirror each other and far-side travel clears the ship', () => {
  const s=Fixture(); Pose(s,'cargo-transfer','prepare',0);
  const a=CargoRackPosition(s,0,2,new THREE.Vector3());
  const b=CargoRackPosition(s,1,2,new THREE.Vector3());
  assert.equal(a.x,b.x); assert.equal(a.y,b.y);
  assert.ok(Math.abs((a.z-s.ship.position.z)+(b.z-s.ship.position.z))<1e-8);
  for (const stage of ['return-to-cargo','deliver-cargo']) {
    for(let i=0;i<=100;i++) {
      const state={phase:'service',pipTaskId:'seasonal-cargo',pipTaskStage:stage,pipTaskProgress:i/100,cargoPackageCount:2,cargoPackageIndex:1};
      UpdatePip(s,state);
      // When crossing the ship's centerline, stay beyond its engine and jets.
      if(Math.abs(s.robot.position.z)<.9) assert.ok(s.robot.position.x>5.5);
    }
  }
});

test('Pip takes the positive yaw arc from the pad to the vessel', () => {
  const s=Fixture(); Pose(s,'dispatch-exchange','travel-to-cargo',.5);
  assert.ok(s.robot.rotation.y>0);
});

test('far-side retrieval and travel retain hand contact and reconstruct after seeking', () => {
  const s=Fixture(), fresh=Fixture();
  const sample=(scene, stage, progress)=>{
    const state={phase:'service',shipVisible:true,visitorType:'freighter',pipTaskId:'seasonal-cargo',pipTaskStage:stage,pipTaskProgress:progress,cargoPackageCount:2,cargoPackageIndex:1,cargoState:'carried'};
    scene.UpdateShip(state); UpdatePip(scene,state); UpdateStationDetails(scene,state);
  };
  for(const [stage,p] of [['retrieve-cargo',.4],['retrieve-cargo',1],['deliver-cargo',.25],['deliver-cargo',.5],['deliver-cargo',.75]]){
    sample(s,'deliver-cargo',1); sample(s,stage,p); sample(fresh,stage,p);
    assert.deepEqual(Snapshot(s),Snapshot(fresh));
    for(const arm of s.robotArms){
      const target=CargoHandContact(s,false,arm.side,s.cargoContainers[1].position.clone());
      assert.ok(arm.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)<.05,stage+'/'+p);
    }
  }
});
export function Pose(s, task, stage, progress) {
  const state = { phase: 'service', shipVisible: true, visitorType: task === 'dispatch-exchange' ? 'courier' : 'freighter', cargoPackageCount: 1 };
  ApplyPipPreviewOverride(state, { taskId: task, stage, progress });
  s.UpdateShip(state); UpdatePip(s, state); UpdateStationDetails(s, state);
  return state;
}
function Snapshot(s) {
  return [s.robot, ...s.robotArms.flatMap(a => [a.shoulder, a.elbow]), s.dispatchCanister, s.cargoContainer, s.hatchDoor, s.courierDispatchBayDoor]
    .map(o => [o.position.toArray(), o.quaternion.toArray(), o.scale.toArray(), o.visible]);
}
test('payloads and hand poses reconstruct identically after reverse seeking', () => {
  for (const task of ['dispatch-exchange', 'cargo-transfer']) {
    const s = Fixture(), fresh = Fixture();
    for (const [stage, p] of [['retrieve-cargo', .6], ['deliver-cargo', .5], ['stow-cargo', .4]]) {
      Pose(s, task, 'verify', .8); Pose(s, task, stage, p); Pose(fresh, task, stage, p);
      assert.deepEqual(Snapshot(s), Snapshot(fresh));
    }
  }
});
test('Pip delivers in front of the hatch and faces its service opening', () => {
  for (const task of ['dispatch-exchange', 'cargo-transfer']) {
    const s = Fixture(); Pose(s, task, 'stow-cargo', .5);
    assert.ok(s.robot.position.z > s.cargoHatch.position.z + .5);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(s.robot.quaternion);
    assert.ok(forward.dot(s.cargoHatch.position.clone().sub(s.robot.position).normalize()) > .8);
    assert.equal((task === 'dispatch-exchange' ? s.dispatchCanister : s.cargoContainer).scale.x, 1);
  }
});
test('courier payload starts inside its bay and exits continuously without changing size', () => {
  const s = Fixture(); Pose(s, 'dispatch-exchange', 'inspect-cargo', 1);
  const before = s.dispatchCanister.position.clone();
  Pose(s, 'dispatch-exchange', 'retrieve-cargo', 0);
  assert.ok(before.distanceTo(s.dispatchCanister.position) < 1e-9);
  const local = s.courierDispatchBay.worldToLocal(s.station.localToWorld(before.clone()));
  assert.ok(Math.abs(local.x) < .01 && Math.abs(local.y) < .01 && local.z < .1);
  Pose(s, 'dispatch-exchange', 'retrieve-cargo', .4);
  assert.ok(s.dispatchCanister.position.z > before.z + .3);
  assert.deepEqual(s.dispatchCanister.scale.toArray(), [1, 1, 1]);
});
test('plain crates have no stray seasonal symbols; remaining crates stay on the rack', () => {
  const s = Fixture(); const state = Pose(s, 'cargo-transfer', 'stow-cargo', .5);
  for (const key of ['leaf','gourd','sun','moon','ghost']) assert.equal(s.cargoContainer.userData.packageParts[key].visible, false);
  UpdateStationDetails(s, { ...state, cargoPackageCount: 3, cargoPackageIndex: 0, cargoState: 'stored', pipTaskStage: 'package-confirm' });
  assert.equal(s.cargoContainers[0].visible, false);
  assert.equal(s.cargoContainers[1].visible, true);
  assert.equal(s.cargoContainers[2].visible, true);
  assert.equal(s.shipCargo.visible, true);
});

test('the working hand touches the payload while carried and at the receiver lip', () => {
  for (const task of ['dispatch-exchange', 'cargo-transfer']) {
    const s = Fixture(), dispatch = task === 'dispatch-exchange';
    for (const [stage, p] of [['retrieve-cargo', .4], ['retrieve-cargo', 1], ['deliver-cargo', .5], ['stow-cargo', .55]]) {
      Pose(s, task, stage, p);
      const payload = dispatch ? s.dispatchCanister : s.cargoContainer;
      const arms = dispatch ? [s.robotArms[0]] : s.robotArms;
      for (const arm of arms) {
        const target = CargoHandContact(s, dispatch, arm.side, payload.position.clone());
        const hand = arm.hand.getWorldPosition(new THREE.Vector3());
        assert.ok(hand.distanceTo(target) < .05, task + '/' + stage + ' gap: ' + hand.distanceTo(target));
      }
    }
  }
});

test('transfer beat boundaries preserve payload position and hand contact', () => {
  for (const task of ['dispatch-exchange', 'cargo-transfer']) {
    const s = Fixture();
    for (const [a,b] of [['inspect-cargo','retrieve-cargo'], ['retrieve-cargo','deliver-cargo'], ['deliver-cargo','stow-cargo']]) {
      Pose(s, task, a, 1);
      const payload = task === 'dispatch-exchange' ? s.dispatchCanister : s.cargoContainer;
      const before = payload.position.clone();
      Pose(s, task, b, 0);
      assert.ok(before.distanceTo(payload.position) < 1e-8, task + ': ' + a + ' -> ' + b);
    }
  }
});

test('hatch and light mounts reach the hull and are separated from each other', () => {
  const s = Fixture();
  const hatch = new THREE.Box3().setFromObject(s.cargoHatch);
  const lamp = new THREE.Box3().setFromObject(s.lightHousing);
  assert.ok(lamp.max.x + .1 < hatch.min.x);
  assert.ok(Math.hypot(s.lightHousing.position.y, lamp.min.z) < 1.05);
  assert.ok(Math.hypot(s.cargoHatch.position.y, hatch.min.z) < 1.05);
});

test('freight crates follow the ship during arrival and do not return on departure', () => {
  const s = Fixture();
  const state = Pose(s, 'cargo-transfer', 'prepare', 0);
  s.ship.position.set(10, 2, -3); s.ship.rotation.set(.03, -.2, .04);
  UpdateStationDetails(s, {...state, phase:'approach', cargoState:'none'});
  assert.equal(s.cargoContainer.visible, true);
  const local = s.ship.worldToLocal(s.cargoContainer.getWorldPosition(new THREE.Vector3()));
  assert.ok(local.distanceTo(new THREE.Vector3(-.25, .03, .66)) < 1e-8);
  UpdateStationDetails(s, {...state, phase:'departure', cargoState:'none'});
  assert.ok(s.cargoContainers.every(box => !box.visible));
  assert.equal(s.shipCargo.visible, true);
});

test('the maintenance tool reaches the relocated lamp from its exposed face', () => {
  const s = Fixture();
  for (const p of [0, .25, .5, .75, 1]) {
    Pose(s, 'repair-light', 'repair', p);
    assert.ok(s.robot.position.z > s.lightHousing.position.z);
    const tip = s.robotToolGlow.getWorldPosition(new THREE.Vector3());
    const light = s.equipmentLight.getWorldPosition(new THREE.Vector3());
    assert.ok(tip.distanceTo(light) < .025, 'tool gap ' + tip.distanceTo(light));
  }
});
