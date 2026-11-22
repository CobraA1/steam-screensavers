// Small shared arbiter. Adapters own choreography, scenery and narrative saves.
export const EVENT_PRIORITY = Object.freeze({ holiday: 10, ceremony: 20, story: 30, routine: 40, background: 50 });
const terminal = record => ['completed', 'expired', 'superseded'].includes(record?.status);
export class EventScheduler {
  constructor({ records = [], save = () => {}, readOnly = false, quietSeconds = 12, spacingSeconds = 90 } = {}) {
    this.records = new Map(records.map(r => [r.id, { ...r, status: r.status === 'presenting' ? 'interrupted' : r.status }]));
    Object.assign(this, { save, readOnly, quietSeconds, spacingSeconds });
    this.events = []; this.active = null; this.quiet = 0; this.rest = 0; this.session = 0; this.lastTime = null;
    this.waiting = 'initial quiet period'; this.dirty = false;
  }
  set(record) { this.records.set(record.id, record); this.dirty = true; }
  flush() {
    if (!this.dirty) return;
    if (!this.readOnly) { try { this.save([...this.records.values()]); } catch { /* In-memory operation remains available. */ } }
    this.dirty = false;
  }
  refresh(events, time) {
    this.events = events;
    for (const event of events) {
      let record = this.records.get(event.id);
      if (!record && time >= event.due) {
        record = { id: event.id, status: 'pending', due: event.due, deferred: false };
        this.set(record);
      }
      if (record && event.effect && !record.effect && time >= event.effect.deadline && this.active?.event.id !== event.id) {
        // Offscreen work is NOT a successfully presented animation.
        record = { ...record, effect: { source: 'fallback', appliedAt: event.effect.deadline },
          status: record.status === 'completed' ? 'completed' : 'superseded', reason: 'physical effect applied offscreen at fallback deadline', endedAt: record.endedAt ?? event.effect.deadline };
        this.set(record);
      }
      if (record?.effect && !terminal(record) && this.active?.event.id !== event.id) {
        record = { ...record, status: 'superseded', reason: 'effect retained; interrupted post-effect exit retired', endedAt: time };
        this.set(record);
      }
      // Expiry is explicit, resource-based and reported; it never creates a memory.
      if (record && !terminal(record) && this.active?.event.id !== event.id && time >= event.expires) {
        this.set({ ...record, status: 'expired', reason: event.expiryReason, endedAt: time });
      }
    }
    this.flush();
  }
  pending(time) {
    return this.events.filter(e => time >= e.due && !terminal(this.records.get(e.id)) && this.active?.event.id !== e.id)
      .sort((a, b) => a.priority - b.priority || a.due - b.due ||
        Number(this.records.get(b.id)?.deferred) - Number(this.records.get(a.id)?.deferred) || a.id.localeCompare(b.id));
  }
  reserve(time) { return Boolean(this.active || (this.rest <= 0 && this.pending(time).some(e => !e.available || e.available()))); }
  update({ time, step = 0, state, forced = false, recharge = false } = {}) {
    if (this.lastTime === null) {
      const ended = [...this.records.values()].filter(r => r.status === 'completed' && r.endedAt <= time).map(r => r.endedAt);
      if (ended.length) this.rest = Math.max(0, this.spacingSeconds - (time - Math.max(...ended)) / 1000);
    }
    this.session += step;
    this.rest = Math.max(0, this.rest - step);
    const jumped = this.lastTime !== null && Math.abs(time - this.lastTime - step * 1000) > 2000;
    this.lastTime = time;
    if (this.active) {
      // Absolute-clock jumps cannot manufacture animation time or completion.
      this.active.elapsed = Math.min(this.active.event.duration, this.active.elapsed + step);
      return this.active;
    }
    const pending = this.pending(time), event = pending.find(e => !e.available || e.available());
    this.waiting = forced ? 'forced preview or scenario' : this.rest > 0 ? 'quiet break / routine opportunity' :
      state?.visitId || state?.shipVisible ? 'admitted spacecraft must finish' : recharge ? 'recharge must finish' :
      !['standby', 'look-around'].includes(state?.pipTaskId) ? 'admitted maintenance must finish' :
      !event ? pending.length ? 'required scenery or earlier incident unavailable' : 'no due event' :
      event.expires - time < event.duration * 1000 ? 'insufficient time before scenery removal' :
      event.effect && event.effect.deadline - time <= event.effect.at * 1000 ? 'insufficient time to reach effect before fallback' : '';
    this.quiet = !this.waiting && !jumped ? this.quiet + step : 0;
    if (!this.waiting && this.quiet >= this.quietSeconds && this.session >= this.quietSeconds) {
      const record = this.records.get(event.id);
      const elapsed = event.resume?.(record) || 0;
      this.active = { event, elapsed, startedAt: time };
      this.set({ ...record, status: 'presenting', startedAt: time, attempts: (record.attempts || 0) + 1 });
      event.onStart?.(this.active);
      this.quiet = 0; this.flush();
      return this.active;
    }
    if (event && this.waiting && !this.records.get(event.id)?.deferred) {
      this.set({ ...this.records.get(event.id), deferred: true }); this.flush();
    }
    return null;
  }
  finish(time) {
    if (!this.active || this.active.elapsed < this.active.event.duration) return false;
    const { event } = this.active;
    if (event.effect && !this.records.get(event.id)?.effect) return false;
    this.set({ ...this.records.get(event.id), status: 'completed', endedAt: time });
    this.active = null; this.rest = this.spacingSeconds; this.quiet = 0; this.flush();
    return true;
  }
  commitEffect(time) {
    const a = this.active;
    if (!a?.event.effect || a.elapsed < a.event.effect.at || this.records.get(a.event.id)?.effect) return;
    this.set({ ...this.records.get(a.event.id), effect: { source: 'pip', appliedAt: time } });
    this.flush();
  }
  interrupt(reason = 'presentation interrupted') {
    if (!this.active) return;
    const id = this.active.event.id;
    this.set({ ...this.records.get(id), status: 'interrupted', reason });
    this.active = null; this.quiet = 0; this.flush();
  }
  diagnostics(time) {
    return { active: this.active ? { id: this.active.event.id, priority: this.active.event.priority, elapsed: this.active.elapsed } : null,
      waiting: this.waiting, nextOpportunity: this.active ? time + (this.active.event.duration - this.active.elapsed + this.spacingSeconds) * 1000 :
        time + (this.rest + Math.max(0, this.quietSeconds - this.quiet)) * 1000,
      pending: this.pending(time).map(e => ({ id: e.id, priority: e.priority, due: e.due, deferred: this.records.get(e.id)?.deferred,
        waiting: e.available && !e.available() ? e.unavailableReason || 'prerequisite unavailable' : this.waiting })),
      records: [...this.records.values()].map(r => ({ ...r,
        effectState: r.effect ? 'applied-by-' + r.effect.source : 'unapplied',
        fallback: this.events.find(e => e.id === r.id)?.effect?.deadline })) };
  }
}

