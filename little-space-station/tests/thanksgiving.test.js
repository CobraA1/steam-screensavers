import test from 'node:test';
import assert from 'node:assert/strict';
import { Thanksgiving, Advent, HolidayCalendar, DAY } from '../holiday-calendar.js';
import { ThanksgivingActors, ThanksgivingIncident, ThanksgivingCheckpoint, ThanksgivingResume, THANKSGIVING_BEATS, THANKSGIVING_SECONDS } from '../thanksgiving.js';
import { HolidayRuntime } from '../holiday-runtime.js';
import { CreateNarrativeStore } from '../persistence.js';
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('UTC holiday relationships hold across 100 years, including Christmas Eve fourth Sunday',()=>{
  let eve=false;
  for(let y=2026;y<=2125;y++){
    const t=new Date(Thanksgiving(y)),a=new Date(Advent(y));
    assert.equal(t.getUTCDay(),4);assert.ok(t.getUTCDate()>=22&&t.getUTCDate()<=28);
    assert.equal(a.getUTCDay(),0);assert.ok([3,10].includes((Advent(y)-Thanksgiving(y))/DAY));
    assert.ok(a.getUTCMonth()===10?a.getUTCDate()>=27:a.getUTCDate()<=3);
    eve ||= new Date(Advent(y)+21*DAY).getUTCDate()===24;
    for(let w=0;w<4;w++)assert.equal(HolidayCalendar(Advent(y)+w*7*DAY).adventWeek,w+1);
    assert.equal(HolidayCalendar(Date.UTC(y,11,25)).adventWeek,0);
  }
  assert.ok(eve);assert.equal(Thanksgiving(2026),Date.UTC(2026,10,26));assert.equal(Advent(2026),Date.UTC(2026,10,29));
  assert.equal((Advent(2028)-Thanksgiving(2028))/DAY,10);
});
test('calendar reconstructs preparation, grace, Advent and Christmas after reverse jumps',()=>{
  for(const time of [Date.UTC(2026,10,21),Date.UTC(2026,10,28),Advent(2026),Date.UTC(2026,11,25)]){
    const first=HolidayCalendar(time);HolidayCalendar(time+50*DAY);assert.deepEqual(HolidayCalendar(time),first);
  }
  assert.ok(HolidayCalendar(Date.UTC(2026,10,21)).preparing);
  assert.ok(HolidayCalendar(Date.UTC(2026,10,28)).eligible);
  assert.equal(HolidayCalendar(Advent(2026)).eligible,false);
});
test('all actor channels remain continuous at every beat boundary and deterministic in reverse',()=>{
  let t=0;for(const beat of THANKSGIVING_BEATS){t+=beat.duration;const a=ThanksgivingActors(t-1e-6),b=ThanksgivingActors(t+1e-6);
    for(const k of Object.keys(a)){const av=[a[k]].flat(),bv=[b[k]].flat();av.forEach((x,i)=>assert.ok(Math.abs(x-bv[i])<1e-4,k+' at '+t));}
  }
  const samples=Array.from({length:THANKSGIVING_SECONDS*2+1},(_,i)=>ThanksgivingActors(i*.5));
  for(let i=samples.length-1;i>=0;i--)assert.deepEqual(ThanksgivingActors(i*.5),samples[i]);
  assert.deepEqual(ThanksgivingActors(THANKSGIVING_SECONDS).pip,[-.2,1.16,.72]);
});
test('legacy migration preserves unfinished seasonal stories and completed memories',()=>{
  const s=storage();const seed='test';
  s.setItem('little-space-station:narrative-state:v4',JSON.stringify({version:4,worldSeed:seed,seasonalIncident:{type:'phantom-visitor-2026',instanceId:'old',storyYear:2026,milestone:1},completedStories:[]}));
  const store=CreateNarrativeStore({storage:s});assert.equal(store.load(seed).record.seasonalIncident.milestone,1);
  assert.equal(store.commitSeasonalIncident(seed,ThanksgivingIncident(seed)).status,'incomplete seasonal incident');
  store.commitSeasonalIncident(seed,{...store.load(seed).record.seasonalIncident,milestone:3});
  const record=ThanksgivingCheckpoint(ThanksgivingIncident(seed),THANKSGIVING_SECONDS);
  store.commitSeasonalIncident(seed,record);store.commitSeasonalIncident(seed,record);
  assert.equal(store.load(seed).record.completedStories.length,2);
  assert.equal(store.load(seed).record.completedStories.at(-1).eligibleForDream,false);
});
test('expired interrupted Thanksgiving never resumes or becomes a completed memory',()=>{
  const s=storage(),store=CreateNarrativeStore({storage:s}),record=ThanksgivingCheckpoint(ThanksgivingIncident('x'),74);
  store.commitSeasonalIncident('x',record);
  assert.equal(ThanksgivingResume(record,Advent(2026)),null);
  const runtime={persistedNarrative:store.load('x')};const h=new HolidayRuntime({preview:false,seed:'x',store,runtime});
  h.update({},0,Advent(2026),30,false);
  assert.equal(store.load('x').record.seasonalIncident.lifecycle,'expired');
  assert.equal(store.load('x').record.completedStories.length,0);
});
test('safe scheduling, storage failure, completion across midnight and preview read-only',()=>{
  const s=storage(),store=CreateNarrativeStore({storage:s});store.setSimulatedUnavailable(true);
  const runtime={},h=new HolidayRuntime({preview:false,seed:'x',store,runtime});
  const time=Advent(2026)-30000;
  const state={phase:'quiet',pipTaskId:'standby',worldTimeMs:time,nextArrivalMs:time+200000,seasonal:{serviceDeck:{ready:true}}};
  h.update({...state,shipVisible:true},20,time,20,false);assert.equal(h.playback,null);
  h.update(state,13,time+13000,33,false);assert.ok(h.playback);
  h.update(state,THANKSGIVING_SECONDS,time+(13+THANKSGIVING_SECONDS)*1000,153,false);assert.equal(h.record.milestone,3);
  const before=s.getItem(store.key),r={seasonalPreview:'natural',thanksgivingPreview:{elapsed:50,playing:true}},p=new HolidayRuntime({preview:true,seed:'x',store,runtime:r});
  p.update(state,THANKSGIVING_SECONDS,time,100,false);assert.equal(state.thanksgiving.elapsed,THANKSGIVING_SECONDS);assert.equal(s.getItem(store.key),before);
});
test('Christ candle lights on Christmas Eve and remains lit through the twelve days, across years',()=>{
 for(let year=2026;year<=2125;year++){
  assert.equal(HolidayCalendar(Date.UTC(year,11,23,23,59,59,999)).christCandleLit,false);
  assert.equal(HolidayCalendar(Date.UTC(year,11,24)).christCandleLit,true);
  assert.equal(HolidayCalendar(Date.UTC(year,11,24)).christmasHandoff,false);
  assert.equal(HolidayCalendar(Date.UTC(year,11,25)).christCandleLit,true);
  assert.equal(HolidayCalendar(Date.UTC(year+1,0,5,23,59,59,999)).christCandleLit,true);
  assert.equal(HolidayCalendar(Date.UTC(year+1,0,6)).christCandleLit,false);
  assert.equal(HolidayCalendar(Date.UTC(year+1,0,1)).transition,1);
 }
 assert.equal(HolidayCalendar(Date.UTC(2028,11,24,12)).adventWeek,4);
 assert.equal(HolidayCalendar(Date.UTC(2028,11,24,12)).christCandleLit,true);
});
test('unfinished stories, dreams, forced events and short quiet windows exclude Thanksgiving',()=>{
 const time=Thanksgiving(2026)+DAY;
 for(const extra of [{phantomRecord:{milestone:1}},{remembranceRecord:{milestone:1}},{incidentRecord:{milestone:1}},{dreamPlayback:{active:true}}]){
  const store=CreateNarrativeStore({storage:storage()}),h=new HolidayRuntime({preview:false,seed:'x',store,runtime:extra});
  const state={phase:'quiet',pipTaskId:'standby',worldTimeMs:time,nextArrivalMs:time+200000,seasonal:{serviceDeck:{ready:true}}};
  h.update(state,15,time,30,false);assert.equal(h.playback,null);
 }
 for(const forced of [true,false]){
  const h=new HolidayRuntime({preview:false,seed:'x',store:CreateNarrativeStore({storage:storage()}),runtime:{}});
  h.update({phase:'quiet',pipTaskId:'standby',worldTimeMs:time,nextArrivalMs:time+(forced?200000:100000),seasonal:{serviceDeck:{ready:true}}},15,time,30,forced);
  assert.equal(h.playback,null);
 }
});
test('resume waits for safety, preserves its checkpoint, and does not expire on an earlier date',()=>{
 const store=CreateNarrativeStore({storage:storage()}),record=ThanksgivingCheckpoint(ThanksgivingIncident('x'),74);
 store.commitSeasonalIncident('x',record);
 const r={persistedNarrative:store.load('x')},h=new HolidayRuntime({preview:false,seed:'x',store,runtime:r});
 h.update({},0,Thanksgiving(2026)-DAY,30,false);assert.equal(h.record.lifecycle,'presenting');
 const time=Thanksgiving(2026)+DAY;
 const state={phase:'quiet',pipTaskId:'standby',worldTimeMs:time,nextArrivalMs:time+200000,seasonal:{serviceDeck:{ready:true}}};
 h.update(state,0,time,40,false);assert.equal(h.playback,null);
 h.update(state,12,time+12000,52,false);assert.ok(h.playback.elapsed>=74);assert.equal(h.record.milestone,2);
});
