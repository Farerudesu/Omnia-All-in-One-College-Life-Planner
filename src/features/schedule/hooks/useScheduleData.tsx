import { useMemo, useEffect } from 'react';
import { GraduationCap, AlertTriangle, Pin } from 'lucide-react';
import { useData } from '@/lib/useData';
import * as ds from '@/lib/dataService';
import type { CategoryKey } from '@/lib/dataService';
import {
  getWeekDates,
  getISODay,
  toDateString,
  isToday,
  durationMinutes,
  parseTime,
} from '@/lib/dateUtils';
import type { Course, CalendarEvent, ClassSession, SessionException } from '@/types';
import type { SelectedClassBlock } from '../types';
import {
  DEFAULT_GRID_START,
  getHoursForGrid,
  scheduleItemHasPassed,
  getGridStartForDay,
  getLayoutBlocksForDay,
} from '../utils/scheduleUtils';
import type { ScheduleSearchResult } from '../components/ScheduleHeader';
import type {
  NextClassInfo,
  TodaySessionItem,
  StudyGapInfo,
  WeeklyLoadInfo,
} from '../components/ScheduleRightPanel';

interface UseScheduleDataParams {
  currentDate: Date;
  viewMode: 'today' | 'week';
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setSelectedBlock: (b: SelectedClassBlock) => void;
  setSelectedEventForModal: (e: CalendarEvent) => void;
  currentTimeRef: React.RefObject<HTMLDivElement | null>;
  firstActivityRef: React.RefObject<HTMLDivElement | null>;
}

