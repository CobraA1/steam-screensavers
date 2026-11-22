import { Advent, DAY } from './holiday-calendar.js';
import { AdventWindowSafe, Smooth } from './advent-activities.js';

export const WREATH_TABLE = Object.freeze([-5.35, 0, 2.02]);
export const WREATH_CANDLES = Object.freeze(Array.from({ length: 5 }, (_, index) => {
  const center = index === 4, angle = index * Math.PI / 2 + Math.PI / 4;
  const x = center ? 0 : .205 * Math.cos(angle), z = center ? 0 : .205 * Math.sin(angle);
  const height = center ? .43 : .3;
  return Object.freeze({ index, id: center ? 'christ' : `advent-${index + 1}`,
    color: center ? 0xf3ead6 : index === 2 ? 0xc5788c : 0x305674,
    height, radius: center ? .05 : .035, x, z,
    wick: Object.freeze([WREATH_TABLE[0] + x, .27 + height + .009, WREATH_TABLE[2] + z]),
  });
}));
export const WREATH_BEATS = Object.freeze([
  ['notice', 2], ['approach', 8], ['tend', 4], ['reach', 3],
  ['light', 2], ['observe', 5], ['return', 8],
].map(([id, duration]) => Object.freeze({ id, duration })));
export const WREATH_SECONDS = WREATH_BEATS.reduce((n, beat) => n + beat.duration, 0);
export const WREATH_CONTACT_SECONDS = 18;
export function WreathBeatStart(id) {
  let seconds = 0;
  for (const beat of WREATH_BEATS) { if (beat.id === id) return seconds; seconds += beat.duration; }
  return 0;
}
export function WreathTimeline(seconds) {
  const elapsed = Math.max(0, Math.min(WREATH_SECONDS, Number(seconds) || 0));
  let start = 0;
  for (const beat of WREATH_BEATS) {
    if (elapsed < start + beat.duration || beat === WREATH_BEATS.at(-1))
      return { elapsed, beat: beat.id, progress: (elapsed - start) / beat.duration };
    start += beat.duration;
  }
}
export function WreathCeremonySpec(week = 0) {
  const index = Math.max(0, Math.min(3, Math.floor(Number(week) || 0)));
  const date = Advent(2026) + index * 7 * DAY;
  const start = date - WREATH_CONTACT_SECONDS * 1000;
  return { id: `2026:advent-wreath:${index + 1}`, week: index, candleId: WREATH_CANDLES[index].id,
    label: `Advent ${index + 1} · ${index === 2 ? 'rose' : 'blue'} candle`, date, start,
    end: start + WREATH_SECONDS * 1000 };
}

export class AdventWreathDirector {
  constructor(config, scheduler, decorating) {
    Object.assign(this, { config, scheduler, decorating });
    this.windows = null;
    this.blocked = new Set(); // At most four inaugural-season IDs; no storage.
  }
  plan() {
    if (this.windows) return this.windows;
    const other = this.decorating.plan();
    this.windows = Array.from({ length: 4 }, (_, i) => WreathCeremonySpec(i)).filter(spec =>
      !other.some(window => spec.start < window.end && spec.end > window.start) &&
      AdventWindowSafe(this.config, this.scheduler, spec.start, spec.end));
    return this.windows;
  }
  at(time) {
    if (time < Advent(2026) - WREATH_CONTACT_SECONDS * 1000 || time >= Date.UTC(2026, 11, 21)) return null;
    const window = this.plan().find(spec => time >= spec.start && time < spec.end);
    return window ? { ...window, ...WreathTimeline((time - window.start) / 1000) } : null;
  }
  update(state, time, blocked = false) {
    const ceremony = this.at(time);
    if (!ceremony) return null;
    const safe = !blocked && !state.adventActivity && state.phase === 'quiet' && !state.shipVisible && !state.visitId &&
      !state.dream && state.seasonal?.serviceDeck?.ready && ['standby', 'look-around'].includes(state.pipTaskId);
    if (!safe) this.blocked.add(ceremony.id);
    return safe && !this.blocked.has(ceremony.id) ? ceremony : null;
  }
}
export function ApplyWreathCeremony(state, ceremony) {
  state.wreathCeremony = ceremony;
  if (!ceremony) return;
  state.pipTaskId = state.robotActivity = state.ambientJob = 'advent-wreath';
  state.pipTaskStage = ceremony.beat;
  state.pipTaskProgress = ceremony.progress;
  state.pipTaskOverallProgress = ceremony.elapsed / WREATH_SECONDS;
  state.pipTaskLabel = state.ambientJobLabel = ceremony.label;
  state.cargoState = 'none'; state.dream = null;
}
// Calendar alone owns visibility: a missed/aborted ceremony cannot hold a
// flame back, extinguish it, or change the white Christmas Eve candle.
export function WreathLampState(holiday, index, ceremony) {
  const lit = index === 4 ? Boolean(holiday.christCandleLit) : Boolean(index < holiday.adventWeek || holiday.christmasHandoff);
  const t = ceremony?.elapsed || 0;
  const response = lit && ceremony?.week === index ? Smooth((t - 18) / .6) * (1 - Smooth((t - 19) / 2)) : 0;
  return { lit, intensity: lit ? 1.1 + .32 * response : 0, height: .045 * (1 + .12 * response) };
}

