import { ResolveHolidayEffects, DecorationEffect } from '../holiday-effects.js';
import { LocalDate } from '../local-calendar.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { LittleSpaceStationScene } from '../scene.js';
import { CreateWorldIdentity } from '../station-identity.js';
import { HolidayVisual } from '../holiday-renderer.js';
import { UpdatePip } from '../pip-animation.js';
import { HolidayCalendar, Advent, DAY } from '../holiday-calendar.js';
import { ResolvePipRecharge } from '../pip-rhythm.js';
import { CHRISTMAS_PRESENTS, CHRISTMAS_TREE_POSITION as TREE, TreeRadiusAt } from '../christmas-tree.js';
import { WREATH_CANDLES, WREATH_BEATS, WREATH_SECONDS, WreathCeremonySpec, WreathTimeline,
  WreathBeatStart, WreathActors, WreathLampState, ApplyWreathCeremony } from '../advent-wreath.js';

function fixture() {
  const s=Object.create(LittleSpaceStationScene.prototype);s.config={worldSeed:'wreath-contact'};
  s.identity=CreateWorldIdentity(s.config.worldSeed);s.station=new THREE.Group();s.scene=new THREE.Scene();s.scene.add(s.station);
  s.materials=s.CreateMaterials();s.elapsed=0;s.BuildRobot();s.holiday=new HolidayVisual(s);return s;
}
function pose(s,week,elapsed) {
  const spec=WreathCeremonySpec(week),time=spec.date+elapsed*1000;
  const state={worldTimeMs:time,holiday:ResolveHolidayEffects(HolidayCalendar(time),time,[{...spec,effect:DecorationEffect(spec)}],new Map(),{event:{...spec,effect:DecorationEffect(spec)},elapsed}),phase:'quiet',seasonal:{serviceDeck:{ready:true}}};
  ApplyWreathCeremony(state,{...spec,...WreathTimeline(elapsed)});
  UpdatePip(s,state);s.holiday.update(state);s.station.updateMatrixWorld(true);return state;
}
function snapshot(s){return [s.robot,s.robotHead,s.robotEye,s.robotTool,...s.robotArms.flatMap(a=>[a.shoulder,a.elbow]),
  ...s.holiday.lamps,...s.holiday.wreathSprigs].map(o=>[o.visible,o.matrixWorld.toArray()]);}

