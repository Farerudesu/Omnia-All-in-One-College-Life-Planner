import {
  parseTime,
  toDateString,
  getDayName,
  timeToGridPosition,
} from '@/lib/dateUtils';
import type { ClassSession, Course, SessionException, CalendarEvent } from '@/types';
import type { DayScheduleBlock } from '../types';

export const DEFAULT_GRID_START = 7;
export const GRID_END = 21;

export function getHoursForGrid(gridStart: number): number[] {
  const safeStart = Number.isFinite(gridStart)
    ? Math.min(Math.max(Math.floor(gridStart), 0), GRID_END)
    : DEFAULT_GRID_START;
  const length = Math.max(1, GRID_END - safeStart + 1);
  return Array.from({ length }, (_, i) => safeStart + i);
}

export function scheduleItemHasPassed(date: Date, endTime?: string): boolean {
  const isAllDay = !endTime;
  const { hours, minutes } = parseTime((endTime || '23:59').slice(0, 5));
  const end = new Date(date);
  end.setHours(hours, minutes, isAllDay ? 59 : 0, isAllDay ? 999 : 0);
  return end.getTime() < Date.now();
}

export function getUpcomingBadgeText(date: Date, minutesUntil: number, lang: 'id' | 'en'): string {
  const now = new Date();
  const todayStr = toDateString(now);
  const targetStr = toDateString(date);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateString(tomorrow);

  if (targetStr === todayStr) {
    if (minutesUntil <= 60) {
      return lang === 'id' ? `Berikutnya dlm ${minutesUntil}m` : `Up next in ${minutesUntil}m`;
    }
    return lang === 'id' ? 'Berikutnya Hari Ini' : 'Up next today';
  }

  if (targetStr === tomorrowStr) {
    return lang === 'id' ? 'Berikutnya Besok' : 'Up next tomorrow';
  }

  const dayName = getDayName(date);
  return lang === 'id' ? `Berikutnya ${dayName}` : `Up next ${dayName}`;
}

export function getClassBadges(
  session: ClassSession,
  course?: Course,
  exception?: SessionException,
  isId = false
): Array<{ key: string; label: string; color: string; bg: string }> {
  const badges: Array<{ key: string; label: string; color: string; bg: string }> = [];

  const isMoved = Boolean(
    exception?.type === 'moved' ||
    exception?.types?.includes('moved') ||
    (exception?.newStartTime && exception.newStartTime !== session.startTime)
  );

  const roomStr = (exception?.newRoom || session.room || course?.room || '').toLowerCase();
  const isOnline = Boolean(
    exception?.isOnline ||
    exception?.type === 'online' ||
    exception?.types?.includes('online') ||
    roomStr.includes('online') ||
    roomStr.includes('zoom') ||
    roomStr.includes('meet') ||
    roomStr.includes('teams')
  );

  const isRelocated = Boolean(
    exception?.type === 'room-changed' ||
    exception?.types?.includes('room-changed') ||
    (exception?.newRoom && exception.newRoom !== session.room)
  );

  if (exception?.type === 'cancelled' || exception?.types?.includes('cancelled')) {
    badges.push({
      key: 'cancelled',
      label: isId ? 'DIBATALKAN' : 'CANCELLED',
      color: '#b42318',
      bg: 'rgba(180, 35, 24, 0.14)',
    });
  }

  if (exception?.type === 'attended' || exception?.types?.includes('attended')) {
    badges.push({
      key: 'attended',
      label: isId ? 'MASUK' : 'ATTENDED',
      color: '#147a52',
      bg: 'rgba(20, 122, 82, 0.14)',
    });
  }

  if (isMoved) {
    badges.push({
      key: 'moved',
      label: isId ? 'PINDAH' : 'MOVED',
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.14)',
    });
  }

  if (isOnline) {
    badges.push({
      key: 'online',
      label: 'ONLINE',
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.14)',
    });
  }

  if (isRelocated && !isOnline) {
    badges.push({
      key: 'relocated',
      label: isId ? 'RUANGAN' : 'RELOCATED',
      color: 'var(--tertiary)',
      bg: 'color-mix(in srgb, var(--tertiary) 15%, transparent)',
    });
  }

  if (exception?.type === 'extra' || exception?.types?.includes('extra')) {
    badges.push({
      key: 'extra',
      label: isId ? 'TAMBAHAN' : 'EXTRA',
      color: 'var(--primary)',
      bg: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    });
  }

  return badges;
}