const mix = (a, b, p) => a + (b - a) * Smooth(p);
const track = (t, keys) => {
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i];
    return a.slice(1).map((value, j) => mix(value, b[j + 1], (t - a[0]) / (b[0] - a[0])));
  }
  return keys.at(-1).slice(1);
};
export function WreathActors(ceremony, home = [-.2, 1.16, .72]) {
  const t = WreathTimeline(ceremony.elapsed).elapsed, week = ceremony.week;
  const target = WREATH_CANDLES[week].wick;
  // Approach the two far wicks from their outside edges, rather than sending
  // the arm through a nearer candle or the taller central Christ candle.
  const workYaw = week < 2 ? Math.PI / 2 : 0;
  const forward = [Math.sin(workYaw), 0, Math.cos(workYaw)];
  const right = [Math.cos(workYaw), 0, -Math.sin(workYaw)];
  const work = [target[0] + .294 * right[0] - .42 * forward[0], .5,
    target[2] + .294 * right[2] - .42 * forward[2]];
  const raised = [target[0] - .1 * forward[0], target[1] + .14, target[2] - .1 * forward[2]];
  const withdrawn = [target[0] - .14 * forward[0], target[1] + .16, target[2] - .14 * forward[2]];
  const sprig = [WREATH_TABLE[0], .26, WREATH_TABLE[2] - .225];
  const tending = week === 1;
  const before = tending ? [sprig[0] + .294, .3, 1.42] : work;
  const pip = track(t, [[0, ...home], [2, ...home], [5, -2.9, 1.75, 1.85],
    [8, before[0], 1.4, before[2]], [10, ...before], [13, ...before],
    [14, before[0], tending ? 1.05 : work[1], before[2]],
    [16, work[0], tending ? 1.05 : work[1], work[2]], [17, ...work], [24, ...work],
    [26, work[0], 1.4, work[2]], [29, -2.9, 1.75, 1.85], [32, ...home]]);
  const contact = tending ? track(t, [[0, ...sprig], [13, ...sprig], [15, ...raised],
    [17, ...target], [19, ...target], [21, ...withdrawn], [32, ...withdrawn]])
    : track(t, [[0, ...raised], [15, ...raised], [17, ...target], [19, ...target], [21, ...withdrawn], [32, ...withdrawn]]);
  const reach = (tending ? Smooth((t - 10)) * (1 - Smooth(t - 12)) : 0) +
    Smooth((t - (tending ? 16 : 14)) / (tending ? 1 : 3)) * (1 - Smooth((t - 21) / 1.5));
  const attention = Smooth((t - 2) / 6) * (1 - Smooth((t - 24) / 8));
  const pleased = Smooth((t - 20) / 1.2) * (1 - Smooth((t - 23) / 1));
  return { pip, yaw: track(t, [[0, -.16], [2, -.16], [5, -1.4], [8, tending ? 0 : workYaw],
    [13, tending ? 0 : workYaw], [15, workYaw], [24, workYaw], [29, -.16], [32, -.16]])[0],
    contact, reach, attention, pleased,
    sprigTurn: tending ? .12 * Smooth((t - 11) / 1.5) * (1 - Smooth((t - 13) / 1)) : 0,
    headRoll: week === 2 ? -.08 * pleased : 0,
    nod: (week === 2 ? .09 : .04) * Math.sin(Math.PI * Smooth((t - 20) / 3)),
    tool: t >= 10 && t < 23,
  };
}