test('all four correct Advent candles ignite at actual contact, accumulating blue/blue/rose/blue',()=>{
  const s=fixture();
  assert.deepEqual(WREATH_CANDLES.map(c=>c.color),[0x305674,0x305674,0xc5788c,0x305674,0xf3ead6]);
  assert.deepEqual(s.holiday.candles.map(c=>c.material.color.getHex()),WREATH_CANDLES.map(c=>c.color));
  for(let week=0;week<4;week++) {
    const spec=WreathCeremonySpec(week);assert.equal(new Date(spec.date).getHours(),0);
    for(const seconds of [0,17.99,18,18.01,20,32]) {
      const state=pose(s,week,seconds),expected=week+(seconds>=18?1:0);
      assert.deepEqual(s.holiday.lamps.map(l=>l.visible),[...Array.from({length:4},(_,i)=>i<expected),false]);
      assert.equal(s.holiday.candles[week].userData.candleId,spec.candleId);
      assert.equal(state.holiday.adventWeek,week+1);
    }
  }
  // An activity cannot put out a flame or affect the central Christ candle.
  const time=LocalDate(2026,11,24),christmas=ResolveHolidayEffects(HolidayCalendar(time),time,Array.from({length:4},(_,i)=>{const s=WreathCeremonySpec(i);return {...s,effect:DecorationEffect(s)};}));
  for(let week=0;week<4;week++)for(const elapsed of [0,18,32]) {
    const ceremony={...WreathCeremonySpec(week),elapsed};
    for(let i=0;i<5;i++)assert.equal(WreathLampState(christmas,i,ceremony).lit,true);
    assert.deepEqual(WreathLampState(christmas,4,ceremony),WreathLampState(christmas,4,null));
  }
});
test('the unlit wreath is prepared before the first midnight; calendar preparation does not ignite candles',()=>{
  const s=fixture(),date=Advent(2026);
  assert.equal(HolidayCalendar(date-6*3600000-1).wreathPreparing,false);
  assert.equal(HolidayCalendar(date-3*3600000).transition,.5);
  assert.equal(HolidayCalendar(date).transition,1);
  for(const time of [date-6*3600000,date-1000,date,...[1,2,3].map(i=>date+i*7*DAY),LocalDate(2026,11,24),LocalDate(2027,0,6)]) {
    const state={holiday:HolidayCalendar(time),seasonal:{serviceDeck:{ready:true}}};s.holiday.update(state);
    assert.equal(s.holiday.lamps.filter(l=>l.visible).length,state.holiday.christCandleLit?1:0);
  }
  s.holiday.update({holiday:HolidayCalendar(date-2*DAY),seasonal:{serviceDeck:{ready:true}},thanksgiving:{elapsed:0}});
  assert.equal(s.holiday.harvest.visible,true);assert.equal(s.holiday.advent.visible,false);
});
test('the existing fixed-length wrist tool reaches every wick through the midnight boundary',()=>{
  const s=fixture();
  for(let week=0;week<4;week++)for(const t of [17,17.99,18,18.01,19]) {
    pose(s,week,t);
    const target=new THREE.Vector3(...WREATH_CANDLES[week].wick);
    const actual=s.robotToolGlow.getWorldPosition(new THREE.Vector3());
    assert.ok(actual.distanceTo(target)<.012,`${week} ${t}: ${actual.toArray()} target ${target.toArray()} error ${actual.distanceTo(target)}`);
    assert.deepEqual(s.robotArms[0].shoulder.scale.toArray(),[1,1,1]);
    assert.deepEqual(s.robotArms[0].elbow.scale.toArray(),[1,1,1]);
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(s.robot.quaternion);
    const direction=target.clone().sub(s.robot.position);direction.y=0;direction.normalize();
    assert.ok(forward.dot(direction)>.75,'faces the correct candle');
  }
  for(const t of [11,11.5,12]) {
    pose(s,1,t);
    const sprig=s.holiday.wreathSprigs[15].getWorldPosition(new THREE.Vector3());
    assert.ok(s.robotToolGlow.getWorldPosition(new THREE.Vector3()).distanceTo(sprig)<.015,'sprig contact');
  }
});
test('all actor channels and sprigs restore on reverse seeks and remain continuous across every beat',()=>{
  const s=fixture(),fresh=fixture();
  for(let week=0;week<4;week++) {
    for(const t of [...WREATH_BEATS.slice(1).map(beat=>WreathBeatStart(beat.id)),5,8,13,14,15,16,17,19,21,22.5,24,26,29,30]) {
      pose(s,week,t-1e-6);const a=snapshot(s);pose(s,week,t+1e-6);const b=snapshot(s);
      a.forEach((o,i)=>o[1].forEach((value,j)=>assert.ok(Math.abs(value-b[i][1][j])<1e-4,`${week} ${t} ${i}/${j}`)));
    }
    for(const t of [32,18,0,12,25,17.99,18.01,0]) {
      pose(s,week,t);pose(fresh,week,t);assert.deepEqual(snapshot(s),snapshot(fresh));
    }
    assert.deepEqual(WreathActors({...WreathCeremonySpec(week),elapsed:0}).pip,[-.2,1.16,.72]);
    assert.ok(new THREE.Vector3(...WreathActors({...WreathCeremonySpec(week),elapsed:32}).pip).distanceTo(new THREE.Vector3(-.2,1.16,.72))<1e-12);
  }
});
test('body, head, arms and tool clear the table, cabin, floor, rails and candle bodies',()=>{
  const s=fixture();
  for(let week=0;week<4;week++)for(let t=0;t<=WREATH_SECONDS;t+=.25) {
    pose(s,week,t);
    if(s.robotTool.visible) {
      const arm=s.robotArms[0],points=[arm.shoulder,arm.elbow,arm.hand,s.robotToolGlow].map(o=>o.getWorldPosition(new THREE.Vector3()));
      for(let i=1;i<points.length;i++) {
        const delta=points[i].clone().sub(points[i-1]);
        const ray=new THREE.Raycaster(points[i-1],delta.clone().normalize(),.001,delta.length()-.01);
        assert.equal(ray.intersectObjects(s.holiday.candles,false).length,0,`arm crosses candle: week ${week+1} t=${t} segment ${i}`);
      }
    }
    const meshes=[];s.robot.traverse(o=>{if(o.isMesh&&o!==s.robotToolGlow)meshes.push(o);});
    for(const mesh of meshes) {
      let visible=true;for(let p=mesh;p;p=p.parent)if(!p.visible)visible=false;
      if(!visible)continue;
      const vertices=mesh.geometry.attributes.position;
      for(let j=0;j<vertices.count;j++) {
        const p=new THREE.Vector3().fromBufferAttribute(vertices,j).applyMatrix4(mesh.matrixWorld);
        const info=`week ${week+1} t=${t} ${mesh.geometry.type} ${p.toArray()}`;
        assert.ok(!(p.x>-4.79&&p.x<-3.17&&p.z>-.29&&p.z<1.05&&p.y>-.43&&p.y<1.08),'cabin '+info);
        assert.ok(!(p.x>-5.89&&p.x<-4.81&&p.z>1.70&&p.z<2.34&&p.y>-.43&&p.y<.187),'table '+info);
        if(p.x>-7.4&&p.x<-3&&p.z>-.45&&p.z<2.65)assert.ok(p.y>-.441,'floor '+info);
        for(const z of [-.27,2.47])if(p.x>-7.19&&p.x<-3.01)assert.ok(Math.hypot(p.z-z,p.y-.13)>.027,'rail '+info);
        for(const candle of WREATH_CANDLES)assert.ok(!(Math.hypot(p.x-candle.wick[0],p.z-candle.wick[2])<candle.radius-.003&&p.y>.27&&p.y<.27+candle.height-.005),'candle '+candle.id+' '+info);
        const radius=TreeRadiusAt(p.y-TREE[1]);
        assert.ok(!radius||Math.hypot(p.x-TREE[0],p.z-TREE[2])>radius*.9,'tree '+info);
        for(const [i,gift] of CHRISTMAS_PRESENTS.entries())if(s.holiday.christmasTree.gifts[i].visible) {
          const q=s.holiday.christmasTree.gifts[i].position;
          assert.ok(!(Math.abs(p.x-q.x)<gift.size[0]/2&&Math.abs(p.z-q.z)<gift.size[2]/2&&p.y>q.y&&p.y<q.y+gift.size[1]),'gift '+info);
        }
      }
    }
  }
});
