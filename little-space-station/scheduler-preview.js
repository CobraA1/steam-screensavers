// Loaded only by preview-console. Isolated records; never writes narrative data.
import { ScheduledEvents } from './scheduled-events.js';
import { TrafficScheduler } from './simulation-world.js';
import { LocalDate } from './local-calendar.js';
export const SCHEDULER_SCENARIOS = Object.freeze([
  ['delayed', 'Late Advent III launch · already-lit candle'],
  ['traffic', 'Docked spacecraft before pending observance'],
  ['backlog', 'Four missed Sundays · spaced catch-up'],
  ['decorating', 'Interrupted star installation · tend installed star'],
  ['cleanup', 'January cleanup · explicit retirement'],
]);
export function CreateSchedulerPreview(config, scenario, { time, records } = {}) {
  const settings = { ...config, story: { enabled: false }, maintenance: { activeChance: 0 }, pipRhythm: { enabled: false },
    ...(scenario === 'traffic' ? {} : { traffic: { quietGapMinutes: [2000,2000], longGapChance: 0 } }) };
  const generator = new TrafficScheduler(config.worldSeed, settings.traffic);
  time ??= scenario === 'backlog' ? LocalDate(2026, 11, 23, 12) : scenario === 'decorating' ? LocalDate(2026, 11, 23, 12) :
    scenario === 'cleanup' ? LocalDate(2027, 0, 6, 12) : LocalDate(2026, 11, 13, 12);
  if (scenario === 'traffic' && !records) {
    const visit = generator.At(time).current || generator.At(time).next;
    time = visit.dockEndMs + 1000;
  }
  const runtime = { clock: { worldTimeMs: time } };
  const events = new ScheduledEvents({ config: settings, runtime, traffic: generator, preview: true, records: records || [] });
  events.events = events.events.filter(e => scenario === 'decorating' ? e.id === '2026:advent:star:0' : e.id.includes('advent-wreath') &&
    (scenario === 'backlog' || scenario === 'cleanup' || e.week === 2));
  return { events, scenario, time };
}
