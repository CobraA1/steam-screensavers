// Pure projection of scheduler effects onto calendar scenery. Not an inventory
// or a second queue. Preview calls this with isolated/empty records.
import { LocalDate, AddLocalDays } from './local-calendar.js';

export function DecorationEffect(spec) {
  const finish = LocalDate(2026, 11, 24);
  if (spec.week !== undefined) return { kind: 'candle', index: spec.week, at: 18,
    deadline: spec.week < 3 ? AddLocalDays(spec.date, 7) : finish };
  if (!['star', 'ornament', 'present'].includes(spec.kind)) return null;
  // Early parcels get a full local day; the last has all of December 23.
  return { kind: spec.kind, index: spec.kind === 'ornament' ? spec.ornamentIndex : spec.index,
    at: 48, deadline: spec.kind === 'present' ? Math.min(AddLocalDays(spec.date, 1), finish) : finish };
}

export function EffectApplied(event, record, time, active, respectEffectTime = true) {
  if (!event.effect || time < event.date) return false;
  // A saved future effect must not leak backwards into a read-only date seek.
  if (record?.effect && (!respectEffectTime || time >= record.effect.appliedAt)) return true;
  if (active?.event.id === event.id) return active.elapsed >= event.effect.at;
  return time >= event.effect.deadline;
}

export function ResolveHolidayEffects(holiday, time, events, records = new Map(), active = null, { respectEffectTime = true } = {}) {
  const tree = { ...holiday.tree, ornaments: Array.from({ length: 26 }, (_, i) => i < holiday.tree.ornamentCount),
    presents: Array.from({ length: 5 }, (_, i) => i < holiday.tree.presentCount) };
  const candles = Array.from({ length: 4 }, (_, i) => i < holiday.adventWeek || holiday.christmasHandoff);
  // Only inaugural-season authored actions own these props. Other years keep
  // background calendar reconstruction, without pretending an action played.
  if (time >= LocalDate(2026, 10, 1) && time < LocalDate(2027, 0, 6)) {
    for (const event of events) {
      if (!event.effect) continue;
      const applied = EffectApplied(event, records.get(event.id), time, active, respectEffectTime);
      const { kind, index } = event.effect;
      if (kind === 'candle') candles[index] = applied;
      else if (kind === 'star') tree.star = tree.active && applied;
      else if (kind === 'ornament') tree.ornaments[index] = tree.active && applied;
      else if (kind === 'present') tree.presents[index] = tree.active && applied;
    }
  }
  tree.complete = tree.active && tree.sections === 3 && tree.garlandBands === 3 && tree.star &&
    tree.ornaments.every(Boolean) && tree.presents.every(Boolean);
  return { ...holiday, candles, tree };
}
