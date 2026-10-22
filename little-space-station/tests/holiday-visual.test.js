import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { LittleSpaceStationScene } from '../scene.js';
import { CreateWorldIdentity } from '../station-identity.js';
import { HolidayVisual } from '../holiday-renderer.js';
import { HolidayCalendar } from '../holiday-calendar.js';
import { ThanksgivingActors, ThanksgivingTimeline, THANKSGIVING_BEATS } from '../thanksgiving.js';
import { UpdatePip } from '../pip-animation.js';
function fixture(){const s=Object.create(LittleSpaceStationScene.prototype);
  s.config={worldSeed:'holiday-geometry'};s.identity=CreateWorldIdentity(s.config.worldSeed);
  s.station=new THREE.Group();s.scene=new THREE.Scene();s.scene.add(s.station);
  s.materials=s.CreateMaterials();s.elapsed=0;s.BuildRobot();s.holiday=new HolidayVisual(s);return s;}
function pose(s,t){const state={holiday:HolidayCalendar(Date.UTC(2026,10,26)),thanksgiving:ThanksgivingTimeline(t),
  seasonal:{serviceDeck:{ready:true}},pipTaskId:'thanksgiving',pipTaskStage:'gathering',pipTaskProgress:0};
  UpdatePip(s,state);s.holiday.update(state);s.station.updateMatrixWorld(true);}
test('working hands reach the lantern and third tray; actual transforms reconstruct after reverse seeking',()=>{
 const s=fixture(),fresh=fixture();
 for(const t of [16,63,66,67,68]){
   pose(s,110);pose(s,t);pose(fresh,t);
   const a=ThanksgivingActors(t),arm=t===16?s.robotArms[0]:s.robotArms[1];
   const target=new THREE.Vector3(...(t===16?[-5.47,.32,1.79+a.lanternNudge]:[-5.01+a.tray,.22,1.805]));
   const distance=arm.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target);
   assert.ok(distance<.025,'hand contact at '+t+' distance '+distance);
   const objects=x=>[x.robot,x.robotHead,x.robotEye,...x.robotArms.flatMap(a=>[a.shoulder,a.elbow]),x.holiday.tray,x.holiday.lantern,x.holiday.inspection,x.holiday.construction];
   objects(s).forEach((o,i)=>assert.deepEqual(o.matrixWorld.toArray(),objects(fresh)[i].matrixWorld.toArray()));
 }
});
test('inspection drone clears the cabin throughout the peek and invitation',()=>{
  // Cabin envelope includes roof trim. Inflate by the inspection body/wing extent.
  for(let t=32;t<59;t+=.05){const p=ThanksgivingActors(t).inspection;
    const overlapsXZ=p[0]+.49>-4.79&&p[0]-.49<-3.17&&p[2]+.22>-.29&&p[2]-.22<1.05;
    if(overlapsXZ)assert.ok(p[1]-.17>1.05,'roof clearance at '+t);
  }
});
test('rendered actor positions, joints and expressions are continuous at every beat boundary',()=>{
 const s=fixture();let t=0;
 const objects=[s.robot,s.robotHead,s.robotEye,...s.robotArms.flatMap(a=>[a.shoulder,a.elbow]),s.holiday.tray,s.holiday.lantern,s.holiday.inspection,s.holiday.construction];
 for(const beat of THANKSGIVING_BEATS){t+=beat.duration;pose(s,t-1e-6);const before=objects.map(o=>o.matrixWorld.toArray());pose(s,t+1e-6);
  objects.forEach((o,i)=>o.matrixWorld.toArray().forEach((x,j)=>assert.ok(Math.abs(x-before[i][j])<1e-4,beat.id+' '+i+' '+j)));
 }
});
test('evergreen wreath has three blue, one rose and a taller central white candle, with distinct Christmas lighting',()=>{
 const s=fixture();
 assert.equal(s.holiday.candles.length,5);
 assert.equal(s.holiday.candles[0].material.color.getHex(),0x305674);
 assert.equal(s.holiday.candles[2].material.color.getHex(),0xc5788c);
 assert.equal(s.holiday.candles[4].material.color.getHex(),0xf3ead6);
 assert.ok(s.holiday.candles[4].position.y>s.holiday.candles[0].position.y);
 for(let week=1;week<=4;week++){
  s.holiday.update({holiday:{adventWeek:week,transition:1},seasonal:{serviceDeck:{ready:true}}});
  assert.equal(s.holiday.lamps.filter(x=>x.material.emissiveIntensity>0).length,week);
  assert.equal(s.holiday.harvest.visible,false);assert.equal(s.holiday.inspection.visible,false);
  assert.equal(s.holiday.lamps[4].visible,false);
  assert.equal(s.holiday.lamps[2].visible,week>=3);
 }
 s.holiday.update({holiday:HolidayCalendar(Date.UTC(2026,11,25)),seasonal:{serviceDeck:{ready:true}}});
 assert.equal(s.holiday.lamps.filter(x=>x.visible).length,5);
 s.holiday.update({holiday:HolidayCalendar(Date.UTC(2026,11,24)),seasonal:{serviceDeck:{ready:true}}});
 assert.equal(s.holiday.lamps.filter(x=>x.visible).length,5);
 s.holiday.update({holiday:HolidayCalendar(Date.UTC(2026,11,23,23,59,59,999)),seasonal:{serviceDeck:{ready:true}}});
 assert.equal(s.holiday.lamps.filter(x=>x.visible).length,4);
 s.holiday.update({holiday:{christmasHandoff:true},seasonal:{serviceDeck:{ready:false}}});assert.equal(s.holiday.root.visible,false);
});
test('Pip waves one hand above the visor while facing each waiting guest before it departs',()=>{
 const s=fixture();
 for(const [t,guest,departure] of [[97.5,'construction',99],[102.5,'inspection',104]]){
  pose(s,t);const a=ThanksgivingActors(t);
  const expected=Math.atan2(a[guest][0]-a.pip[0],a[guest][2]-a.pip[2]);
  assert.ok(Math.abs(a.yaw-expected)<1e-6);
  assert.deepEqual(a[guest],ThanksgivingActors(departure)[guest]);
  const hand=s.robotArms[1].hand.getWorldPosition(new THREE.Vector3());
  const head=s.robotHead.getWorldPosition(new THREE.Vector3());
  assert.ok(hand.y>head.y+.08,'raised hand above head');
  assert.ok(s.robotArms[0].hand.getWorldPosition(new THREE.Vector3()).y<head.y-.25,'other hand stays down');
  assert.notDeepEqual(ThanksgivingActors(departure+.2)[guest],a[guest]);
 }
});
