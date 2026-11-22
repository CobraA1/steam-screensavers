import { DeriveSeed } from './random.js';
import { LocalDate } from './local-calendar.js';
import { MaintenanceState } from './simulation-world.js';
import { ResolvePipRecharge } from './pip-rhythm.js';
import { CHRISTMAS_TREE_POSITION as TREE, CHRISTMAS_PRESENTS, TreeOrnamentPosition, TreeGarlandPoint } from './christmas-tree.js';

const SECOND=1000;
export const ADVENT_BEATS=Object.freeze([
  ['notice',4],['approach',14],['collect',6],['carry',14],['attach',10],['straighten',8],['release',4],['inspect',8],['return',14],
].map(([id,duration])=>Object.freeze({id,duration})));
export const ADVENT_ACTIVITY_SECONDS=ADVENT_BEATS.reduce((n,b)=>n+b.duration,0);
export const ADVENT_KINDS=Object.freeze([
  ['preparation','Seat and check tree section'],['garland','Straighten a light strand'],['ornament','Hang and adjust an ornament'],
  ['star','Install the gold star'],['present','Place a wrapped present'],['inspection','Inspect the finished tree'],
].map(([id,label])=>Object.freeze({id,label})));
export const ADVENT_SUPPLY=Object.freeze([-5.08,-.43,.23]);
export const Smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const mix=(a,b,p)=>a+(b-a)*Smooth(p);
const vec=(a,b,p)=>a.map((x,i)=>mix(x,b[i],p));
const add=(a,b)=>a.map((x,i)=>x+b[i]);
export function AdventBeatStart(id){let t=0;for(const b of ADVENT_BEATS){if(b.id===id)return t;t+=b.duration;}return 0;}
export function AdventActivityTimeline(seconds) {
  const elapsed=Math.max(0,Math.min(ADVENT_ACTIVITY_SECONDS,Number(seconds)||0));let start=0;
  for(const b of ADVENT_BEATS){if(elapsed<start+b.duration||b===ADVENT_BEATS.at(-1))
    return {elapsed,beat:b.id,progress:(elapsed-start)/b.duration};start+=b.duration;}
}
export function AdventActivitySpec(kind, index=0) {
  const dates={preparation:[10,29],garland:[11,6+2*Math.min(2,index)],ornament:[11,index?17:15],star:[11,22],present:[[10,30],[11,7],[11,13],[11,20],[11,23]][index]||[10,30],inspection:[11,23]};
  const [month,day]=dates[kind]||dates.preparation;
  return {kind,index,id:'2026:advent:'+kind+':'+index,date:LocalDate(2026,month,day),
    label:ADVENT_KINDS.find(k=>k.id===kind)?.label||kind,
    ornamentIndex:kind==='ornament'?(index?16:8):null};
}
export function AdventActivityCatalog() {
  return [AdventActivitySpec('preparation'),...Array.from({length:3},(_,i)=>AdventActivitySpec('garland',i)),
    AdventActivitySpec('ornament'),AdventActivitySpec('ornament',1),AdventActivitySpec('star'),
    ...CHRISTMAS_PRESENTS.map((_,i)=>AdventActivitySpec('present',i)),AdventActivitySpec('inspection')];
}
export function AdventWindowSafe(config,scheduler,start,end) {
  const schedule=scheduler.At(start-10000);
  if(schedule.current||(schedule.next&&schedule.next.approachStartMs<end+10000))return false;
  for(let t=start-1000;t<=end+1000;t+=SECOND) {
    if(!['standby','look-around'].includes(MaintenanceState(config.worldSeed,t,config.maintenance).pipTaskId)||ResolvePipRecharge(config.worldSeed,t,config.pipRhythm).active)return false;
  }
  return true;
}
// One absolute window per action, not a session timer or a replay queue.
// Installations meet the pre-existing midnight scenery transition at attach.
// An unavailable window is simply missed; the calendar still installs the prop.
export class AdventActivityDirector {
  constructor(config,scheduler){this.config=config;this.scheduler=scheduler;this.catalog=AdventActivityCatalog();this.windows=null;this.blocked=null;}
  plan() {
    if(this.windows)return this.windows;
    this.windows=[];
    for(const spec of this.catalog) {
      const install=['ornament','star','present'].includes(spec.kind);
      const slots=install?[spec.date-48000]:Array.from({length:40},(_,i)=>spec.date+(6*60+((DeriveSeed(this.config.worldSeed,spec.id)%40+i)%40)*15)*60000);
      for(const start of slots){const end=start+ADVENT_ACTIVITY_SECONDS*SECOND;
        if(AdventWindowSafe(this.config,this.scheduler,start,end)){this.windows.push({...spec,start,end});break;}}
    }
    return this.windows;
  }
  at(time){if(time<LocalDate(2026,10,29)||time>=LocalDate(2026,11,24))return null;
    const w=this.plan().find(w=>time>=w.start&&time<w.end);return w?{...w,...AdventActivityTimeline((time-w.start)/SECOND)}:null;}
  update(state,time,blocked=false) {
    const activity=this.at(time);
    if(!activity)return null;
    const safe=!blocked&&state.phase==='quiet'&&!state.shipVisible&&!state.visitId&&state.seasonal?.serviceDeck?.ready&&['standby','look-around'].includes(state.pipTaskId);
    if(!safe)this.blocked=activity.id;
    return safe&&this.blocked!==activity.id?activity:null;
  }
}
export function ApplyAdventActivity(state,activity) {
  state.adventActivity=activity;
  if(!activity)return;
  state.pipTaskId='advent-decorating';state.pipTaskStage=activity.beat;state.pipTaskProgress=activity.progress;
  state.pipTaskOverallProgress=activity.elapsed/ADVENT_ACTIVITY_SECONDS;state.pipTaskLabel=activity.label;
  state.robotActivity=state.ambientJob='advent-decorating';state.ambientJobLabel=activity.label;
  state.cargoState='none';state.dream=null;
}
function track(t,keys){for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return vec(keys[i-1].slice(1),keys[i].slice(1),(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return keys.at(-1).slice(1);}
function world(local){return add(TREE,local);}

// One authored prop path drives BOTH the actual mesh and the wrist contact.
// The tool acts as Pip's existing magnetic maintenance clamp. No limb scaling.
export function AdventActors(activity,home=[-.2,1.16,.72]) {
  const {kind,index=0,elapsed:t}=activity;
  if(activity.tending&&kind==='present') {
    // A parcel already on the deck is admired, not collected a second time.
    const inspection=AdventActors({...activity,kind:'inspection',tending:false},home);
    inspection.prop=[...(CHRISTMAS_PRESENTS[index]||CHRISTMAS_PRESENTS[0]).position];
    return inspection;
  }
  const moving=!activity.tending&&['ornament','star','present'].includes(kind);
  const gift=CHRISTMAS_PRESENTS[index]||CHRISTMAS_PRESENTS[0];
  const final=kind==='present'?[...gift.position]:kind==='star'?world([0,1.43,0]):kind==='ornament'?world(TreeOrnamentPosition(activity.ornamentIndex??8))
    :kind==='garland'?world(TreeGarlandPoint(index)) :world([.22,.38,.32]);
  const source=[ADVENT_SUPPLY[0],kind==='present'?.12:.43,ADVENT_SUPPLY[2]];
  const pointOffset=kind==='present'?[0,gift.size[1]+.055,0]:kind==='star'?[.016,.02,.019]:kind==='ornament'?[0,.05,0]:[0,0,0];
  let prop=moving?track(t,[[0,...source],[24,...source],[28,source[0],1.35,source[2]],[33,-5.65,1.35,kind==='present'&&index===3?1.75:1.25],
    [38,final[0]+(kind==='present'?(index===4?.12:-.12):.14),final[1]+.3,final[2]+(kind==='present'?0:.16)],[48,...final],[82,...final]]):[...final];
  const crooked=Smooth((t-48)/2)*(1-Smooth((t-52)/4));
  const roll=(kind==='ornament'?.22:kind==='star'?.12:0)*crooked;
  const contact=add(prop,[pointOffset[0]*Math.cos(roll)-pointOffset[1]*Math.sin(roll),pointOffset[0]*Math.sin(roll)+pointOffset[1]*Math.cos(roll),pointOffset[2]]);
  // For an installed topper, extend the clamp above the foliage first, then
  // lower it to inspect the fitting. The star itself stays on its mount.
  if(activity.tending&&kind==='star')contact[1]+=.3*(1-Smooth((t-38)/10));
  if(kind==='garland') {
    const p=TreeGarlandPoint(index),angle=.1*crooked;
    // Slide the crooked loop around the bough, never through its foliage.
    contact.splice(0,3,...world([p[0]*Math.cos(angle)+p[2]*Math.sin(angle),p[1],-p[0]*Math.sin(angle)+p[2]*Math.cos(angle)]));
  }
  // Face inward at the tree. Gifts use clear, preselected aisles instead.
  const dx=final[0]-TREE[0],dz=final[2]-TREE[2];
  const workYaw=kind==='present'?([Math.PI*1.5,Math.PI,0,0,Math.PI/2][index]||0):Math.atan2(-dx,-dz);
  const sourceYaw=Math.PI;
  const yaw=mix(sourceYaw,workYaw,(t-28)/10);
  function body(point,heading,atSource=false) {
    const f=[Math.sin(heading),0,Math.cos(heading)],r=[Math.cos(heading),0,-Math.sin(heading)];
    const offset=kind==='present'?(index===2?.39:index===0?.48-.06*(activity.tending?1:Smooth((t-33)/5)):.48):.52,outward=kind==='present'?.15:.4;
    const p=[point[0]+r[0]*offset-f[0]*outward,Math.max(-.136,point[1]-.0956-(kind==='star'?.25*Smooth((t-24)/14):0)),point[2]+r[2]*offset-f[2]*outward];
    if(atSource)p[1]=Math.max(kind==='present'?gift.size[1]+.25:.36,p[1]);
    if(kind==='star'&&!atSource)p[1]=Math.max(.55,p[1]);
    return p;
  }
  const sourceBody=activity.tending?body(contact,workYaw):body(add(source,pointOffset),sourceYaw,true);
  let pip=t<=24?sourceBody:body(contact,yaw,t<30);
  if(!moving&&t>24)pip=track(t,[[24,...sourceBody],[31,-5.8,1.3,1.35],[38,...body(contact,workYaw)],[82,...body(contact,workYaw)]]);
  if(activity.tending&&t>=18&&t<60)pip=body(contact,workYaw);
  const workBody=moving||activity.tending?body(add(final,pointOffset),workYaw):body(final,workYaw);
  if(kind==='present') {
    // Rise clear of the parcel before stowing the long wrist clamp.
    workBody[1]+=.2;
    if(t<60)pip[1]+=.2*Smooth((t-56)/2);
    if(index===4){workBody[0]+=.18;if(t<60)pip[0]+=.18*Smooth((t-56)/2);}
  }
  const view=[-5.5,.65,1.35];
  if(t<18)pip=track(t,[[0,...home],[4,...home],[9,-3,1.75,1.7],[14,sourceBody[0],1.5,sourceBody[2]],[18,...sourceBody]]);
  else if(t>=60)pip=track(t,[[60,...workBody],[64,workBody[0],1.4,workBody[2]],[68,...view],[73,-5.3,1.6,1.65],[77,-2.9,1.75,1.85],[82,...home]]);
  const returnYaw=kind==='present'&&index===0?Math.PI*2-.16:-.16;
  let bodyYaw=t<18?mix(-.16,activity.tending?workYaw:sourceYaw,t/18):t>=68?mix(workYaw,returnYaw,(t-68)/14):activity.tending?workYaw:yaw;
  if(t>=60&&t<68)bodyYaw=workYaw;
  if(kind==='inspection') {
    // Admiration needs no supplies: approach a clear viewing spot directly.
    pip=track(t,[[0,...home],[4,...home],[9,-3,1.75,1.7],[14,view[0],1.5,view[2]],[18,...view],
      [68,...view],[73,-5.3,1.6,1.65],[77,-2.9,1.75,1.85],[82,...home]]);
    const viewingYaw=Math.atan2(TREE[0]-view[0],TREE[2]-view[2]);
    bodyYaw=t<18?mix(-.16,viewingYaw,(t-4)/14):t>=68?mix(viewingYaw,-.16,(t-68)/14):viewingYaw;
  }
  // Release in two steps: draw the clamp away from the fixture first, then
  // lower the arm. Blending straight to rest can sweep the tool through boughs.
  if(t>=56&&kind!=='inspection') {
    const withdraw=Smooth((t-56)/2);
    contact[0]+=(Math.cos(workYaw)*.12-Math.sin(workYaw)*.2)*withdraw;
    contact[1]+=.14*withdraw;
    contact[2]+=(-Math.sin(workYaw)*.12-Math.cos(workYaw)*.2)*withdraw;
  }
  const release=1-Smooth((t-58)/2);
  const reach=!moving?Smooth((t-36)/4)*release
    :t<18?0:t<24?Smooth((t-18)/6):release;
  return {pip,yaw:bodyYaw,prop,contact,reach,roll,crooked,
    lid:kind==='inspection'||activity.tending?0:Smooth((t-17)/2)*(1-Smooth((t-38)/4)),
    headPitch:t>=60&&t<68?.1+.08*Math.sin((t-60)/8*Math.PI):.04,
    satisfaction:Smooth((t-63)/2)*(1-Smooth((t-67)/2)),tool:kind!=='inspection'&&t>=18&&t<60};
}
