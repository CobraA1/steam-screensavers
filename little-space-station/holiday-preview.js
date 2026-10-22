import { Advent, Thanksgiving, DAY } from './holiday-calendar.js';
import { THANKSGIVING_BEATS, THANKSGIVING_SECONDS, ThanksgivingBeatStart, ThanksgivingTimeline } from './thanksgiving.js';

// Imported only by the explicitly gated preview UI. No production listeners.
export function HolidayPreview(panel,runtime,director) {
  const section=document.createElement('details');section.className='preview-tools__environment';
  const summary=document.createElement('summary');summary.textContent='Thanksgiving & Advent';section.append(summary);
  const make=(tag,label)=>{const el=document.createElement(tag);el.className='preview-tools__'+(tag==='button'?'button':'select');
    el.setAttribute('aria-label',label);section.append(el);return el;};
  function clear(){for(const key of ['pipOverride','restPreview','dreamPreview','incidentPreview','phantomPreview','remembrancePreview','deckPreview','thanksgivingPreview'])runtime[key]=null;
    runtime.seasonalPreview='natural';}
  const beat=make('select','Thanksgiving beat');
  for(const b of THANKSGIVING_BEATS){const o=document.createElement('option');o.value=b.id;o.textContent=b.id;beat.append(o);}
  const scrub=make('input','Thanksgiving seconds');scrub.type='range';scrub.min=0;scrub.max=THANKSGIVING_SECONDS;scrub.step=.01;scrub.value=0;
  const readout=make('output','Thanksgiving state');
  function show(seconds,playing=false){clear();runtime.clock.setWorldTime(Date.UTC(2026,10,26,18));director.forceEvent('ambient');
    runtime.thanksgivingPreview={elapsed:seconds,playing};runtime.paused=!playing;}
  beat.addEventListener('change',()=>show(ThanksgivingBeatStart(beat.value)));
  scrub.addEventListener('input',()=>show(Number(scrub.value)));
  const button=(label,fn)=>{const b=make('button',label);b.type='button';b.textContent=label;b.addEventListener('click',fn);};
  button('Play gathering',()=>show(0,true));
  button('Play farewells',()=>show(ThanksgivingBeatStart('farewell'),true));
  function date(time){clear();runtime.clock.setWorldTime(time);director.forceEvent('ambient');runtime.paused=false;
    if(new Date(time).getUTCFullYear()>2026)runtime.deckPreview={action:'install',progress:1,playing:false};}
  button('Preparations',()=>date(Thanksgiving(2026)-3*DAY));
  button('Gathering decorations',()=>date(Thanksgiving(2026)+DAY));
  button('Advent transition',()=>date(Advent(2026)+3*3_600_000));
  for(let week=0;week<4;week++)button('Advent Sunday '+(week+1),()=>date(Advent(2026)+week*7*DAY+12*3_600_000));
  for(const year of [2026,2028]) {
    button(year+' Thanksgiving',()=>date(Thanksgiving(year)+12*3_600_000));
    button(year+' Advent',()=>date(Advent(year)+12*3_600_000));
  }
  button('Christmas Eve · Christ candle',()=>date(Date.UTC(2026,11,24,18)));
  button('Christmas Day · Christ candle',()=>date(Date.UTC(2026,11,25,12)));
  button('Twelfth day · five candles',()=>date(Date.UTC(2027,0,5,12)));
  button('Natural calendar',()=>{clear();runtime.clock.useActualTime();director.forceEvent('auto');runtime.paused=false;});
  section.append(document.createTextNode('Temporary previews; no narrative writes. Future-year buttons temporarily assemble the inaugural deck to inspect reusable date rules.'));
  panel.append(section);
  return ()=>{const p=runtime.thanksgivingPreview;if(p){const t=ThanksgivingTimeline(p.elapsed);scrub.value=p.elapsed;beat.value=t.beatId;readout.textContent=t.beatId+' · '+p.elapsed.toFixed(1)+' / '+THANKSGIVING_SECONDS+' s';}
    else readout.textContent=new Date(runtime.clock.worldTimeMs).toISOString().slice(0,10);};
}
