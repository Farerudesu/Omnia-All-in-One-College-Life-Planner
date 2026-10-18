import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/lib/useData';
import * as ds from '@/lib/dataService';
import * as gcal from '@/lib/googleCalendarService';
import { useToast } from '@/components/Toast';
import { getMonthGrid, toDateString, getISODay, getWeekDates } from '@/lib/dateUtils';
import type { CalendarEvent, Course } from '@/types';
import type { CalendarItem, CalendarSearchResult, ViewMode } from '../types';
import { CATEGORY_MAP } from '../utils/calendarUtils';

interface UseCalendarDataParams {
  lang: 'id' | 'en';
  currentDate: Date;
  setCurrentDate: (d: Date | ((prev: Date) => Date)) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null | ((prev: Date | null) => Date | null)) => void;
  viewMode: ViewMode;
  searchQuery: string;
}

export function useCalendarData({
  lang,
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  viewMode,
  searchQuery,
}: UseCalendarDataParams) {
  const { showToast } = useToast();
  const events = useData(ds.getEvents);
  const courses = useData(ds.getCourses);
  const sessions = useData(ds.getClassSessions);
  const assignments = useData(ds.getAssignments);
  const categoryVisibility = useData(ds.getCategoryVisibility);

  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>(() =>
    gcal.getImportedGoogleEvents()
  );
  const [isGcalSyncing, setIsGcalSyncing] = useState(false);
  const [isGcalConnected, setIsGcalConnected] = useState(() => gcal.isGoogleCalendarConnected());

  useEffect(() => {
    return gcal.subscribeGoogleCalendar(() => {
      setGoogleEvents([...gcal.getImportedGoogleEvents()]);
      setIsGcalConnected(gcal.isGoogleCalendarConnected());
    });
  }, []);

  const handleGoogleCalendarSync = async () => {
    if (isGcalSyncing) return;
    setIsGcalSyncing(true);
    try {
      if (!gcal.isGoogleCalendarConnected()) {
        showToast({
          message:
            lang === 'id' ? 'Menghubungkan ke Google Calendar…' : 'Connecting to Google Calendar…',
          type: 'info',
        });
        await gcal.connectGoogleCalendar();
      }
      showToast({
        message:
          lang === 'id' ? 'Menyinkronkan dengan Google Calendar…' : 'Syncing with Google Calendar…',
        type: 'info',
      });
      const result = await gcal.syncTwoWay();
      showToast({
        message:
          lang === 'id'
            ? `Sukses! ${result.classesCount} kuliah, ${result.assignmentsCount} tugas, ${result.eventsCount} kegiatan terkirim ke Google Calendar.`
            : `Synced! ${result.classesCount} classes, ${result.assignmentsCount} tasks, ${result.eventsCount} events pushed to Google Calendar.`,
        type: 'success',
      });
    } catch (err: unknown) {
      console.error('Google calendar sync failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : lang === 'id'
            ? 'Gagal sinkronisasi Google Calendar'
            : 'Failed to sync Google Calendar';
      showToast({ message, type: 'error' });
    } finally {
      setIsGcalSyncing(false);
    }
  };

  const filters = {
    classes: categoryVisibility.classes !== false,
    exam: categoryVisibility.exams !== false,
    deadline: categoryVisibility.deadlines !== false,
    personal: categoryVisibility.personal !== false,
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthGrid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const getItemsForDate = (date: Date): CalendarItem[] => {
    const dateStr = toDateString(date);
    const dayNum = getISODay(date);
    const items: CalendarItem[] = [];

    const hasPassed = (item: { time?: string; endTime?: string }) => {
      const [hours, minutes] = (item.endTime || item.time || '23:59').split(':').map(Number);
      const endsAt = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours || 0,
        minutes || 0
      );
      return endsAt.getTime() < Date.now();
    };

    if (filters.classes) {
      sessions.forEach((s) => {
        if (s.daysOfWeek.includes(dayNum)) {
          const exc = ds.getExceptionForDate(s.id, dateStr);
          if (exc && (exc.type === 'cancelled' || exc.type === 'no-class')) return;
          const course = courseMap.get(s.courseId);
          if (!course) return;
          items.push({
            id: `class-${s.id}-${dateStr}`,
            title: `${course.code} ${course.name}`,
            type: 'classes',
            time: exc?.newStartTime || s.startTime,
            endTime: exc?.newEndTime || s.endTime,
            room: exc?.newRoom || s.room || course.room,
            color: course.color,
            shape: 'square',
            rawCourse: course,
            rawSession: s,
          });
        }
      });
    }

    events.forEach((ev) => {
      if (ev.date !== dateStr) return;
      const filterKey = ev.type === 'class' ? 'classes' : ev.type;
      if (!filters[filterKey as keyof typeof filters] && ev.type !== 'other') return;
      const cat = CATEGORY_MAP[ev.type] || CATEGORY_MAP.other;
      items.push({
        id: ev.id,
        title: ev.title,
        type: ev.type,
        time: ev.startTime,
        endTime: ev.endTime,
        room: ev.location,
        color: ev.color || cat.color,
        shape: cat.shape,
        notes: ev.notes,
        rawEvent: ev,
      });
    });

    if (filters.personal) {
      googleEvents.forEach((gev) => {
        if (gev.date !== dateStr) return;
        items.push({
          id: gev.id,
          title: gev.title,
          type: 'personal',
          time: gev.startTime,
          endTime: gev.endTime,
          room: gev.location,
          color: '#4285F4',
          shape: 'circle',
          notes: gev.notes,
          rawEvent: gev,
        });
      });
    }

    if (filters.deadline) {
      assignments.forEach((a) => {
        if (a.dueDate.startsWith(dateStr)) {
          const course = a.courseId ? courseMap.get(a.courseId) : undefined;
          items.push({
            id: `assign-${a.id}`,
            title: `${a.title}${course ? ` (${course.code})` : ''}`,
            type: 'deadline',
            time: a.dueDate.split('T')[1]?.slice(0, 5),
            color: 'var(--deadlines)',
            shape: 'outline-square',
            notes: a.notes,
            rawAssignment: a,
          });
        }
      });
    }

    return items
      .map((item) => ({ ...item, isPast: hasPassed(item) }))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  const searchResults = useMemo((): CalendarSearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: CalendarSearchResult[] = [];

    events.forEach((ev) => {
      if (ev.title.toLowerCase().includes(q) || ev.notes?.toLowerCase().includes(q)) {
        const cat = CATEGORY_MAP[ev.type] || CATEGORY_MAP.other;
        results.push({
          id: ev.id,
          title: ev.title,
          subtitle: `${ev.type.toUpperCase()} · ${ev.notes || 'Calendar event'}`,
          date: ev.date,
          time: ev.startTime,
          type: ev.type,
          color: ev.color || cat.color,
          shape: cat.shape,
          rawEvent: ev,
        });
      }
    });

    assignments.forEach((a) => {
      if (a.title.toLowerCase().includes(q) || a.notes?.toLowerCase().includes(q)) {
        results.push({
          id: `assign-${a.id}`,
          title: a.title,
          subtitle: `Deliverable · Due ${new Date(a.dueDate).toLocaleDateString()}`,
          date: a.dueDate.split('T')[0],
          time: a.dueDate.split('T')[1]?.slice(0, 5),
          type: 'deadline',
          color: 'var(--deadlines)',
          shape: 'outline-square',
          rawAssignment: a,
        });
      }
    });

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
          date: toDateString(currentDate),
          type: 'classes',
          color: c.color,
          shape: 'square',
          rawCourse: c,
        });
      }
    });

    return results;
  }, [searchQuery, events, assignments, courses, currentDate]);

  const prevPeriod = () => {
    if (viewMode === 'Week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
      setSelectedDate(d);
    } else if (viewMode === 'Day') {
      const target = selectedDate || currentDate;
      const d = new Date(target);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
      setSelectedDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'Week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
      setSelectedDate(d);
    } else if (viewMode === 'Day') {
      const target = selectedDate || currentDate;
      const d = new Date(target);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
      setSelectedDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const toggleFilter = (key: string) => {
    const catKey = (
      key === 'exam' ? 'exams' : key === 'deadline' ? 'deadlines' : key
    ) as ds.CategoryKey;
    ds.toggleCategoryVisibility(catKey);
  };

  const agendaDates = useMemo(() => {
    const list: Array<{ date: Date; dateStr: string; items: CalendarItem[] }> = [];
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const items = getItemsForDate(d);
      if (items.length > 0) {
        list.push({ date: d, dateStr: toDateString(d), items });
      }
    }
    return list;
  }, [currentDate, events, sessions, filters, googleEvents, assignments]);

  const weekDates = useMemo(() => {
    return getWeekDates(selectedDate || currentDate);
  }, [selectedDate, currentDate]);

  return {
    courses,
    events,
    sessions,
    assignments,
    filters,
    year,
    month,
    monthGrid,
    courseMap,
    googleEvents,
    isGcalSyncing,
    isGcalConnected,
    handleGoogleCalendarSync,
    getItemsForDate,
    selectedItems,
    searchResults,
    agendaDates,
    weekDates,
    prevPeriod,
    nextPeriod,
    goToToday,
    toggleFilter,
  };
}
