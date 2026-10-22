import { HolidayCalendar, Advent } from './holiday-calendar.js';
import { THANKSGIVING_TYPE, ThanksgivingIncident, ThanksgivingResume, ThanksgivingCheckpoint,
  ThanksgivingSafe, ThanksgivingTimeline, THANKSGIVING_SECONDS } from './thanksgiving.js';

export class HolidayRuntime {
  constructor({preview,seed,store,runtime}) {
    Object.assign(this,{preview,seed,store,runtime});
    const saved=runtime.persistedNarrative?.record?.seasonalIncident;
    this.record=saved?.type===THANKSGIVING_TYPE?saved:null;
    this.playback=null;this.quiet=0;this.started=false;this.lastTime=null;
  }
  commit(record) {
    const result=this.store.commitSeasonalIncident(this.seed,record);
    this.record=result.ok?result.record.seasonalIncident:record;
    if(result.ok)this.runtime.persistedNarrative={record:result.record,status:result.status};
  }
  update(state,step,time,presentationSeconds,forced) {
    const r=this.runtime;
    state.holiday=HolidayCalendar(time);state.thanksgiving=null;
    if(this.preview) {
      if(state.phase!=='quiet'||r.incidentPreview||r.phantomPreview||r.remembrancePreview||r.restPreview||r.pipOverride||r.seasonalPreview!=='natural')
        r.thanksgivingPreview=null;
      const p=r.thanksgivingPreview;
      if(p){if(p.playing){p.elapsed=Math.min(THANKSGIVING_SECONDS,p.elapsed+step);if(p.elapsed>=THANKSGIVING_SECONDS)p.playing=false;}
        state.thanksgiving=ThanksgivingTimeline(p.elapsed);}
    } else {
      const otherIncomplete=r.incidentPlayback||r.phantomPlayback||r.remembrancePlayback||
        r.incidentRecord?.milestone<2||r.phantomRecord?.milestone<3||r.remembranceRecord?.milestone<2;
      // Expiry retires an interrupted story, not its memory. Never synthesize
      // completion merely because the calendar advanced while we were away.
      if(!this.playback && this.record?.milestone<3 && this.record.lifecycle!=='expired' && time>=Advent(2026))
        this.commit({...this.record,lifecycle:'expired'});
      const safe=!otherIncomplete&&!r.dreamPlayback&&!forced&&ThanksgivingSafe(state);
      const jumped=this.lastTime!==null&&Math.abs(time-this.lastTime-step*1000)>2000;
      this.lastTime=time;
      this.quiet=safe&&!jumped?this.quiet+step:0;
      if(!this.playback&&!this.started&&state.holiday.eligible&&this.quiet>=12&&presentationSeconds>=12) {
        const completed=r.persistedNarrative?.record?.completedStories?.some(x=>x.type===THANKSGIVING_TYPE&&x.storyYear===2026);
        if(!completed&&(!this.record||this.record.lifecycle==='presenting')) {
          this.record ||= ThanksgivingIncident(this.seed);
          this.playback=ThanksgivingResume(this.record,time);
          if(this.playback){this.started=true;this.commit(this.record);}
        }
      }
      if(this.playback) {
        this.playback.elapsed=Math.min(THANKSGIVING_SECONDS,this.playback.elapsed+step);
        state.thanksgiving=ThanksgivingTimeline(this.playback.elapsed);
        const next=ThanksgivingCheckpoint(this.record,this.playback.elapsed);
        if(next.milestone>this.record.milestone)this.commit(next);
        if(this.playback.elapsed>=THANKSGIVING_SECONDS)this.playback=null;
      }
    }
    return Boolean(state.thanksgiving);
  }
}

export function ApplyThanksgiving(state) {
  if(!state.thanksgiving)return;
  state.pipTaskId='thanksgiving';state.pipTaskStage='gathering';
  state.pipTaskProgress=state.thanksgiving.progress;state.robotActivity='thanksgiving';
  state.ambientJobLabel='Room for One More · '+state.thanksgiving.beatId;
  state.cargoState='none';state.dream=null;
}
