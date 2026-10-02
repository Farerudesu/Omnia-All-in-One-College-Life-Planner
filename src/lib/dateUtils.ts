/**
 * Date / time utilities used across Schedule, Calendar, etc.
 */

const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** ISO day-of-week: 1=Mon, 7=Sun  (like our daysOfWeek field) */
export function getISODay(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

/** "YYYY-MM-DD" */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" to Date (local midnight) */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Parse "HH:mm" to { hours, minutes } */
export function parseTime(str: string): { hours: number; minutes: number } {
  const [h, m] = str.split(':').map(Number);
  return { hours: h, minutes: m };
}

/** "HH:mm" → "10:00 AM" */
export function formatTime12(time: string): string {
  const { hours, minutes } = parseTime(time);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/** "HH:mm" → "10:00" (already 24h) */
export function formatTime24(time: string): string {
  return time;
}

/** Duration in minutes between two "HH:mm" strings */
export function durationMinutes(start: string, end: string): number {
  const s = parseTime(start);
  const e = parseTime(end);
  return (e.hours * 60 + e.minutes) - (s.hours * 60 + s.minutes);
}

/** Monday-first week dates from a given date */
export function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = getISODay(d);
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dd);
  }
  return dates;
}

/** Get all dates of a month grid (Monday-first, includes overflow from prev/next month) */
export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const isoDay = getISODay(firstDay);
  const start = new Date(firstDay);
  start.setDate(1 - (isoDay - 1));

  const dates: Date[] = [];
  const d = new Date(start);
  // 6 rows × 7 columns = 42 cells
  for (let i = 0; i < 42; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function getDayName(dayNum: number, short = true): string {
  return short ? DAY_NAMES_SHORT[dayNum - 1] : DAY_NAMES_FULL[dayNum - 1];
}

export function getMonthName(month: number, short = false): string {
  return short ? MONTH_NAMES_SHORT[month] : MONTH_NAMES[month];
}

/** Format date as "Mon, Sep 28" */
export function formatDateShort(date: Date): string {
  return `${DAY_NAMES_SHORT[getISODay(date) - 1]}, ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** Format date as "September 28, 2026" */
export function formatDateLong(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Format date as "Oct 3" */
export function formatDateCompact(date: Date): string {
  return `${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** Relative time: "in 45 min", "2 days ago", etc. */
export function relativeTime(target: Date, from = new Date()): string {
  const diff = target.getTime() - from.getTime();
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  const suffix = diff > 0 ? '' : ' ago';
  const prefix = diff > 0 ? 'in ' : '';

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${prefix}${minutes} min${suffix}`;
  if (hours < 24) return `${prefix}${hours} hr${hours > 1 ? 's' : ''}${suffix}`;
  if (days < 7) return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
  return formatDateCompact(target);
}

/** Check if a date falls within a break week */
export function isInBreak(
  date: Date,
  breaks: { start: string; end: string }[]
): boolean {
  const ds = toDateString(date);
  return breaks.some((b) => ds >= b.start && ds <= b.end);
}

/** "time-slot" position: what fraction of a time grid (e.g. 8:00–18:00) does this time occupy? */
export function timeToGridPosition(
  time: string,
  gridStart = 8,
  gridEnd = 18
): number {
  const { hours, minutes } = parseTime(time);
  const totalMinutes = hours * 60 + minutes;
  const gridStartMinutes = gridStart * 60;
  const gridEndMinutes = gridEnd * 60;
  const gridRange = gridEndMinutes - gridStartMinutes;
  return ((totalMinutes - gridStartMinutes) / gridRange) * 100;
}

export function timeToGridHeight(
  startTime: string,
  endTime: string,
  gridStart = 8,
  gridEnd = 18
): number {
  const gridRange = (gridEnd - gridStart) * 60;
  const dur = durationMinutes(startTime, endTime);
  return (dur / gridRange) * 100;
}