export function getGridStartForDay(
  daySessions: Array<{ session: ClassSession; exception?: SessionException }>,
  dayEvents: CalendarEvent[]
): number {
  const startHours: number[] = [];

  daySessions.forEach(({ session, exception }) => {
    const startTime = exception?.newStartTime || session.startTime;
    if (startTime) {
      const { hours } = parseTime(startTime);
      if (Number.isFinite(hours)) {
        startHours.push(hours);
      }
    }
  });

  dayEvents.forEach((event) => {
    if (!event.startTime) return;
    const { hours } = parseTime(event.startTime);
    if (Number.isFinite(hours)) {
      startHours.push(hours);
    }
  });

  if (startHours.length === 0) return DEFAULT_GRID_START;
  return Math.min(DEFAULT_GRID_START, ...startHours);
}

export function getLayoutBlocksForDay(
  daySessions: Array<{ session: ClassSession; exception?: SessionException }>,
  dayEvents: CalendarEvent[],
  gridStart: number,
  courseMap: Map<string, Course>
): DayScheduleBlock[] {
  const blocks: DayScheduleBlock[] = [];

  for (const { session, exception } of daySessions) {
    const course = courseMap.get(session.courseId);
    if (!course) continue;
    const startTime = exception?.newStartTime || session.startTime;
    const endTime = exception?.newEndTime || session.endTime;
    const room = exception?.newRoom || session.room;
    const { hours: sh, minutes: sm } = parseTime(startTime);
    const { hours: eh, minutes: em } = parseTime(endTime);
    const startMinutes = sh * 60 + sm;
    const endMinutes = Math.max(startMinutes + 15, eh * 60 + em);
    const duration = Math.max(15, endMinutes - startMinutes);
    const gridRangeMinutes = Math.max(60, (GRID_END + 1 - gridStart) * 60);
    const rawTop = timeToGridPosition(startTime, gridStart, GRID_END + 1);
    const rawHeight = (duration / gridRangeMinutes) * 100;
    const top = Math.min(Math.max(rawTop, 0), 96);
    const height = Math.min(Math.max(rawHeight, 4), Math.max(4, 100 - top));

    blocks.push({
      id: session.id,
      kind: 'session',
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      top,
      height,
      colIndex: 0,
      totalCols: 1,
      session,
      course,
      exception,
      room,
    });
  }

  for (const ev of dayEvents) {
    if (!ev.startTime) continue;
    const startTime = ev.startTime;
    let endTime = ev.endTime;
    if (!endTime) {
      const { hours, minutes } = parseTime(startTime);
      endTime = `${String(Math.min(23, hours + 1)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const { hours: sh, minutes: sm } = parseTime(startTime);
    const { hours: eh, minutes: em } = parseTime(endTime);
    const startMinutes = sh * 60 + sm;
    const endMinutes = Math.max(startMinutes + 15, eh * 60 + em);
    const duration = Math.max(15, endMinutes - startMinutes);
    const gridRangeMinutes = Math.max(60, (GRID_END + 1 - gridStart) * 60);
    const rawTop = timeToGridPosition(startTime, gridStart, GRID_END + 1);
    const rawHeight = (duration / gridRangeMinutes) * 100;
    const top = Math.min(Math.max(rawTop, 0), 96);
    const height = Math.min(Math.max(rawHeight, 4), Math.max(4, 100 - top));

    blocks.push({
      id: ev.id,
      kind: 'event',
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      top,
      height,
      colIndex: 0,
      totalCols: 1,
      event: ev,
    });
  }

  if (blocks.length === 0) return [];

  blocks.sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes)
  );

  const clusters: DayScheduleBlock[][] = [];
  let currentCluster: DayScheduleBlock[] = [];
  let clusterEnd = -1;

  for (const b of blocks) {
    if (currentCluster.length === 0) {
      currentCluster.push(b);
      clusterEnd = b.endMinutes;
    } else if (b.startMinutes < clusterEnd) {
      currentCluster.push(b);
      clusterEnd = Math.max(clusterEnd, b.endMinutes);
    } else {
      clusters.push(currentCluster);
      currentCluster = [b];
      clusterEnd = b.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  for (const cluster of clusters) {
    const columns: DayScheduleBlock[][] = [];
    for (const item of cluster) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastItem = col[col.length - 1];
        if (lastItem.endMinutes <= item.startMinutes) {
          col.push(item);
          item.colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
        item.colIndex = columns.length - 1;
      }
    }
    const totalCols = columns.length;
    for (const item of cluster) {
      item.totalCols = totalCols;
    }
  }

  return blocks;
}
