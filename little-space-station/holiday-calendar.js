import { ChristmasTreeCalendar } from './christmas-tree.js';
import { LocalDate, AddLocalDays, LocalDayNumber } from './local-calendar.js';
// Local calendar arithmetic; no storage side effects. DAY is a duration only.
export const DAY = 86_400_000;
export function Thanksgiving(year) {
  const first = LocalDate(year, 10, 1);
  return AddLocalDays(first, (4 - new Date(first).getDay() + 7) % 7 + 21);
}
export function Advent(year) {
  const christmas = LocalDate(year, 11, 25);
  return AddLocalDays(christmas, -((new Date(christmas).getDay() || 7) + 21));
}
export function HolidayCalendar(time) {
  // Base eligibility/background stages only. Authored physical installations
  // must pass through ResolveHolidayEffects before rendering.
  const year = new Date(time).getFullYear();
  const thanksgiving = Thanksgiving(year), advent = Advent(year);
  const christmas = LocalDate(year, 11, 25);
  const gathering = time >= AddLocalDays(thanksgiving, -5) && time < advent;
  const awaiting = time >= advent && time < christmas;
  // Christmas Day through January 5, in the device's local calendar.
  // Do not confuse a fourth Advent Sunday on Dec 24 with Christmas itself.
  const christmasHandoff = time >= christmas || time < LocalDate(year, 0, 6);
  const treeYear = new Date(time).getMonth() === 0 ? year - 1 : year;
  return { year, thanksgiving, advent, christmas, gathering,
    preparing: gathering && time < thanksgiving,
    eligible: year === 2026 && time >= thanksgiving && time < advent,
    adventWeek: awaiting ? Math.min(4, 1 + Math.floor((LocalDayNumber(time) - LocalDayNumber(advent)) / 7)) : 0,
    christmasHandoff,
    tree: ChristmasTreeCalendar(time, Advent(treeYear), LocalDate(treeYear, 11, 25)),
    // Light the Christ candle on Christmas Eve without advancing the season.
    christCandleLit: time >= AddLocalDays(christmas, -1) || time < LocalDate(year, 0, 6),
    // Prepare the unlit wreath during the six hours BEFORE Advent. Candle
    // counts change only on local Sunday boundaries.
    wreathPreparing: gathering && time >= advent - 6 * 3_600_000,
    transition: christmasHandoff ? 1 : Math.max(0, Math.min(1, (time - advent + 6 * 3_600_000) / (6 * 3_600_000))),
  };
}
