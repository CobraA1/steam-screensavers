import test from 'node:test';
import assert from 'node:assert/strict';
import { EventScheduler, TrafficAdmission } from '../event-scheduler.js';
import { CreateEventRecords, EVENT_RECORD_KEY } from '../event-records.js';
import { ScheduledEvents } from '../scheduled-events.js';
import { EventDirector } from '../simulation-world.js';
import { CreateNarrativeStore } from '../persistence.js';
import { LocalDate, AddLocalDays, LocalDayNumber, LocalInputValue } from '../local-calendar.js';
import { Advent, HolidayCalendar } from '../holiday-calendar.js';
import { ResolveAutumn2026, ApplyAutumn2026State } from '../autumn-2026.js';
import { WreathCeremonySpec, WreathLampState } from '../advent-wreath.js';
import { CreateSchedulerPreview } from '../scheduler-preview.js';
import { SimulationClock } from '../simulation-clock.js';

const memory = () => { const map = new Map(); return { map, getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; };
const quiet = () => ({ phase: 'quiet', visitId: '', shipVisible: false, pipTaskId: 'standby' });
const descriptor = (id, due = 0, priority = 20) => ({ id, due, priority, duration: 32, expires: Infinity });
function fixture({ storage = memory(), config = {}, records, preview = false, time = LocalDate(2026,11,13,12) } = {}) {
  config = { worldSeed: 'little-station-001', ...config };
  const store = CreateNarrativeStore({ storage }), runtime = { persistedNarrative: store.load(config.worldSeed), clock: { worldTimeMs: time } };
  const director = new EventDirector(config), events = new ScheduledEvents({ config, runtime, store, traffic: director.scheduler, storage, records, preview });
  return { config, storage, store, runtime, director, events, frame(time, step = 1) {
    runtime.clock.worldTimeMs = time;
    const admission = events.prepare(time), state = director.update(step,time,admission);
    for (const key of ['dream','storyIncident','phantomVisitor','remembrance','adventActivity','wreathCeremony','thanksgiving']) state[key] = null;
    ApplyAutumn2026State(state,ResolveAutumn2026(config.worldSeed,time),config.worldSeed);
    state.holiday = HolidayCalendar(time);
    const active = events.update(state,time,step);
    state.holiday=events.worldState(time,state.holiday);
    const result = { state: structuredClone(state), active: active && { id: active.event.id, elapsed: active.elapsed } };
    events.afterRender(time); return result;
  } };
}

test('pending events survive conflicts, sort by category then due date, and leave a natural break', () => {
  let saved;
  const s = new EventScheduler({ save: rows => saved = structuredClone(rows), quietSeconds: 2, spacingSeconds: 90 });
  s.refresh([descriptor('later',1000),descriptor('earlier'),descriptor('holiday',500,10)],2000);
  for (let t=2000;t<6000;t+=1000) assert.equal(s.update({time:t,step:1,state:{...quiet(),visitId:'docked'}}),null);
  assert.equal(s.pending(6000)[0].id,'holiday'); assert.ok(saved.every(r=>r.deferred || r.status==='pending'));
  s.update({time:6000,step:1,state:quiet()});s.update({time:7000,step:1,state:quiet()});
  assert.equal(s.active.event.id,'holiday');
  s.update({time:39000,step:32,state:quiet()});assert.ok(s.finish(39000));
  assert.equal(s.records.get('holiday').status,'completed');assert.equal(s.reserve(40000),false);
  for(let t=40000;t<129000;t+=1000)assert.equal(s.update({time:t,step:1,state:quiet()}),null);
  s.update({time:129000,step:1,state:quiet()});s.update({time:130000,step:1,state:quiet()});
  assert.equal(s.active.event.id,'earlier');
});
test('admitted traffic finishes every phase; future traffic waits with identity, duration and manifest date unchanged', () => {
  const visit = {visitId:'one',eventId:'cargo-run',approachStartMs:1000,approachEndMs:2000,dockEndMs:3000,serviceEndMs:5000,departureEndMs:6000,resolvedMs:7000};
  const next = {...visit,visitId:'two',approachStartMs:8000,approachEndMs:9000,dockEndMs:10000,serviceEndMs:12000,departureEndMs:13000,resolvedMs:14000};
  const raw = {At: time => ({current:time>=1000&&time<7000?visit:time>=8000&&time<14000?next:null,next:time<8000?next:null})};
  const a = new TrafficAdmission(raw);
  assert.equal(a.At(2000,true).current,visit,'launch during docking accepts the existing ship');
  for(let t=3000;t<=6000;t+=1000)assert.equal(a.At(t,true).current.visitId,'one');
  assert.equal(a.At(7000,true).current,null);assert.equal(a.At(8000,true).current,null);
  for(let t=9000;t<=15000;t+=1000)a.At(t,true);
  const admitted=a.At(16000,false).current;
  assert.equal(admitted.visitId,'two');assert.equal(admitted.approachStartMs,16000);assert.equal(admitted.originalApproachStartMs,8000);
  assert.equal(admitted.serviceEndMs-admitted.dockEndMs,next.serviceEndMs-next.dockEndMs);
  assert.deepEqual(next,{...visit,visitId:'two',approachStartMs:8000,approachEndMs:9000,dockEndMs:10000,serviceEndMs:12000,departureEndMs:13000,resolvedMs:14000});
});
test('default seed can present all four Advent observances despite traffic and decorating', () => {
  const f=fixture();
  for(let week=0;week<4;week++) {
    let time=WreathCeremonySpec(week).date+12*3600000;
    const id=WreathCeremonySpec(week).id;
    for(let seconds=0;seconds<7200&&f.events.scheduler.records.get(id)?.status!=='completed';seconds++,time+=1000)f.frame(time);
    assert.equal(f.events.scheduler.records.get(id)?.status,'completed',id+' '+JSON.stringify(f.events.diagnostics(time)));
  }
});
test('a missed event is offered next session, interrupted presentation resumes, and completion prevents replay', () => {
  const storage=memory(),time=LocalDate(2026,11,14,12),id=WreathCeremonySpec(2).id;
  const config={maintenance:{activeChance:0},traffic:{quietGapMinutes:[2000,2000],longGapChance:0}};
  let f=fixture({storage,time,config});f.events.events=f.events.events.filter(e=>e.id===id);
  for(let i=0;i<20;i++)f.frame(time+i*1000);
  assert.equal(f.events.scheduler.active?.event.id,id);
  assert.equal(JSON.parse(storage.getItem(EVENT_RECORD_KEY)).events.find(r=>r.id===id).status,'presenting');
  f=fixture({storage,time:time+30000,config});f.events.events=f.events.events.filter(e=>e.id===id);
  assert.equal(f.events.scheduler.records.get(id).status,'interrupted');
  for(let i=30;i<100;i++)f.frame(time+i*1000);
  assert.equal(f.events.scheduler.records.get(id).status,'completed');
  f=fixture({storage,time:time+120000,config});f.events.events=f.events.events.filter(e=>e.id===id);
  for(let i=120;i<180;i++)assert.equal(f.frame(time+i*1000).active,null);
});
test('v2–v5 narrative migration retains memories, unfinished checkpoints and explicit expiry without reinterpreting history', () => {
  for(const version of [2,3,4,5]) {
    const storage=memory(),seed='little-station-001';
    const original={version,worldSeed:seed,incident:{type:'stubborn-antenna',storyYear:2026,instanceId:'old-antenna',milestone:2,variant:2},
      seasonalIncident:{type:'phantom-visitor-2026',storyYear:2026,instanceId:'old-phantom',milestone:1,variant:1},completedStories:[]};
    storage.setItem(`little-space-station:narrative-state:v${version}`,JSON.stringify(original));
    const f=fixture({storage});
    assert.equal(f.events.scheduler.records.get('old-antenna').status,'completed');
    assert.equal(f.events.scheduler.records.get('old-phantom').incident.milestone,1);
    assert.equal(f.store.load(seed).record.completedStories[0].variant,2);
    const gathering=f.events.events.find(e=>e.type==='room-for-one-more-2026');
    f.events.scheduler.set({id:gathering.id,due:gathering.due,status:'presenting'});
    f.events.checkpoint(gathering,{type:gathering.type,storyYear:2026,instanceId:gathering.id,milestone:3,variant:0});
    assert.equal(f.store.load(seed).record.seasonalIncident.instanceId,'old-phantom');
    assert.equal(f.store.load(seed).record.seasonalIncident.milestone,1);
    assert.equal(f.store.load(seed).record.completedStories.length,2);
  }
});
test('storage failures keep simulation running; read-only previews and reverse clock seeks cannot fabricate history', () => {
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');},removeItem(){throw new Error('denied');}};
  const f=fixture({storage:denied});assert.doesNotThrow(()=>f.frame(LocalDate(2026,11,13,12)));
  const storage=memory(),preview=fixture({storage,preview:true});
  const before=[...storage.map];preview.events.events=preview.events.events.filter(e=>e.id.includes('advent-wreath'));
  for(let i=0;i<100;i++)preview.frame(LocalDate(2026,11,23,12)+i*1000);
  assert.deepEqual([...storage.map],before);
  const s=new EventScheduler({readOnly:true,quietSeconds:1});s.refresh([descriptor('test')],100000);
  s.update({time:100000,step:1,state:quiet()});s.update({time:1e10,step:0,state:quiet()});
  assert.equal(s.active.elapsed,0);assert.equal(s.finish(1e10),false);
  s.update({time:5000,step:0,state:quiet()});assert.equal(s.records.get('test').status,'presenting');
});
test('January retirement is explicit, preserves pending checkpoint identity and never manufactures completion', () => {
  const f=fixture(),time=LocalDate(2027,0,6,12);f.frame(time);
  for(const spec of f.events.events.filter(e=>e.id.includes(':advent'))) {
    const r=f.events.scheduler.records.get(spec.id);assert.equal(r.status,spec.effect?'superseded':'expired');
    assert.ok(r.reason.includes(spec.effect?'fallback':'January'));
  }
  assert.equal(HolidayCalendar(time).tree.active,false);
  assert.equal(ResolveAutumn2026(f.config.worldSeed,LocalDate(2027,0,7)).serviceDeck.active,false);
  assert.equal(f.store.load(f.config.worldSeed).record,null);
});
test('local midnight, year rollover, input labels and DST day arithmetic follow the current device zone', () => {
  const eve=LocalDate(2026,11,24);
  assert.equal(new Date(eve).getHours(),0);assert.equal(HolidayCalendar(eve-1).christCandleLit,false);assert.equal(HolidayCalendar(eve).christCandleLit,true);
  assert.equal(HolidayCalendar(LocalDate(2026,9,31)).year,2026);
  assert.equal(ResolveAutumn2026('s',LocalDate(2026,9,31)).phase,'halloween');
  assert.equal(ResolveAutumn2026('s',LocalDate(2026,10,1)).phase,'all-saints');
  assert.equal(LocalInputValue(eve),'2026-12-24T00:00');
  for(const [month,day] of [[2,8],[10,1],[8,27],[3,5]]) {
    const start=LocalDate(2026,month,day),end=AddLocalDays(start,1);
    assert.equal(LocalDayNumber(end)-LocalDayNumber(start),1);assert.equal(new Date(end).getHours(),0);
    const offset=new Date(end).getTimezoneOffset()-new Date(start).getTimezoneOffset();
    assert.equal((end-start)/60000,1440+offset);
    const clock = new SimulationClock({worldTimeMs:start,preview:true});clock.jumpWorld('day');assert.equal(clock.worldTimeMs,end);
  }
  assert.equal(HolidayCalendar(Advent(2026)-1).adventWeek,0);assert.equal(HolidayCalendar(Advent(2026)).adventWeek,1);
});
test('scheduler scenario restart keeps isolated records and cannot mutate real completion history', () => {
  const p=CreateSchedulerPreview({worldSeed:'little-station-001'},'backlog');
  p.events.scheduler.refresh(p.events.events,p.time);
  const rows=[...p.events.scheduler.records.values()];
  const restarted=CreateSchedulerPreview({worldSeed:'little-station-001'},'backlog',{time:p.time,records:rows});
  assert.deepEqual([...restarted.events.scheduler.records.values()],rows);
  assert.equal(restarted.events.scheduler.readOnly,true);
});
test('clearing scheduler records requires explicit authority and never clears unrelated or different-seed data', () => {
  const storage=memory(),records=CreateEventRecords({storage,worldSeed:'a'});
  storage.setItem('unrelated','keep');records.save([{id:'one',due:1,status:'pending'}]);
  assert.equal(records.clear().ok,false);assert.ok(storage.getItem(EVENT_RECORD_KEY));
  assert.equal(CreateEventRecords({storage,worldSeed:'b'}).clear({explicit:true}).ok,false);
  assert.equal(records.clear({explicit:true}).ok,true);assert.equal(storage.getItem('unrelated'),'keep');
});
test('retiring old scenery never creates the cooldown of an actually presented event', () => {
  const s=new EventScheduler({quietSeconds:1});
  s.refresh([{...descriptor('old'),expires:1000,expiryReason:'fixture removed'},descriptor('due')],5000);
  assert.equal(s.records.get('old').status,'expired');
  s.update({time:5000,step:1,state:quiet()});assert.equal(s.rest,0);assert.equal(s.active.event.id,'due');
});
test('migration reconciles crash-window ledger entries with real payoffs and explicit legacy expiry', () => {
  const storage=memory(),seed='little-station-001',store=CreateNarrativeStore({storage});
  const id='2026:room-for-one-more:'+seed;
  store.commitSeasonalIncident(seed,{type:'room-for-one-more-2026',instanceId:id,storyYear:2026,milestone:2,lifecycle:'expired'});
  let f=fixture({storage,records:[{id,due:LocalDate(2026,10,26),status:'pending'}]});
  assert.equal(f.events.scheduler.records.get(id).status,'expired');
  store.commitSeasonalIncident(seed,{type:'room-for-one-more-2026',instanceId:id,storyYear:2026,milestone:3});
  f=fixture({storage,records:[{id,due:LocalDate(2026,10,26),status:'presenting'}]});
  assert.equal(f.events.scheduler.records.get(id).status,'completed');
  assert.equal(f.store.load(seed).record.completedStories.length,1);
});
test('narrative checkpoint writes follow rendering and do not truncate exits', () => {
  const date=WreathCeremonySpec(0).date,config={maintenance:{activeChance:0},traffic:{quietGapMinutes:[2000,2000],longGapChance:0}};
  const story=fixture({config,time:date});story.events.events=story.events.events.filter(e=>e.type==='stubborn-antenna');
  for(let i=0;i<15;i++)story.frame(date+i*1000);
  const active=story.events.scheduler.active;active.elapsed=53;
  const state=story.director.state;state.seasonal=ResolveAutumn2026(story.config.worldSeed,date+15000);
  story.events.update(state,date+15000,0);
  assert.equal(story.store.load(story.config.worldSeed).record.completedStories.length,0,'payoff is not saved before rendering');
  story.events.afterRender(date+15000);
  assert.equal(story.store.load(story.config.worldSeed).record.completedStories.length,1);
  assert.ok(story.events.scheduler.active,'saving the payoff must not end the visible exit');
});
