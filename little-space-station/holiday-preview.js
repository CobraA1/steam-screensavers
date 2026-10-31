import { Advent, Thanksgiving, DAY } from './holiday-calendar.js';
import { THANKSGIVING_BEATS, THANKSGIVING_SECONDS, ThanksgivingBeatStart, ThanksgivingTimeline } from './thanksgiving.js';

// Imported only by the explicitly gated preview UI. No production listeners.
export function HolidayPreview(panel,runtime,director) {
  const section=document.createElement('details');section.className='preview-tools__environment';
  const summary=document.createElement('summary');summary.textContent='Thanksgiving & Advent';section.append(summary);
  const make=(tag,label)=>{const el=document.createElement(tag);el.className='preview-tools__'+(tag==='button'?'button':'select');
    el.setAttribute('aria-label',label);section.append(el);return el;};
  function clear(){for(const key of ['pipOverride','restPreview','dreamPreview','incidentPreview','phantomPreview','remembrancePreview','deckPreview','thanksgivingPreview'])runtime[key]=null;
    runtime.treeFullIllumination=false;
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
    if(new Date(time).getUTCFullYear()>2026 && new Date(time).getUTCMonth()>=10)
      runtime.deckPreview={action:'install',progress:1,playing:false};}
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
  const treeHeading=document.createElement('p');treeHeading.textContent='Christmas tree & wrapped presents · 2026';section.append(treeHeading);
  for(const [label,month,day] of [
    ['Tree · stand & evergreen sections',10,29], ['Tree · first wrapped present',10,30],
    ['Tree · first light string',11,6], ['Tree · garland in progress',11,8],
    ['Tree · all light strings',11,10], ['Tree · first ornaments',11,13],
    ['Tree · ornaments in progress',11,15], ['Tree · final decorations',11,20],
    ['Tree · gold star installed',11,22], ['Tree · complete, five gifts',11,23],
    ['Tree · Christmas Eve ready',11,24],
  ]) button(label,()=>date(Date.UTC(2026,month,day,12)));
  button('Tree · completed, full warm lights',()=>{date(Date.UTC(2026,11,24,18));runtime.treeFullIllumination=true;});
  button('Tree · Advent supply delivery',()=>{date(Date.UTC(2026,11,8,12));runtime.seasonalPreview='advent-cargo';director.forceEvent('cargo-run');director.jumpToPhase('service');});
  button('Tree · January 5, still wrapped',()=>date(Date.UTC(2027,0,5,12)));
  button('Tree · January 6 cleanup',()=>date(Date.UTC(2027,0,6,12)));
  button('Tree · January 7 deck removed',()=>date(Date.UTC(2027,0,7,12)));
  button('Natural calendar',()=>{clear();runtime.clock.useActualTime();director.forceEvent('auto');runtime.paused=false;});
  section.append(document.createTextNode('Temporary previews; no narrative writes. Future-year buttons temporarily assemble the inaugural deck to inspect reusable date rules.'));
  panel.append(section);
  return ()=>{const p=runtime.thanksgivingPreview;if(p){const t=ThanksgivingTimeline(p.elapsed);scrub.value=p.elapsed;beat.value=t.beatId;readout.textContent=t.beatId+' · '+p.elapsed.toFixed(1)+' / '+THANKSGIVING_SECONDS+' s';}
    else readout.textContent=new Date(runtime.clock.worldTimeMs).toISOString().slice(0,10);};
}
