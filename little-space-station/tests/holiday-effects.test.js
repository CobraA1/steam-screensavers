import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalDate, AddLocalDays } from '../local-calendar.js';
import { HolidayCalendar } from '../holiday-calendar.js';
import { DecorationEffect, ResolveHolidayEffects } from '../holiday-effects.js';
import { EventScheduler } from '../event-scheduler.js';
import { CreateEventRecords, EVENT_RECORD_KEY } from '../event-records.js';
import { AdventActivityCatalog, AdventActivitySpec } from '../advent-activities.js';
import { WreathCeremonySpec } from '../advent-wreath.js';
import { ScheduledEvents } from '../scheduled-events.js';
import { TrafficScheduler } from '../simulation-world.js';

const catalog=()=>[...AdventActivityCatalog(),...Array.from({length:4},(_,i)=>WreathCeremonySpec(i))]
  .map(s=>({...s,due:s.date,priority:20,duration:s.week===undefined?82:32,expires:LocalDate(2027,0,6),effect:DecorationEffect(s)}));
const quiet={phase:'quiet',pipTaskId:'standby'};
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const scenery=(time,events=catalog(),records=new Map(),active=null)=>ResolveHolidayEffects(HolidayCalendar(time),time,events,records,active);

test('all four candles wait for contact, retain previous flames and expire at the next local Sunday / Christmas Eve',()=>{
  const events=catalog();
  for(const e of events.filter(e=>e.effect?.kind==='candle')) {
    const deadline=e.effect.deadline;
    assert.equal(deadline,e.week<3?AddLocalDays(e.date,7):LocalDate(2026,11,24));
    for(const t of [e.date,e.date+24*3600000,deadline-1])assert.equal(scenery(t).candles[e.week],false);
    for(const elapsed of [0,17.999,18,18.001,32]) {
      const h=scenery(e.date+3600000,events,new Map(),{event:e,elapsed});
      assert.equal(h.candles[e.week],elapsed>=18);
      assert.ok(h.candles.slice(0,e.week).every(Boolean));
    }
    assert.equal(scenery(deadline).candles[e.week],true);
    const scheduler=new EventScheduler();scheduler.refresh(events,deadline);
    const r=scheduler.records.get(e.id);assert.equal(r.effect.source,'fallback');
    assert.equal(r.status,'superseded');assert.ok(!scheduler.pending(deadline).some(x=>x.id===e.id));
    assert.notEqual(r.status,'completed');
  }
});

test('two authored ornaments, star and five gifts stay absent until the real handoff, not calendar count',()=>{
  const events=catalog();
  for(const e of events.filter(e=>e.effect && e.effect.kind!=='candle')) {
    const value=h=>e.kind==='star'?h.tree.star:e.kind==='ornament'?h.tree.ornaments[e.ornamentIndex]:h.tree.presents[e.index];
    assert.equal(value(scenery(e.date)),false,e.id);
    for(const elapsed of [0,24,47.999,48,55.999,56,60,82])
      assert.equal(value(scenery(e.date,events,new Map(),{event:e,elapsed})),elapsed>=48,e.id+' '+elapsed);
    assert.equal(value(scenery(e.effect.deadline-1)),false);
    assert.equal(value(scenery(e.effect.deadline)),true);
  }
  assert.equal(scenery(LocalDate(2026,11,15,12)).tree.ornaments.filter(Boolean).length,11);
  assert.equal(scenery(LocalDate(2026,11,17,12)).tree.ornaments.filter(Boolean).length,16);
  assert.equal(scenery(LocalDate(2026,11,23,12)).tree.complete,false);
  const complete=scenery(LocalDate(2026,11,24));
  assert.equal(complete.tree.complete,true);assert.equal(complete.tree.ornaments.filter(Boolean).length,26);
  assert.equal(complete.tree.presents.filter(Boolean).length,5);
  assert.equal(scenery(LocalDate(2027,0,6)).tree.active,false);
});

test('effect commits only after rendered contact; interruption before contact retries, after contact retires without reversal',()=>{
  for(const kind of ['star','present','ornament'])for(const elapsed of [47.999,48]) {
    const e=catalog().find(e=>e.kind===kind),storage=memory(),store=CreateEventRecords({storage,worldSeed:'effect'});
    const scheduler=new EventScheduler({save:rows=>store.save(rows),quietSeconds:0});
    scheduler.refresh([e],e.date);scheduler.update({time:e.date,step:0,state:quiet});
    scheduler.active.elapsed=elapsed;
    assert.equal(scheduler.records.get(e.id).effect,undefined);
    scheduler.commitEffect(e.date+1000);
    assert.equal(scheduler.records.get(e.id).effect?.source,elapsed>=48?'pip':undefined);
    const loaded=CreateEventRecords({storage,worldSeed:'effect'});
    const resumed=new EventScheduler({records:loaded.records});resumed.refresh([e],e.date+2000);
    assert.equal(resumed.records.get(e.id).status,elapsed>=48?'superseded':'interrupted');
    assert.equal(resumed.pending(e.date+2000).length,elapsed>=48?0:1);
    assert.notEqual(resumed.records.get(e.id).status,'completed');
  }
});

