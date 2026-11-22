import { EventScheduler, EVENT_PRIORITY, TrafficAdmission } from './event-scheduler.js';
import { CreateEventRecords } from './event-records.js';
import { LocalDate, LocalZone } from './local-calendar.js';
import { DeriveSeed } from './random.js';
import { HolidayCalendar, Thanksgiving, Advent } from './holiday-calendar.js';
import { AUTUMN_2026_DATES as DATES, ResolveAutumn2026 } from './autumn-2026.js';
import { AdventActivityCatalog, AdventActivityTimeline, ApplyAdventActivity, ADVENT_ACTIVITY_SECONDS } from './advent-activities.js';
import { WreathCeremonySpec, WreathTimeline, ApplyWreathCeremony, WREATH_SECONDS } from './advent-wreath.js';
import { CreateStubbornAntennaIncident, CreateStubbornAntennaResume, CreateStubbornAntennaPreview, AdvanceStubbornAntennaIncident,
  ApplyStubbornAntennaPreview, STUBBORN_ANTENNA_TOTAL_SECONDS } from './stubborn-antenna.js';
import { CreatePhantomVisitorIncident, CreatePhantomVisitorResume, CreatePhantomVisitorPreview, AdvancePhantomVisitorIncident,
  ApplyPhantomVisitor, PHANTOM_VISITOR_TYPE, PHANTOM_VISITOR_TOTAL_SECONDS } from './phantom-visitor.js';
import { CreateRemembranceIncident, CreateRemembranceResume, CreateRemembrancePreview, AdvanceRemembranceIncident,
  ApplyRemembrance, REMEMBRANCE_TYPE, REMEMBRANCE_TOTAL_SECONDS } from './lights-of-remembrance.js';
import { ThanksgivingIncident, ThanksgivingCheckpoint, ThanksgivingTimeline, THANKSGIVING_TYPE, THANKSGIVING_SECONDS } from './thanksgiving.js';
import { ApplyThanksgiving } from './holiday-runtime.js';
import { DeckDurationMs } from './service-deck-lifecycle.js';

