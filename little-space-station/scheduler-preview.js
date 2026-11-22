// Loaded only by preview-console. Isolated records; never writes narrative data.
import { ScheduledEvents } from './scheduled-events.js';
import { TrafficScheduler } from './simulation-world.js';
import { LocalDate } from './local-calendar.js';
export const SCHEDULER_SCENARIOS = Object.freeze([
  ['delayed', 'Advent Monday · candle pending and unlit'],
  ['traffic', 'Docked spacecraft before pending candle lighting'],
  ['candle-fallback', 'Candle deadline · lit, ceremony retired'],
  ['decorating', 'December 22 · star due, not installed'],
  ['star-exit', 'Star attached · interrupted exit retained'],
  ['star-fallback', 'End December 23 · star fallback'],
  ['present', 'Wrapped present · placement and handoff'],
  ['present-fallback', 'Wrapped present · fallback, no placement pending'],
  ['backlog', 'Late-season restart · complete scenery, no obsolete work'],
  ['cleanup', 'January cleanup · explicit retirement'],
]);
export function CreateSchedulerPreview(config, scenario, { time, records } = {}) {
  const settings = { ...config, story: { enabled: false }, maintenance: { activeChance: 0 }, pipRhythm: { enabled: false },
    ...(scenario === 'traffic' ? {} : { traffic: { quietGapMinutes: [2000,2000], longGapChance: 0 } }) };
  const generator = new TrafficScheduler(config.worldSeed, settings.traffic);
  time ??= scenario === 'cleanup' ? LocalDate(2027, 0, 6, 12) :
    ['backlog','star-fallback'].includes(scenario) ? LocalDate(2026, 11, 24) :
    scenario === 'candle-fallback' ? LocalDate(2026, 11, 20) :
    ['decorating','star-exit'].includes(scenario) ? LocalDate(2026, 11, 22, 12) :
    scenario === 'present' ? LocalDate(2026, 11, 23, 12) : scenario === 'present-fallback' ? LocalDate(2026, 11, 24) :
    LocalDate(2026, 11, 14, 18);
  if (scenario === 'traffic' && !records) {
    const visit = generator.At(time).current || generator.At(time).next;
    time = visit.dockEndMs + 1000;
  }
  const runtime = { clock: { worldTimeMs: time } };
  const target = scenario.startsWith('star') || scenario === 'decorating' ? '2026:advent:star:0' :
    scenario.startsWith('present') ? '2026:advent:present:4' : '2026:advent-wreath:3';
  const initial = scenario === 'star-exit' ? [{id:target,due:LocalDate(2026,11,22),status:'presenting',effect:{source:'pip',appliedAt:time-1000}}] : [];
  const events = new ScheduledEvents({ config: settings, runtime, traffic: generator, preview: true, records: records || initial });
  // Keep the complete catalog for scenery projection, but isolate presentation
  // eligibility instead of deleting the other effects/prerequisites.
  if (!['backlog','cleanup'].includes(scenario)) for (const e of events.events) if (e.id !== target) e.available = () => false;
  return { events, scenario, time };
}