export function useScheduleData({
  currentDate,
  viewMode,
  searchQuery,
  setSearchQuery,
  setSelectedBlock,
  setSelectedEventForModal,
  currentTimeRef,
  firstActivityRef,
}: UseScheduleDataParams) {
  const courses = useData(ds.getCourses);
  const sessions = useData(ds.getClassSessions);
  const exceptions = useData(ds.getSessionExceptions);
  const events = useData(ds.getEvents);
  const settings = useData(ds.getSettings);
  const notifications = useData(ds.getNotifications);
  const podReservation = useData(ds.getPodReservation);
  const categoryVisibility = useData(ds.getCategoryVisibility);

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const mondayDate = weekDates[0];

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const getSessionsForDay = (
    date: Date
  ): Array<{ session: ClassSession; exception?: SessionException }> => {
    if (categoryVisibility.classes === false) return [];
    const dayNum = getISODay(date);
    const dateStr = toDateString(date);
    return sessions
      .filter((s) => s.daysOfWeek.includes(dayNum))
      .map((s) => {
        const exc = ds.getExceptionForDate(s.id, dateStr);
        return { session: s, exception: exc };
      })
      .filter(({ exception }) => !exception || exception.type !== 'no-class');
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dateStr = toDateString(date);
    return events.filter((e) => {
      if (e.date !== dateStr) return false;
      const typeKey = (
        e.type === 'class'
          ? 'classes'
          : e.type === 'exam'
            ? 'exams'
            : e.type === 'deadline'
              ? 'deadlines'
              : 'personal'
      ) as CategoryKey;
      return categoryVisibility[typeKey] !== false;
    });
  };

  const displayDays = viewMode === 'today' ? [currentDate] : weekDates;
  const dayScheduleData = useMemo(() => {
    return displayDays.map((date) => {
      const daySessions = getSessionsForDay(date);
      const dayEvents = getEventsForDay(date);
      const gridStart = getGridStartForDay(daySessions, dayEvents);
      return { date, daySessions, dayEvents, gridStart, hours: getHoursForGrid(gridStart) };
    });
  }, [displayDays, sessions, exceptions, events, categoryVisibility]);

  const validGridStarts = dayScheduleData.map((day) => day.gridStart).filter(Number.isFinite);
  const gridStart = validGridStarts.length > 0 ? Math.min(...validGridStarts) : DEFAULT_GRID_START;
  const hours = getHoursForGrid(gridStart);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isToday(currentDate)) {
        const daySessions = getSessionsForDay(currentDate);
        const dayEvents = getEventsForDay(currentDate);
        const dayGridStart = getGridStartForDay(daySessions, dayEvents);
        const dayBlocks = getLayoutBlocksForDay(daySessions, dayEvents, dayGridStart, courseMap);
        const hasRemaining = dayBlocks.some((b) => !scheduleItemHasPassed(currentDate, b.endTime));

        if (dayBlocks.length > 0 && !hasRemaining) {
          firstActivityRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        } else if (currentTimeRef.current) {
          currentTimeRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        } else if (firstActivityRef.current) {
          firstActivityRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      } else if (firstActivityRef.current) {
        firstActivityRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [currentDate, viewMode, sessions, events, exceptions, courseMap]);

  const nextClass = useMemo((): NextClassInfo | null => {
    const now = new Date();
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      const dayNum = getISODay(checkDate);
      const dateStr = toDateString(checkDate);

      const daySessions = sessions
        .filter((s) => s.daysOfWeek.includes(dayNum))
        .map((s) => ({ session: s, exception: ds.getExceptionForDate(s.id, dateStr) }))
        .filter(
          ({ exception }) =>
            !exception || (exception.type !== 'no-class' && exception.type !== 'cancelled')
        )
        .sort((a, b) => {
          const tA = a.exception?.newStartTime || a.session.startTime;
          const tB = b.exception?.newStartTime || b.session.startTime;
          return tA.localeCompare(tB);
        });

      for (const { session, exception } of daySessions) {
        const startTime = exception?.newStartTime || session.startTime;
        const { hours: h, minutes: m } = parseTime(startTime);
        const sessionStart = new Date(checkDate);
        sessionStart.setHours(h, m, 0, 0);
        if (sessionStart > now) {
          const course = courseMap.get(session.courseId);
          if (course) {
            const diff = sessionStart.getTime() - now.getTime();
            const mins = Math.max(0, Math.floor(diff / 60000));
            return {
              course,
              session,
              exception,
              startTime,
              endTime: exception?.newEndTime || session.endTime || '',
              room: exception?.newRoom || session.room || course.room || 'TBA',
              minutesUntil: mins,
              date: checkDate,
            };
          }
        }
      }
    }
    return null;
  }, [sessions, exceptions, courseMap]);

  const studyGap = useMemo((): StudyGapInfo | null => {
    const today = new Date();
    const daySess = getSessionsForDay(today);
    if (daySess.length < 2) return null;

    const sorted = daySess
      .map(({ session, exception }) => ({
        startTime: exception?.newStartTime || session.startTime || '',
        endTime: exception?.newEndTime || session.endTime || '',
        courseId: session.courseId,
      }))
      .filter((s) => s.startTime && s.endTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (sorted.length < 2) return null;

    let maxGap = 0;
    let gapBetween = { before: '', after: '' };
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = durationMinutes(sorted[i].endTime, sorted[i + 1].startTime);
      if (gap > maxGap) {
        maxGap = gap;
        gapBetween = {
          before: courseMap.get(sorted[i].courseId)?.code || '',
          after: courseMap.get(sorted[i + 1].courseId)?.code || '',
        };
      }
    }
    if (maxGap >= 60) {
      const gapHours = (maxGap / 60).toFixed(1);
      return { hours: Number(gapHours), before: gapBetween.before, after: gapBetween.after };
    }
    return null;
  }, [sessions, exceptions, courseMap]);

  const weeklyLoad = useMemo((): WeeklyLoadInfo => {
    let totalMinutes = 0;
    weekDates.forEach((date) => {
      const daySess = getSessionsForDay(date);
      daySess.forEach(({ session, exception }) => {
        const start = exception?.newStartTime || session.startTime;
        const end = exception?.newEndTime || session.endTime;
        if (
          start &&
          end &&
          exception?.type !== 'cancelled' &&
          !exception?.types?.includes('cancelled')
        ) {
          totalMinutes += durationMinutes(start, end);
        }
      });
    });
    return {
      hours: Number((totalMinutes / 60).toFixed(1)),
      pace: totalMinutes / 60 <= 20 ? 'Balanced pace' : 'Heavy load',
    };
  }, [sessions, exceptions, weekDates]);

  const scheduleSearchResults = useMemo((): ScheduleSearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: ScheduleSearchResult[] = [];

    courses.forEach((c) => {
      if (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.professor?.toLowerCase().includes(q) ||
        c.room?.toLowerCase().includes(q)
      ) {
        results.push({
          id: `course-${c.id}`,
          title: `${c.code} – ${c.name}`,
          subtitle: `Prof. ${c.professor || 'Staff'} · Room ${c.room || 'TBA'}`,
          icon: <GraduationCap size={16} />,
          action: () => {
            const firstSession = sessions.find((s) => s.courseId === c.id);
            if (firstSession) {
              setSelectedBlock({
                session: firstSession,
                course: c,
                date: new Date(),
              });
            }
            setSearchQuery('');
          },
        });
      }
    });

    events.forEach((ev) => {
      if (ev.title.toLowerCase().includes(q) || ev.notes?.toLowerCase().includes(q)) {
        results.push({
          id: `event-${ev.id}`,
          title: ev.title,
          subtitle: `${ev.date} ${ev.startTime ? `at ${ev.startTime}` : ''} · ${ev.type}`,
          icon: ev.type === 'exam' ? <AlertTriangle size={16} /> : <Pin size={16} />,
          action: () => {
            setSelectedEventForModal(ev);
            setSearchQuery('');
          },
        });
      }
    });

    return results;
  }, [searchQuery, courses, sessions, events]);

  const todayDate = new Date();
  const todaySessions: TodaySessionItem[] = useMemo(
    () => getSessionsForDay(todayDate),
    [sessions, exceptions, categoryVisibility]
  );
  const todayEvents: CalendarEvent[] = useMemo(
    () => getEventsForDay(todayDate),
    [events, categoryVisibility]
  );

  return {
    courses,
    sessions,
    exceptions,
    events,
    settings,
    notifications,
    podReservation,
    categoryVisibility,
    weekDates,
    mondayDate,
    courseMap,
    dayScheduleData,
    gridStart,
    hours,
    nextClass,
    studyGap,
    weeklyLoad,
    scheduleSearchResults,
    todaySessions,
    todayEvents,
  };
}
