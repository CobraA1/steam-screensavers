import { HolidayCalendar } from './holiday-calendar.js';
export const THANKSGIVING_TYPE = 'room-for-one-more-2026';
export const THANKSGIVING_BEATS = Object.freeze([
  { id: 'preparations', duration: 18 }, { id: 'first-visitor', duration: 14 },
  { id: 'unexpected-arrival', duration: 12 }, { id: 'invitation', duration: 12 },
  { id: 'room-for-one-more', duration: 18 }, { id: 'together', duration: 20 },
  { id: 'farewell', duration: 18 },
]);
export const THANKSGIVING_SECONDS = 112;
export const Ease = x => { const t = Math.max(0, Math.min(1, x)); return t*t*(3-2*t); };
const mix = (a,b,t) => a+(b-a)*t;
const v = (a,b,t) => a.map((x,i)=>mix(x,b[i],t));
export function ThanksgivingBeatStart(id) {
  let t=0; for (const beat of THANKSGIVING_BEATS) { if (beat.id===id) return t; t+=beat.duration; } return 0;
}
export function ThanksgivingTimeline(seconds) {
  const elapsed = Math.max(0, Math.min(THANKSGIVING_SECONDS, Number(seconds)||0));
  let start=0;
  for (const beat of THANKSGIVING_BEATS) {
    if (elapsed < start+beat.duration || beat === THANKSGIVING_BEATS.at(-1))
      return { elapsed, beatId:beat.id, progress:(elapsed-start)/beat.duration };
    start+=beat.duration;
  }
}
export function ThanksgivingIncident(seed) {
  return { type:THANKSGIVING_TYPE, storyYear:2026, instanceId:'2026:room-for-one-more:'+seed,
    milestone:0, checkpoint:'preparations', lifecycle:'presenting', variant:0 };
}
export function ThanksgivingCheckpoint(record, seconds) {
  const milestone = Math.max(record.milestone, seconds>=112?3:seconds>=74?2:seconds>=44?1:0);
  return {...record,milestone,checkpoint:['preparations','invitation','together','gathering-complete'][milestone],
    lifecycle:milestone===3?'resolved':'presenting'};
}
export function ThanksgivingResume(record, time) {
  if (!record || record.type!==THANKSGIVING_TYPE || record.milestone>=3 || record.lifecycle==='expired' || !HolidayCalendar(time).eligible) return null;
  return {elapsed:[0,44,74][record.milestone],playing:true};
}
export function ThanksgivingSafe(state) {
  return state?.phase==='quiet' && !state.visitId && !state.shipVisible && !state.dream &&
    ['standby','look-around'].includes(state.pipTaskId) && state.seasonal?.serviceDeck?.ready &&
    (state.nextArrivalMs-state.worldTimeMs)/1000 > THANKSGIVING_SECONDS+15;
}
// Every actor channel is authored in absolute story seconds. No accumulated
// rotations, random frame noise, or previous-beat dependency during seeking.
function Track(t, keys) {
  for (let i=1;i<keys.length;i++) if(t<keys[i][0]) {
    const a=keys[i-1],b=keys[i]; return v(a.slice(1),b.slice(1),Ease((t-a[0])/(b[0]-a[0])));
  }
  return keys.at(-1).slice(1);
}
export function ThanksgivingActors(seconds, home=[-.2,1.16,.72]) {
  const t=ThanksgivingTimeline(seconds).elapsed;
  // Fly over the cabin/rails, then descend vertically into the open deck.
  const pip=Track(t,[[0,...home],[5,-2.9,1.65,1.85],[10,-5.35,1.4,1.48],
    [14,-5.35,-.136,1.48],[56,-5.35,-.136,1.48],[62,-5.12,-.136,1.48],
    [70,-5.12,-.136,1.48],[74,-5.35,-.136,1.48],[103,-5.35,-.136,1.48],
    [106,-5.35,1.4,1.48],[109,-2.9,1.65,1.85],[112,...home]]);
  const yaw=Track(t,[[0,-.16],[5,-1.6],[10,0],[18,0],[22,-1.1],[32,-1.1],
    [40,-1.1],[46,2.5],[49,2.5],[54,1.4],[58,.9],[61,0],[70,0],[78,1.57],
    [94,1.57],[100,1.1],[103,1.1],[108,-.16],[112,-.16]])[0];
  const construction=Track(t,[[0,-32,5,6],[18,-32,5,6],[26,-6.25,.55,2.1],
    [74,-6.25,.55,2.1],[94,-6.25,.55,2.1],[102,-32,5,6],[112,-32,5,6]]);
  const inspection=Track(t,[[0,-40,12,-25],[32,-40,12,-25],[38,-4,.72,-.6],
    [41,-4,1.3,-.6],[44,-4,.72,-.6],[49,-4,1.3,-.6],
    [53,-4.35,1.35,1.65],[58,-4.35,.55,2.4],[74,-4.35,.55,2.4],[98,-4.35,.55,2.4],
    [103,-4.1,1.7,2.9],[110,-20,7,14],[112,-20,7,14]]);
  const wave = (a,b) => Ease((t-a)/1.8)*(1-Ease((t-b+1.8)/1.8));
  const welcome=wave(22,30)+wave(46,55)+wave(95,103);
  const reach=wave(14,18)+wave(59,70);
  // A short false start, pause, then a deliberate extension of a third tray.
  const tray= t<63 ? .06*Ease((t-61)/2) : .06+.32*Ease((t-65)/4);
  return {pip,yaw,construction,inspection,welcome,reach,tray,
    lanternNudge:.07*Math.sin(Math.PI*Ease((t-14)/4)),
    lanternContact:wave(14,18),trayContact:wave(59,70),
    headYaw:-.08*(1-wave(0,112))+.14*Math.sin(t*.35)*wave(18,103),
    headPitch: .04*(1-wave(0,112))+.2*reach-.08*welcome,
    armWave: welcome*(1+.12*Math.sin(t*3)),
    constructionYaw:mix(2.1,Math.PI/2,Ease((t-74)/4)),
    inspectionYaw:mix(-2.3,-Math.PI*1.5,Ease((t-74)/4)),
    // Hover amplitude vanishes at the endpoints, avoiding boundary snaps.
    bob:.025*Math.sin(t*2)*wave(18,110),
  };
}
