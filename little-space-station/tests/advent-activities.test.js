import { LocalDate } from '../local-calendar.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { LittleSpaceStationScene } from '../scene.js';
import { CreateWorldIdentity } from '../station-identity.js';
import { UpdatePip } from '../pip-animation.js';
import { HolidayVisual } from '../holiday-renderer.js';
import { HolidayCalendar } from '../holiday-calendar.js';
import { CHRISTMAS_PRESENTS,CHRISTMAS_TREE_POSITION as TREE, TreeRadiusAt, TreeOrnamentPosition } from '../christmas-tree.js';
import { TrafficScheduler } from '../simulation-world.js';
import { AdventActors,AdventActivitySpec,AdventActivityCatalog,AdventActivityTimeline,AdventActivityDirector,AdventWindowSafe,ApplyAdventActivity,ADVENT_BEATS,ADVENT_ACTIVITY_SECONDS } from '../advent-activities.js';
function fixture(){const s=Object.create(LittleSpaceStationScene.prototype);s.config={worldSeed:'advent-contacts'};s.identity=CreateWorldIdentity(s.config.worldSeed);
 s.station=new THREE.Group();s.scene=new THREE.Scene();s.scene.add(s.station);s.materials=s.CreateMaterials();s.elapsed=0;s.BuildRobot();s.holiday=new HolidayVisual(s);return s;}
function pose(s,spec,seconds){const activity={...spec,...AdventActivityTimeline(seconds)},state={worldTimeMs:spec.date+12*3600000,
 holiday:HolidayCalendar(spec.date+12*3600000),seasonal:{serviceDeck:{ready:true}}};ApplyAdventActivity(state,activity);
 UpdatePip(s,state);s.holiday.update(state);s.station.updateMatrixWorld(true);return state;}
function snapshot(s){const a=[s.robot,s.robotHead,s.robotEye,...s.robotArms.flatMap(a=>[a.shoulder,a.elbow]),s.robotTool,s.holiday.decorating.lid,
 s.holiday.christmasTree.star,...s.holiday.christmasTree.gifts,...s.holiday.christmasTree.garlands];return a.map(o=>[o.visible,o.matrixWorld.toArray()]);}
