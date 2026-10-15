/**
 * Date / time utilities used across Schedule, Calendar, etc.
 */

const DAY_NAMES_SHORT_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_NAMES_SHORT_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const DAY_NAMES_FULL_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTH_NAMES_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function getLanguage(): 'en' | 'id' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('omnia_language');
    if (stored === 'en' || stored === 'id') return stored;
  }
  return 'id';
}

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
  if (!str || typeof str !== 'string') return new Date();
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/** Parse "HH:mm" to { hours, minutes } */
export function parseTime(str?: string | null): { hours: number; minutes: number } {
  if (!str || typeof str !== 'string') {
    return { hours: 0, minutes: 0 };
  }
  const parts = str.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  return {
    hours: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0,
    minutes: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

/** Format time: 24h ("07:30", "23:59") in ID mode, 12h ("7:30 AM", "11:59 PM") in EN mode */
export function formatTime12(time?: string | null): string {
  if (!time || typeof time !== 'string') return '';
  const { hours, minutes } = parseTime(time);
  const lang = getLanguage();
  if (lang === 'id') {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/** "HH:mm" → "10:00" (already 24h) */
export function formatTime24(time: string): string {
  return time || '';
}

/** Format numeric date: "05/10/2026" (ID) or "10/05/2026" (EN) */
export function getUserTimezone(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('omnia_timezone');
    if (stored) return stored;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch {
    return 'Asia/Jakarta';
  }
}

/** Get today's date formatted as "YYYY-MM-DD" strictly according to user's timezone */
export function getTodayDateString(timeZone?: string): string {
  const tz = timeZone || getUserTimezone();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/** Convert timezone identifier into user-friendly abbreviation (WIB, WITA, WIT, or GMT+X) */
export function formatTimezoneLabel(timeZone?: string): string {
  const tz = timeZone || getUserTimezone();
  if (tz === 'Asia/Jakarta' || tz === 'Asia/Pontianak') return 'WIB';
  if (tz === 'Asia/Makassar' || tz === 'Asia/Ujung_Pandang') return 'WITA';
  if (tz === 'Asia/Jayapura') return 'WIT';

  try {
    // Try Indonesian locale short name
    const formatter = new Intl.DateTimeFormat('id-ID', { timeZone: tz, timeZoneName: 'short' });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart && !tzPart.includes('/')) return tzPart;
  } catch {}

  // Fallback to GMT+X format
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (offsetPart) return offsetPart;
  } catch {}

  return tz.split('/').pop()?.replace(/_/g, ' ') || 'WIB';
}

/** Single source of truth for urgent assignment definition: due <= 48 hours or overdue */
export const URGENT_HOURS_THRESHOLD = 48;

export function isAssignmentUrgent(dueDate: string, status: string, now = new Date()): boolean {
  if (status === 'done') return false;
  const due = dueDate.includes('T') ? new Date(dueDate) : new Date(`${dueDate}T23:59:59`);
  if (isNaN(due.getTime())) return false;
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours <= URGENT_HOURS_THRESHOLD;
}

export function localDateString(_date = new Date(), timeZone?: string): string {
  return getTodayDateString(timeZone);
}

export function formatDateNumeric(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date.split('T')[0]) : date;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const lang = getLanguage();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (lang === 'id') {
    return `${day}/${month}/${year}`;
  }
  return `${month}/${day}/${year}`;
}

/** Duration in minutes between two "HH:mm" strings */
export function durationMinutes(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const s = parseTime(start);
  const e = parseTime(end);
  const diff = (e.hours * 60 + e.minutes) - (s.hours * 60 + s.minutes);
  return Number.isFinite(diff) ? Math.max(0, diff) : 0;
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

export function getDayName(dayOrDate: number | Date, short = true): string {
  const dayNum = typeof dayOrDate === 'number' ? dayOrDate : getISODay(dayOrDate);
  const isId = getLanguage() === 'id';
  if (isId) {
    return short ? DAY_NAMES_SHORT_ID[dayNum - 1] : DAY_NAMES_FULL_ID[dayNum - 1];
  }
  return short ? DAY_NAMES_SHORT_EN[dayNum - 1] : DAY_NAMES_FULL_EN[dayNum - 1];
}

export function getMonthName(month: number, short = false): string {
  const isId = getLanguage() === 'id';
  if (isId) {
    return short ? MONTH_NAMES_SHORT_ID[month] : MONTH_NAMES_ID[month];
  }
  return short ? MONTH_NAMES_SHORT_EN[month] : MONTH_NAMES_EN[month];
}

/** Format date as "Sen, 5 Okt" (ID) or "Mon, Oct 5" (EN) */
export function formatDateShort(date: Date): string {
  const isId = getLanguage() === 'id';
  const dayIndex = getISODay(date) - 1;
  const monthIndex = date.getMonth();
  if (isId) {
    return `${DAY_NAMES_SHORT_ID[dayIndex]}, ${date.getDate()} ${MONTH_NAMES_SHORT_ID[monthIndex]}`;
  }
  return `${DAY_NAMES_SHORT_EN[dayIndex]}, ${MONTH_NAMES_SHORT_EN[monthIndex]} ${date.getDate()}`;
}

/** Format date as "5 Oktober 2026" (ID) or "October 5, 2026" (EN) */
export function formatDateLong(date: Date): string {
  const isId = getLanguage() === 'id';
  const monthIndex = date.getMonth();
  if (isId) {
    return `${date.getDate()} ${MONTH_NAMES_ID[monthIndex]} ${date.getFullYear()}`;
  }
  return `${MONTH_NAMES_EN[monthIndex]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Format date as "5 Okt" (ID) or "Oct 5" (EN) */
export function formatDateCompact(date: Date): string {
  const isId = getLanguage() === 'id';
  const monthIndex = date.getMonth();
  if (isId) {
    return `${date.getDate()} ${MONTH_NAMES_SHORT_ID[monthIndex]}`;
  }
  return `${MONTH_NAMES_SHORT_EN[monthIndex]} ${date.getDate()}`;
}

export interface DetailedCountdown {
  label: string;
  text: string;
  isUrgent: boolean;
  isOverdue: boolean;
  diffMinutes: number;
  diffHours: number;
  diffDays: number;
}

/**
 * High-precision countdown formatter for deadlines and tasks.
 * Eliminates deceptive "1 hari lagi" readouts for deadlines < 24h or near-term.
 */
export function formatDetailedCountdown(dueDateStr: string, from = new Date(), lang = 'id'): DetailedCountdown {
  if (!dueDateStr) {
    return { label: '', text: '', isUrgent: false, isOverdue: false, diffMinutes: 0, diffHours: 0, diffDays: 0 };
  }

  let due: Date;
  if (!dueDateStr.includes('T')) {
    // If date-only string (e.g. "2026-10-15"), parse in local time at end of day 23:59:59
    const parts = dueDateStr.split('-').map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      due = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
    } else {
      due = new Date(dueDateStr);
    }
  } else {
    due = new Date(dueDateStr);
  }

  const diffMs = due.getTime() - from.getTime();
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absMs / (1000 * 60));
  const totalHours = Math.floor(absMs / (1000 * 60 * 60));
  const remMinutes = totalMinutes % 60;
  const totalDays = Math.floor(absMs / (1000 * 60 * 60 * 24));
  const remHours = totalHours % 24;

  const isId = lang === 'id';

  const makeResult = (label: string, isUrgent: boolean, isOverdue: boolean): DetailedCountdown => ({
    label,
    text: label,
    isUrgent,
    isOverdue,
    diffMinutes: totalMinutes,
    diffHours: totalHours,
    diffDays: totalDays,
  });

  if (isOverdue) {
    if (totalMinutes < 60) {
      return makeResult(isId ? `Terlambat ${Math.max(1, totalMinutes)} mnt` : `Overdue ${Math.max(1, totalMinutes)}m`, true, true);
    }
    if (totalHours < 24) {
      const minText = remMinutes > 0 ? (isId ? ` ${remMinutes} mnt` : ` ${remMinutes}m`) : '';
      return makeResult(isId ? `Terlambat ${totalHours} jam${minText}` : `Overdue ${totalHours}h${minText}`, true, true);
    }
    return makeResult(isId ? `Terlambat ${totalDays} hari` : `Overdue ${totalDays}d`, true, true);
  }

  // Active future deadline
  if (totalMinutes < 60) {
    return makeResult(isId ? `${Math.max(1, totalMinutes)} menit lagi` : `${Math.max(1, totalMinutes)}m left`, true, false);
  }

  if (totalHours < 24) {
    // High-precision <24h: "3 jam 20 mnt lagi" or "10 jam lagi"
    const minText = remMinutes > 0 ? (isId ? ` ${remMinutes} mnt` : ` ${remMinutes}m`) : '';
    return makeResult(isId ? `${totalHours} jam${minText} lagi` : `${totalHours}h${minText} left`, totalHours < 6, false);
  }

  if (totalHours < 48) {
    // Tomorrow window (24-48h): Explicitly display "1 hari X jam lagi" so it's not confused with multiple days
    const hourText = remHours > 0 ? (isId ? ` ${remHours} jam` : ` ${remHours}h`) : '';
    return makeResult(isId ? `1 hari${hourText} lagi` : `1d${hourText} left`, false, false);
  }

  // 48h+ (2+ days)
  return makeResult(isId ? `${totalDays} hari lagi` : `${totalDays}d left`, false, false);
}

/** Relative time: "dalam 45 mnt", "2 hari lalu", "in 45 min", "2 days ago", etc. */
export function relativeTime(target: Date, from = new Date()): string {
  const diff = target.getTime() - from.getTime();
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);
  const isId = getLanguage() === 'id';

  if (isId) {
    if (minutes < 1) return 'baru saja';
    if (minutes < 60) return diff > 0 ? `dalam ${minutes} mnt` : `${minutes} mnt lalu`;
    if (hours < 24) return diff > 0 ? `dalam ${hours} jam` : `${hours} jam lalu`;
    if (days < 7) return diff > 0 ? `dalam ${days} hari` : `${days} hari lalu`;
    return formatDateCompact(target);
  }

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

/** "time-slot" position: what fraction of a time grid does this time occupy? */
export function timeToGridPosition(
  time?: string | null,
  gridStart = 7,
  gridEnd = 19
): number {
  if (!time) return 0;
  const { hours, minutes } = parseTime(time);
  const totalMinutes = hours * 60 + minutes;
  const gridStartMinutes = gridStart * 60;
  const gridEndMinutes = gridEnd * 60;
  const gridRange = gridEndMinutes - gridStartMinutes;
  if (gridRange <= 0) return 0;
  const pos = ((totalMinutes - gridStartMinutes) / gridRange) * 100;
  return Number.isFinite(pos) ? pos : 0;
}

export function timeToGridHeight(
  startTime?: string | null,
  endTime?: string | null,
  gridStart = 7,
  gridEnd = 19
): number {
  if (!startTime || !endTime) return 0;
  const gridRange = (gridEnd - gridStart) * 60;
  if (gridRange <= 0) return 0;
  const dur = durationMinutes(startTime, endTime);
  const h = (dur / gridRange) * 100;
  return Number.isFinite(h) ? Math.max(0, h) : 0;
}
