// UTC calendar arithmetic only; no browser clock or storage side effects.
export const DAY = 86_400_000;
export function Thanksgiving(year) {
  const first = Date.UTC(year, 10, 1);
  return first + ((4 - new Date(first).getUTCDay() + 7) % 7 + 21) * DAY;
}
export function Advent(year) {
  const christmas = Date.UTC(year, 11, 25);
  return christmas - ((new Date(christmas).getUTCDay() || 7) + 21) * DAY;
}
export function HolidayCalendar(time) {
  const year = new Date(time).getUTCFullYear();
  const thanksgiving = Thanksgiving(year), advent = Advent(year);
  const christmas = Date.UTC(year, 11, 25);
  const gathering = time >= thanksgiving - 5 * DAY && time < advent;
  const awaiting = time >= advent && time < christmas;
  // Christmas Day through January 5 (the twelve days of Christmas), UTC.
  // Do not confuse a fourth Advent Sunday on Dec 24 with Christmas itself.
  const christmasHandoff = time >= christmas || time < Date.UTC(year, 0, 6);
  return { year, thanksgiving, advent, christmas, gathering,
    preparing: gathering && time < thanksgiving,
    eligible: year === 2026 && time >= thanksgiving && time < advent,
    adventWeek: awaiting ? Math.min(4, 1 + Math.floor((time - advent) / (7 * DAY))) : 0,
    christmasHandoff,
    // Light the Christ candle on Christmas Eve without advancing the season.
    christCandleLit: time >= christmas - DAY || time < Date.UTC(year, 0, 6),
    // Clear harvest settings over the first morning. A scrub reconstructs it.
    transition: christmasHandoff ? 1 : Math.max(0, Math.min(1, (time - advent) / (6 * 3_600_000))),
  };
}