// Admission changes presentation times, NEVER the seeded visit or its cargo.
// Only an unadmitted future visit may wait; a visible visit keeps every phase.
export class TrafficAdmission {
  constructor(generator) { this.generator = generator; this.current = null; this.queue = []; this.lastTime = null; this.decisions = []; }
  At(time, reserve = false) {
    const raw = this.generator.At(time);
    const first = this.lastTime === null;
    if (this.lastTime !== null && (time < this.lastTime || time - this.lastTime > 2000)) {
      // Seeking is a fresh deterministic traffic inspection, not fake deliveries.
      this.current = null; this.queue = [];
    }
    this.lastTime = time;
    if (this.current && time >= this.current.resolvedMs) this.current = null;
    const candidate = raw.current;
    if (candidate && this.current?.visitId !== candidate.visitId && !this.queue.some(v => v.visitId === candidate.visitId) &&
        !this.decisions.some(d => d.id === candidate.visitId && d.action === 'admitted')) {
      if (!first && reserve || this.current) {
        this.queue.push(candidate); this.note(candidate.visitId, 'deferred', time);
      } else { this.current = candidate; this.note(candidate.visitId, 'admitted', time); }
    }
    if (!this.current && !reserve && this.queue.length) {
      const visit = this.queue.shift(), shift = Math.max(0, time - visit.approachStartMs);
      this.current = { ...visit, originalApproachStartMs: visit.approachStartMs };
      for (const key of ['approachStartMs', 'approachEndMs', 'dockEndMs', 'serviceEndMs', 'departureEndMs', 'resolvedMs']) this.current[key] += shift;
      this.note(visit.visitId, 'admitted', time);
    }
    return { ...raw, current: this.current, next: this.queue[0] || raw.next };
  }
  note(id, action, time) { this.decisions.push({ id, action, time }); if (this.decisions.length > 128) this.decisions.shift(); }
}