const includingTending = () => AdventActivityCatalog().flatMap(spec => ['ornament','star','present'].includes(spec.kind) ? [spec,{...spec,tending:true}] : [spec]);
test('all activities preserve position, orientation and contact through every beat and route waypoint',()=>{
 const s=fixture();
 for(const spec of includingTending())for(const t of [4,9,14,18,24,28,30,31,33,38,48,50,52,56,58,60,64,68,73,77,82]) {
  pose(s,spec,t-1e-6);const a=snapshot(s);pose(s,spec,t+1e-6);const b=snapshot(s);
  a.forEach((o,i)=>o[1].forEach((v,j)=>assert.ok(Math.abs(v-b[i][1][j])<1e-4,spec.id+' '+t+' object '+i+' element '+j)));
 }
});
test('wrist clamp reaches the actual selected decoration without changing arm lengths',()=>{
 const s=fixture();
 for(const spec of includingTending().filter(s=>s.kind!=='inspection'))for(const t of [23.99,...Array.from({length:128},(_,i)=>24+i*.25),55.99]) {
  if(spec.tending&&t<40)continue;
  if(spec.tending&&spec.kind==='present')continue; // Admiration, not another pickup.
  if(spec.tending&&spec.kind==='star'&&t<48)continue;
  if(['preparation','garland'].includes(spec.kind)&&t<40)continue;
  pose(s,spec,t);const a=s.holiday.decorating.actors;
  const error=s.robotToolGlow.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...a.contact));
  assert.ok(error<.015,spec.id+' t='+t+' reach error='+error);
  assert.deepEqual(s.robotArms[0].shoulder.scale.toArray(),[1,1,1]);assert.deepEqual(s.robotArms[0].elbow.scale.toArray(),[1,1,1]);
 }
});
test('carried stars, ornaments and all five parcels use the same physical prop at release and reset on reverse seeks',()=>{
 const s=fixture(),fresh=fixture();
 for(const spec of AdventActivityCatalog())for(const t of [82,59,50,39,27,19,0]) {
  pose(s,spec,t);pose(fresh,spec,t);assert.deepEqual(snapshot(s),snapshot(fresh));
  const v=s.holiday.christmasTree;
  assert.deepEqual(Array.from(v.ornaments.instanceMatrix.array),Array.from(fresh.holiday.christmasTree.ornaments.instanceMatrix.array));
  if(spec.kind==='present')assert.equal(v.gifts[spec.index].userData.giftId,CHRISTMAS_PRESENTS[spec.index].id);
 }
 for(let i=0;i<5;i++){const spec=AdventActivitySpec('present',i);pose(s,spec,60);assert.deepEqual(s.holiday.christmasTree.gifts[i].position.toArray(),[...CHRISTMAS_PRESENTS[i].position]);}
 const spec=AdventActivitySpec('ornament');pose(s,spec,45);
 const v=s.holiday.christmasTree;v.update(HolidayCalendar(spec.date).tree,true,false);
 assert.equal(v.ornaments.count,12);assert.ok(v.gifts.every(g=>g.userData.wrapped));
 for(let i=0;i<26;i++){const m=new THREE.Matrix4();v.ornaments.getMatrixAt(i,m);m.elements.forEach((x,j)=>assert.ok(Math.abs(x-v.ornamentMatrices[i].elements[j])<1e-6));}
});
test('pickup reaches over the supply locker lip rather than through its walls',()=>{
 const s=fixture();
 for(const spec of AdventActivityCatalog().filter(a=>['ornament','star','present'].includes(a.kind)))for(const t of [24,24.5,25]) {
  pose(s,spec,t);const arm=s.robotArms[0];
  const points=[arm.shoulder,arm.elbow,arm.hand,s.robotToolGlow].map(o=>o.getWorldPosition(new THREE.Vector3()));
  for(let i=1;i<points.length;i++) {
   const delta=points[i].clone().sub(points[i-1]),length=delta.length(),ray=new THREE.Raycaster(points[i-1],delta.normalize(),.001,length-.001);
   const hits=ray.intersectObjects(s.holiday.decorating.root.children.filter(o=>o.isMesh),false);
   assert.equal(hits.length,0,spec.id+' '+t+' arm segment '+i+' crosses locker');
  }
 }
});
test('the carried mesh follows its contact anchor and calendar ownership switches without duplicates',()=>{
 const s=fixture(),v=s.holiday.christmasTree;
 for(const spec of AdventActivityCatalog().filter(a=>['ornament','star','present'].includes(a.kind))) {
  for(const t of [0,18,24,29,38,47.99,48,50,56,60,82]) {
   const time=spec.date+(t-48)*1000,state={worldTimeMs:time,holiday:HolidayCalendar(time),seasonal:{serviceDeck:{ready:true}}};
   ApplyAdventActivity(state,{...spec,...AdventActivityTimeline(t)});UpdatePip(s,state);s.holiday.update(state);s.station.updateMatrixWorld(true);
   const a=s.holiday.decorating.actors,point=new THREE.Vector3();
   if(spec.kind==='star')point.set(.016,.02,.019).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-.7)).applyMatrix4(v.star.matrixWorld);
   else if(spec.kind==='present')point.copy(v.gifts[spec.index].position).add(new THREE.Vector3(0,CHRISTMAS_PRESENTS[spec.index].size[1]+.055,0));
   else {const m=new THREE.Matrix4();v.ornamentCaps.getMatrixAt(spec.ornamentIndex,m);point.setFromMatrixPosition(m).applyMatrix4(v.ornamentCaps.matrixWorld);assert.equal(v.ornamentCaps.count,v.ornaments.count);}
   if(t<=56)assert.ok(point.distanceTo(new THREE.Vector3(...a.contact))<.002,spec.id+' '+t+' physical contact');
   assert.equal(v.gifts.length,5);assert.equal(v.ornaments.instanceMatrix.count,26);
   assert.ok(v.gifts.every(g=>g.userData.wrapped));
  }
  // A missed/interrupted action does not hold scenery back or save a story.
  for(const time of [spec.date-1000,spec.date,spec.date+86400000*3]) {
   const state={holiday:HolidayCalendar(time),seasonal:{serviceDeck:{ready:true}}};s.holiday.update(state);s.station.updateMatrixWorld(true);
   assert.deepEqual(v.star.position.toArray(),[0,1.43,0]);
   assert.equal(v.ornaments.count,state.holiday.tree.ornamentCount);
   assert.equal(v.gifts.filter(g=>g.visible).length,state.holiday.tree.presentCount);
   for(let i=0;i<26;i++){const m=new THREE.Matrix4();v.ornaments.getMatrixAt(i,m);assert.ok(new THREE.Vector3().setFromMatrixPosition(m).distanceTo(new THREE.Vector3(...TreeOrnamentPosition(i)))<1e-6);}
  }
 }
 for(const time of [LocalDate(2026,11,24),LocalDate(2026,11,25),LocalDate(2027,0,5)]) {
  s.holiday.update({holiday:HolidayCalendar(time),seasonal:{serviceDeck:{ready:true}}});
  assert.equal(v.ornaments.count,26);assert.equal(v.gifts.filter(g=>g.visible).length,5);assert.ok(v.gifts.every(g=>g.userData.wrapped));
 }
 for(const ready of [true,false]){s.holiday.update({holiday:HolidayCalendar(LocalDate(2027,0,6)),seasonal:{serviceDeck:{ready}}});assert.equal(v.root.visible,false);assert.equal(s.holiday.decorating.root.visible,false);}
});
test('Pip keeps his body clear of the cabin, wreath table, foliage and wrapped presents',()=>{
 const s=fixture();
 for(const spec of includingTending())for(let t=0;t<=ADVENT_ACTIVITY_SECONDS;t+=.5) {
  pose(s,spec,t);
  const meshes=s.robot.children.filter(o=>o.isMesh);s.robotHead.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const arm of s.robotArms)arm.shoulder.traverse(o=>{if(o.isMesh&&o!==s.robotToolGlow)meshes.push(o);});
  for(const o of meshes){let visible=true;for(let parent=o;parent;parent=parent.parent)if(!parent.visible)visible=false;if(!visible)continue;
   const a=o.geometry.attributes.position;for(let j=0;j<a.count;j++){
   const p=new THREE.Vector3().fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld);
   const message=spec.id+' t='+t+' '+o.geometry.type+' '+p.toArray();
   assert.ok(!(p.x>-4.79&&p.x<-3.17&&p.z>-.29&&p.z<1.05&&p.y>-.43&&p.y<1.08),'cabin '+message);
   assert.ok(!(p.x>-5.9&&p.x<-4.78&&p.z>1.69&&p.z<2.35&&p.y>-.43&&p.y<.17),'table '+message);
   const r=TreeRadiusAt(p.y-TREE[1]);
   assert.ok(!r||Math.hypot(p.x-TREE[0],p.z-TREE[2])>r*.9,'foliage '+message);
   for(const [i,g] of CHRISTMAS_PRESENTS.entries())if(s.holiday.christmasTree.gifts[i].visible) {
    const q=s.holiday.christmasTree.gifts[i].position;
    // Sub-pixel contact skin on the held parcel only, not neighboring gifts.
    const skin=spec.kind==='present'&&spec.index===i?.006:0;
    assert.ok(!(Math.abs(p.x-q.x)<g.size[0]/2-skin&&Math.abs(p.z-q.z)<g.size[2]/2-skin&&p.y>q.y+skin&&p.y<q.y+g.size[1]-skin),'gift '+g.id+' '+message);
   }
   // Rail center lines, including the top rail; Pip may hover above them.
   for(const x of [-7.19,-3.01])if(p.z>-.27&&p.z<2.47)assert.ok(Math.hypot(p.x-x,p.y-.13)>.027,'end rail '+message);
   for(const z of [-.27,2.47])if(p.x>-7.19&&p.x<-3.01)assert.ok(Math.hypot(p.z-z,p.y-.13)>.027,'side rail '+message);
   if(p.x<-3&&p.x>-7.4&&p.z>-.45&&p.z<2.65)assert.ok(p.y>-.441,'floor '+message);
  }}
 }
});
test('one absolute opportunity per action reconstructs after restart, expires when missed, and yields to stories and traffic',()=>{
 const config={worldSeed:'advent-windows',maintenance:{activeChance:0},pipRhythm:{enabled:false},traffic:{quietGapMinutes:[2000,2000],longGapChance:0}};
 const d=new AdventActivityDirector(config,new TrafficScheduler(config.worldSeed,config.traffic));
 assert.equal(d.at(LocalDate(2026,10,1)),null);assert.equal(d.windows,null,'no out-of-season schedule work');
 const windows=d.plan();assert.equal(new Set(windows.map(w=>w.id)).size,AdventActivityCatalog().length);
 for(const w of windows){assert.ok(AdventWindowSafe(config,d.scheduler,w.start,w.end));
  if(['ornament','star','present'].includes(w.kind))assert.equal(w.start+48000,w.date,'attach meets unchanged calendar date');
  assert.deepEqual(d.at(w.start+30000),new AdventActivityDirector(config,d.scheduler).at(w.start+30000));
  assert.equal(d.at(w.end),null);assert.equal(d.at(w.end+86400000*50),null);
  const safe=()=>({phase:'quiet',shipVisible:false,visitId:'',seasonal:{serviceDeck:{ready:true}},pipTaskId:'standby'});
  assert.ok(d.update(safe(),w.start+1000));
  assert.equal(d.update(safe(),w.start+2000,true),null);
  assert.equal(d.update(safe(),w.start+3000),null,'interrupted window does not restart');
 }
 const busy={At:()=>({current:{visitId:'ship'}})};assert.equal(AdventWindowSafe(config,busy,0,82000),false);
 assert.equal(d.at(LocalDate(2026,11,24)),null);assert.equal(d.at(LocalDate(2027,0,6)),null);
});