test('fallback does not steal an active prop, late starts reserve sufficient contact time, January retires all work',()=>{
  const e=catalog().find(e=>e.kind==='star'),s=new EventScheduler({quietSeconds:0});
  const near=e.effect.deadline-47000;s.refresh([e],near);assert.equal(s.update({time:near,step:0,state:quiet}),null);
  assert.match(s.waiting,/insufficient/);
  const start=e.effect.deadline-100000;s.refresh([e],start);s.update({time:start,step:0,state:quiet});
  s.active.elapsed=47;s.refresh([e],e.effect.deadline);
  assert.equal(s.records.get(e.id).effect,undefined,'active choreography owns the handoff');
  assert.equal(scenery(e.effect.deadline,[e],s.records,s.active).tree.star,false);
  s.active.elapsed=48;s.commitEffect(e.effect.deadline);assert.equal(s.records.get(e.id).effect.source,'pip');
  assert.equal(s.records.get(e.id).status,'presenting');assert.equal(s.finish(e.effect.deadline),false);
  const all=catalog(),late=new EventScheduler();late.refresh(all,LocalDate(2027,0,6));
  assert.equal(late.pending(LocalDate(2027,0,6)).length,0);
});

test('saved effects project deterministically across reverse preview seeks; read-only storage never writes',()=>{
  const events=catalog(),e=events.find(e=>e.kind==='star'),applied=e.date+3600000;
  const records=new Map([[e.id,{id:e.id,status:'interrupted',effect:{source:'pip',appliedAt:applied}}]]);
  const forward=scenery(applied,events,records);assert.equal(forward.tree.star,true);
  assert.equal(scenery(applied-1,events,records).tree.star,false);
  assert.equal(ResolveHolidayEffects(HolidayCalendar(applied-1),applied-1,events,records,null,{respectEffectTime:false}).tree.star,true,
    'production retains a committed result across small backwards clock corrections');
  scenery(LocalDate(2027,0,6),events,records);assert.deepEqual(scenery(applied,events,records),forward);
  const storage=memory();storage.setItem('unrelated','keep');
  const store=CreateEventRecords({storage,readOnly:true,worldSeed:'effect'});
  store.save([...records.values()]);assert.equal(storage.getItem(EVENT_RECORD_KEY),null);
  assert.equal(storage.getItem('unrelated'),'keep');
});

test('v1 records retain completed historical scenery without falsely crediting Pip; denied storage remains coherent',()=>{
  const spec=AdventActivitySpec('star'),storage=memory();
  storage.setItem(EVENT_RECORD_KEY,JSON.stringify({version:1,worldSeed:'legacy',events:[{id:spec.id,due:spec.date,status:'completed'}]}));
  const runtime={clock:{worldTimeMs:spec.date},persistedNarrative:{record:{}}},config={worldSeed:'legacy'};
  const events=new ScheduledEvents({config,runtime,storage,traffic:new TrafficScheduler('legacy'),preview:false});
  assert.equal(events.scheduler.records.get(spec.id).effect.source,'fallback');
  assert.equal(events.worldState(spec.date).tree.star,true);
  const fail={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  const store=CreateEventRecords({storage:fail,worldSeed:'x'}),s=new EventScheduler({save:r=>store.save(r)});
  s.refresh(catalog(),LocalDate(2026,11,24));assert.match(store.status(),/memory only/);
  assert.equal(scenery(LocalDate(2026,11,24),catalog(),s.records).tree.complete,true);
});

test('maintenance remains independent and prerequisites cannot strand the final inspection',()=>{
  const time=LocalDate(2026,11,23,12),config={worldSeed:'prereq',story:{enabled:false}},runtime={clock:{worldTimeMs:time}};
  const e=new ScheduledEvents({config,runtime,traffic:new TrafficScheduler(config.worldSeed),preview:true,records:[]});
  e.prepare(time);const inspection=e.events.find(x=>x.kind==='inspection');
  assert.equal(inspection.available(),false,'deck prerequisite');
  e.context.seasonal={serviceDeck:{ready:true}};assert.equal(inspection.available(),false,'unfinished star/gifts');
  e.prepare(LocalDate(2026,11,24),{seasonal:{serviceDeck:{ready:true}}});assert.equal(inspection.available(),true);
  assert.equal(e.events.find(x=>x.kind==='preparation').effect,null);
  assert.equal(e.events.find(x=>x.kind==='garland').effect,null);
});
