// Human calendar only. Traffic and the fictional planet retain absolute time.
export const LocalDate = (year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) =>
  new Date(year, month, day, hour, minute, second, millisecond).getTime();
export function AddLocalDays(time, days) {
  const date = new Date(time);
  date.setDate(date.getDate() + days);
  return date.getTime();
}
export function LocalDayNumber(time) {
  const d = new Date(time);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
}
export function LocalInputValue(time) {
  const d = new Date(time), pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const LocalZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