// Adapters declare calendar/physical requirements, never arbitrate each other.
export class ScheduledEvents {
  constructor({ config, runtime, traffic, store, preview = false, storage, records } = {}) {
    Object.assign(this, { config, runtime, store, preview });
    this.zone = LocalZone(); this.context = {}; this.traffic = new TrafficAdmission(traffic);
    this.storage = CreateEventRecords({ worldSeed: config.worldSeed, readOnly: preview, ...(storage ? { storage } : {}) });
    this.scheduler = new EventScheduler({ records: records || this.storage.records, readOnly: preview,
      quietSeconds: Math.max(4, Number(config.story?.minimumSessionSeconds) || 12), save: events => this.storage.save(events) });
    this.events = this.catalog(); this.migrate();
  }
  migrate() {
    const narrative = this.runtime.persistedNarrative?.record;
    for (const event of this.events) {
      const incident = [narrative?.incident, narrative?.seasonalIncident].find(r => r?.instanceId === event.id);
      const memory = narrative?.completedStories?.find(r => r.instanceId === event.id || event.type && r.type === event.type && r.storyYear === event.year);
      const existing = this.scheduler.records.get(event.id);
      if (existing) {
        // A crash between a witnessed narrative payoff and its final exit must
        // not cause that completed historical story to run from the beginning.
        if (memory && existing.status !== 'completed') this.scheduler.set({ ...existing, status: 'completed', reason: 'saved narrative payoff retained after restart' });
        else if (incident?.lifecycle === 'expired' && !['completed','expired','superseded'].includes(existing.status))
          this.scheduler.set({ ...existing, incident, status: 'expired', reason: 'legacy explicit expiry retained' });
        continue;
      }
      if (memory || incident) this.scheduler.set({ id: event.id, due: event.due, incident,
        status: memory ? 'completed' : incident.lifecycle === 'expired' ? 'expired' : 'interrupted',
        reason: incident?.lifecycle === 'expired' ? 'legacy explicit expiry retained' : 'imported narrative checkpoint' });
    }
    this.scheduler.flush();
  }
  catalog() {
    const seed = this.config.worldSeed, year = new Date(this.runtime.clock?.worldTimeMs ?? Date.now()).getFullYear();
    const saved = this.runtime.persistedNarrative?.record;
    const checkpoint = type => saved?.seasonalIncident?.type === type ? saved.seasonalIncident : null;
    const sceneReady = () => Boolean(this.context.seasonal?.serviceDeck?.ready);
    const event = (spec, priority, duration, expires, expiryReason) => ({ ...spec, priority, duration, expires, expiryReason,
      resources: ['pip', 'station-work-area'], persistent: true });
    const story = (record, type, due, duration, expires, reason, create, resume, advance, apply, key) => {
      const d = event({ id: record.instanceId, label: type, type, year: record.storyYear, due },
        type === 'stubborn-antenna' ? EVENT_PRIORITY.story : EVENT_PRIORITY.holiday, duration, expires, reason);
      d.available = () => type === 'stubborn-antenna' || sceneReady();
      d.unavailableReason = 'Commons Deck not ready';
      d.resume = entry => {
        const r = entry?.incident || record;
        // A paid-off legacy story is imported completed, not replayed.
        return resume(r)?.elapsed || 0;
      };
      d.onStart = () => {
        const previous = this.scheduler.records.get(d.id);
        const r = previous.incident || record;
        this.runtime[key] = r; this.checkpoint(d, r);
      };
      d.apply = active => {
        const current = this.scheduler.records.get(d.id).incident || record;
        const p = create({ elapsed: active.elapsed, playing: true, variant: current.variant });
        apply(this.context.state, p);
        const next = advance(current, p.beatId, p.progress);
        if (next.milestone > current.milestone) { this.runtime[key] = next; this.afterFrame = { event: d, incident: next }; }
      };
      return d;
    };
    const antenna = saved?.incident || CreateStubbornAntennaIncident({ storyYear: year, instanceId: `${year}:stubborn-antenna:scheduled`, variant: DeriveSeed(seed, `antenna:${year}`) % 3 });
    const phantom = checkpoint(PHANTOM_VISITOR_TYPE) || CreatePhantomVisitorIncident({
      instanceId: '2026:phantom-visitor:' + DeriveSeed(seed, 'phantom-instance-v1:2026').toString(36), variant: DeriveSeed(seed, 'phantom-variant-v1:2026') % 3 });
    const remembrance = checkpoint(REMEMBRANCE_TYPE) || CreateRemembranceIncident({
      instanceId: '2026:lights-of-remembrance:' + DeriveSeed(seed, 'remembrance-instance-v1:2026').toString(36), variant: DeriveSeed(seed, 'remembrance-variant-v1:2026') % 3 });
    const gathering = checkpoint(THANKSGIVING_TYPE) || ThanksgivingIncident(seed);
    const all = [
      story(phantom, PHANTOM_VISITOR_TYPE, DATES.halloweenFinalPreparations, PHANTOM_VISITOR_TOTAL_SECONDS, DATES.cleanupComplete,
        'Halloween scenery packed away on November 4', CreatePhantomVisitorPreview, CreatePhantomVisitorResume, AdvancePhantomVisitorIncident, ApplyPhantomVisitor, 'phantomRecord'),
      story(remembrance, REMEMBRANCE_TYPE, DATES.allSaints, REMEMBRANCE_TOTAL_SECONDS, DATES.cleanupComplete,
        'Remembrance fixture packed away on November 4', CreateRemembrancePreview, CreateRemembranceResume, AdvanceRemembranceIncident, ApplyRemembrance, 'remembranceRecord'),
    ];
    // Keep All Saints' Day reflective; a deferred playful incident waits a day.
    const phantomReady = all[0].available;
    all[0].available = () => phantomReady() && !(this.context.time >= DATES.allSaints && this.context.time < DATES.cleanupBegins);
    all[0].unavailableReason = "All Saints' Day quiet observance or deck unavailable";
    if (this.config.story?.enabled !== false || saved?.incident) all.push(story(antenna, 'stubborn-antenna', LocalDate(antenna.storyYear, 0, 1),
      STUBBORN_ANTENNA_TOTAL_SECONDS, Infinity, '', CreateStubbornAntennaPreview, CreateStubbornAntennaResume, AdvanceStubbornAntennaIncident, ApplyStubbornAntennaPreview, 'incidentRecord'));
    const thanksgiving = event({ id: gathering.instanceId, type: THANKSGIVING_TYPE, year: 2026, label: 'Room for One More', due: Thanksgiving(2026) },
      EVENT_PRIORITY.holiday, THANKSGIVING_SECONDS, Advent(2026) - 6 * 3600000, 'Harvest table repurposed for Advent wreath');
    thanksgiving.available = sceneReady;
    thanksgiving.resume = r => [0, 44, 74][(r?.incident || gathering).milestone] || 0;
    thanksgiving.onStart = () => this.checkpoint(thanksgiving, this.scheduler.records.get(thanksgiving.id).incident || gathering);
    thanksgiving.apply = active => {
      const state = this.context.state, current = this.scheduler.records.get(thanksgiving.id).incident || gathering;
      state.thanksgiving = ThanksgivingTimeline(active.elapsed); ApplyThanksgiving(state);
      const next = ThanksgivingCheckpoint(current, active.elapsed);
      if (next.milestone > current.milestone) this.afterFrame = { event: thanksgiving, incident: next };
    };
    all.push(thanksgiving);
    const removal = Math.min(LocalDate(2027, 0, 6), LocalDate(2027, 0, 7) - DeckDurationMs(this.config.serviceDeck));
    for (const spec of AdventActivityCatalog()) {
      const installation = ['ornament', 'star', 'present'].includes(spec.kind);
      // Seeded preferred daytime without rejecting a date because traffic exists.
      const preferred = installation ? spec.date - 60000 : spec.date + (6 * 60 + DeriveSeed(seed, spec.id) % 40 * 15) * 60000;
      const d = event({ ...spec, due: preferred, label: spec.label }, EVENT_PRIORITY.ceremony, ADVENT_ACTIVITY_SECONDS, removal,
        'Christmas decorations packed away for January dismantling');
      d.available = () => sceneReady() && (!installation || this.context.time <= spec.date - 48000 + 250 || this.context.time >= spec.date);
      d.unavailableReason = 'Waiting for installed calendar prop after missing the synchronized approach';
      d.tending = time => installation && time >= spec.date;
      d.apply = active => ApplyAdventActivity(this.context.state, { ...spec, tending: active.tending, ...AdventActivityTimeline(active.elapsed) });
      all.push(d);
    }
    for (let week = 0; week < 4; week++) {
      const spec = WreathCeremonySpec(week);
      const d = event({ ...spec, due: spec.start - 12000 }, EVENT_PRIORITY.ceremony, WREATH_SECONDS, removal,
        'Advent wreath removed for January dismantling');
      d.available = () => sceneReady() && (this.context.time <= spec.start + 250 || this.context.time >= spec.date);
      d.unavailableReason = 'Waiting for local midnight after missing the synchronized approach';
      d.apply = active => ApplyWreathCeremony(this.context.state, { ...spec, observance: active.startedAt >= spec.date,
        ...WreathTimeline(active.elapsed) });
      all.push(d);
    }
    return all;
  }
  checkpoint(event, incident) {
    const entry = this.scheduler.records.get(event.id);
    this.scheduler.set({ ...entry, incident }); this.scheduler.flush();
    if (this.preview) return;
    const result = event.type === 'stubborn-antenna' ? this.store.commitIncident(this.config.worldSeed, incident) : this.store.commitScheduledSeasonal(this.config.worldSeed, incident);
    if (result.ok) this.runtime.persistedNarrative = { record: result.record, status: result.status };
  }
  prepare(time, { forced = false, seasonal } = {}) {
    if (!this.zoneCheckedAt || Math.abs(time - this.zoneCheckedAt) >= 60000) {
      const zone = LocalZone();
      if (zone !== this.zone && !this.scheduler.active) {
        this.zone = zone; this.events = this.catalog(); this.scheduler.quiet = 0;
      }
      this.zoneCheckedAt = time;
    }
    this.context = { time, seasonal: seasonal || ResolveAutumn2026(this.config.worldSeed, time) };
    this.scheduler.refresh(this.events, time);
    const reserve = !forced && this.scheduler.reserve(time);
    return { schedule: this.traffic.At(time, reserve), reserve };
  }
  update(state, time, step, { forced = false, recharge = false } = {}) {
    Object.assign(this.context, { state, time, seasonal: state.seasonal });
    const active = this.scheduler.update({ state, time, step, forced, recharge });
    active?.event.apply(active);
    return active;
  }
  afterRender(time) {
    if (this.afterFrame) { this.checkpoint(this.afterFrame.event, this.afterFrame.incident); this.afterFrame = null; }
    this.scheduler.finish(time);
  }
  diagnostics(time) { return { ...this.scheduler.diagnostics(time), zone: this.zone, storage: this.storage.status(), traffic: this.traffic.decisions.slice(-8) }; }
}
