import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, AlertTriangle, Pin, Share2, Copy, Check } from 'lucide-react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import type { CategoryKey } from '../lib/dataService';
import { Modal } from '../components/Modal';
import { CategoryIndicator } from '../components/CategoryIndicator';
import { EventDetailsModal } from '../components/EventDetailsModal';
import { useLanguage } from '../lib/useLanguage';
import { translations } from '../lib/i18n';
import {
  getWeekDates,
  getISODay,
  toDateString,
  isToday,
  formatTime12,
  durationMinutes,
  timeToGridPosition,
  timeToGridHeight,
  getMonthName,
  formatDateShort,
  formatDateLong,
  parseTime,
} from '../lib/dateUtils';
import type { ClassSession, Course, SessionException, ExceptionType, CategoryShape, CalendarEvent, EventType } from '../types';

const DEFAULT_GRID_START = 7;
const GRID_END = 18;

function getHoursForGrid(gridStart: number) {
  const safeStart = Number.isFinite(gridStart)
    ? Math.min(Math.max(Math.floor(gridStart), 0), GRID_END)
    : DEFAULT_GRID_START;
  const length = Math.max(1, GRID_END - safeStart + 1);
  return Array.from({ length }, (_, i) => safeStart + i);
}

function scheduleItemHasPassed(date: Date, endTime?: string) {
  const isAllDay = !endTime;
  const { hours, minutes } = parseTime((endTime || '23:59').slice(0, 5));
  const end = new Date(date);
  end.setHours(hours, minutes, isAllDay ? 59 : 0, isAllDay ? 999 : 0);
  return end.getTime() < Date.now();
}

interface DayScheduleBlock {
  id: string;
  kind: 'session' | 'event';
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
  colIndex: number;
  totalCols: number;
  session?: ClassSession;
  course?: Course;
  exception?: SessionException;
  room?: string;
  event?: CalendarEvent;
}

export function SchedulePage() {
  const navigate = useNavigate();
  const lang = useLanguage();
  const t = translations[lang] || translations.id;
  const courses = useData(ds.getCourses);
  const sessions = useData(ds.getClassSessions);
  const exceptions = useData(ds.getSessionExceptions);
  const events = useData(ds.getEvents);
  const categoryVisibility = useData(ds.getCategoryVisibility);
  const notifications = useData(ds.getNotifications);
  const podReservation = useData(ds.getPodReservation);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'week' | 'today'>('today');
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const dayHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (currentTimeRef.current || dayHeaderRef.current)?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [currentDate, viewMode]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [isCreatingShareCode, setIsCreatingShareCode] = useState(false);
  const [isShareCodeCopied, setIsShareCodeCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CalendarEvent | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{
    session: ClassSession;
    course: Course;
    date: Date;
    exception?: SessionException;
  } | null>(null);

  const handleCreateShareCode = async () => {
    setShowShareModal(true);
    setShareCode('');
    setShareError('');
    setIsShareCodeCopied(false);
    setIsCreatingShareCode(true);
    try {
      setShareCode(await ds.createShareCode());
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Unable to create a share code.');
    } finally {
      setIsCreatingShareCode(false);
    }
  };

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsShareCodeCopied(true);
      window.setTimeout(() => setIsShareCodeCopied(false), 1800);
    } catch {
      setShareError('Clipboard access is unavailable. Select and copy the code.');
    }
  };

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const mondayDate = weekDates[0];

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  // Get sessions for a specific day with category filter
  function getSessionsForDay(date: Date) {
    if (categoryVisibility.classes === false) return [];
    const dayNum = getISODay(date);
    const dateStr = toDateString(date);
    return sessions
      .filter((s) => s.daysOfWeek.includes(dayNum))
      .map((s) => {
        const exc = ds.getExceptionForDate(s.id, dateStr);
        return { session: s, exception: exc };
      })
      .filter(({ exception }) => {
        if (!exception) return true;
        return exception.type !== 'cancelled' && exception.type !== 'no-class';
      });
  }

  // Get events for a specific day with category filter
  function getEventsForDay(date: Date) {
    const dateStr = toDateString(date);
    return events.filter((e) => {
      if (e.date !== dateStr) return false;
      const typeKey = (e.type === 'class' ? 'classes' : e.type === 'exam' ? 'exams' : e.type === 'deadline' ? 'deadlines' : 'personal') as CategoryKey;
      return categoryVisibility[typeKey] !== false;
    });
  }

  // Layout blocks with collision detection / side-by-side positioning
  function getGridStartForDay(
    daySessions: Array<{ session: ClassSession; exception?: SessionException }>,
    dayEvents: CalendarEvent[]
  ) {
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

  function getLayoutBlocksForDay(
    daySessions: Array<{ session: ClassSession; exception?: SessionException }>,
    dayEvents: CalendarEvent[],
    gridStart: number
  ): DayScheduleBlock[] {
    const blocks: DayScheduleBlock[] = [];

    // 1. Classes
    for (const { session, exception } of daySessions) {
      const course = courseMap.get(session.courseId);
      if (!course) continue;
      const startTime = exception?.newStartTime || session.startTime;
      const endTime = exception?.newEndTime || session.endTime;
      const room = exception?.newRoom || session.room;
      const { hours: sh, minutes: sm } = parseTime(startTime);
      const { hours: eh, minutes: em } = parseTime(endTime);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const top = timeToGridPosition(startTime, gridStart, GRID_END + 1);
      const height = timeToGridHeight(startTime, endTime, gridStart, GRID_END + 1);

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

    // 2. Events with start times
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
      const top = timeToGridPosition(startTime, gridStart, GRID_END + 1);
      const height = timeToGridHeight(startTime, endTime, gridStart, GRID_END + 1);

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

    // Sort items by start time ascending, and longer duration first
    blocks.sort((a, b) => a.startMinutes - b.startMinutes || (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes));

    // Group into connected overlapping clusters
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

    // Assign sub-columns greedily per cluster
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

  // Today's sessions & events for the right panel
  const todayDate = new Date();
  const todaySessions = useMemo(() => {
    return getSessionsForDay(todayDate);
  }, [sessions, exceptions, categoryVisibility]);

  const todayEvents = useMemo(() => {
    const dateStr = toDateString(todayDate);
    return events.filter((e) => {
      if (e.date !== dateStr) return false;
      const typeKey = (e.type === 'class' ? 'classes' : e.type === 'exam' ? 'exams' : e.type === 'deadline' ? 'deadlines' : 'personal') as CategoryKey;
      return categoryVisibility[typeKey] !== false;
    });
  }, [events, categoryVisibility]);

  // Navigate period (day or week depending on viewMode)
  const prevPeriod = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (viewMode === 'today' ? 1 : 7));
    setCurrentDate(d);
  };
  const nextPeriod = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === 'today' ? 1 : 7));
    setCurrentDate(d);
  };
  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  const goToToday = () => {
    setCurrentDate(new Date());
    setViewMode('today');
  };

  // Find the next upcoming class for the hero card
  const nextClass = useMemo(() => {
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      const daySessions = getSessionsForDay(checkDate);
      for (const { session, exception } of daySessions) {
        const startTime = exception?.newStartTime || session.startTime;
        if (!startTime) continue;
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
  }, [sessions, exceptions, courses, courseMap]);

  // Study gap detection
  const studyGap = useMemo(() => {
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
      const hours = (maxGap / 60).toFixed(1);
      return { hours, before: gapBetween.before, after: gapBetween.after };
    }
    return null;
  }, [sessions, exceptions, courses, courseMap]);

  // Weekly load
  const weeklyLoad = useMemo(() => {
    let totalMinutes = 0;
    weekDates.forEach((date) => {
      const daySess = getSessionsForDay(date);
      daySess.forEach(({ session, exception }) => {
        const start = exception?.newStartTime || session.startTime;
        const end = exception?.newEndTime || session.endTime;
        if (start && end) {
          totalMinutes += durationMinutes(start, end);
        }
      });
    });
    return {
      hours: Math.round(totalMinutes / 60),
      pace: totalMinutes / 60 <= 20 ? 'Balanced pace' : 'Heavy load',
    };
  }, [sessions, exceptions, weekDates]);

  // Universal schedule search results
  const scheduleSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      action: () => void;
    }> = [];

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

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      {/* Top header bar — visible on desktop */}
      <div className="hidden-mobile" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 2rem',
        borderBottom: '1px solid var(--outline-variant)',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        background: 'var(--surface-container-lowest)',
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button type="button" className="btn-ghost min-touch-target" onClick={prevWeek} aria-label="Previous week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" className="btn-ghost min-touch-target" onClick={goToToday}>Today</button>
          <button type="button" className="btn-ghost min-touch-target" onClick={nextWeek} aria-label="Next week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <span className="tabular-nums" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.125rem',
            fontWeight: 600,
            marginLeft: '0.5rem',
          }}>
            {mondayDate ? `${getMonthName(mondayDate.getMonth())} ${mondayDate.getFullYear()}` : ''}
          </span>
        </div>

        {/* Universal Schedule Search input with auto-suggest popover */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <div style={{ position: 'relative' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--on-surface-variant)"
              strokeWidth="2.5"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search schedule, courses, rooms... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.8125rem',
                padding: '0.45rem 2rem 0.45rem 2rem',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--on-surface-variant)',
                  fontSize: '0.75rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Auto-suggest dropdown */}
          {searchQuery.trim() && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                maxHeight: 340,
                overflowY: 'auto',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-modal)',
                zIndex: 100,
                padding: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--on-surface-variant)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>
                {scheduleSearchResults.length} Match{scheduleSearchResults.length !== 1 ? 'es' : ''}
              </div>
              {scheduleSearchResults.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  No courses or events matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                scheduleSearchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={item.action}
                    style={{
                      padding: '0.5rem 0.625rem',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    className="hover-highlight"
                  >
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* View mode switcher + Notifications + Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            background: 'var(--surface-container)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {[
              { label: 'Day', action: () => setViewMode('today'), active: viewMode === 'today' },
              { label: 'Week', action: () => setViewMode('week'), active: viewMode === 'week' },
              { label: 'Month', action: () => navigate('/calendar'), active: false },
              { label: 'Agenda', action: () => navigate('/calendar'), active: false },
            ].map((v) => (
              <button
                key={v.label}
                type="button"
                onClick={v.action}
                style={{
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  background: v.active ? 'var(--primary)' : 'transparent',
                  color: v.active ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  borderRadius: v.active ? 8 : 0,
                  transition: 'background 0.15s',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowNotifications(!showNotifications);
              }}
              style={{ position: 'relative', padding: '0.45rem', borderRadius: '50%' }}
              aria-label="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadNotificationsCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--error)',
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 320,
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-modal)',
                  zIndex: 100,
                  padding: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--outline-variant)', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{lang === 'id' ? 'Pemberitahuan' : 'Notifications'}</span>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => ds.markAllNotificationsRead()}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--primary)', fontWeight: 600 }}
                    >
                      {lang === 'id' ? 'Tandai sudah dibaca' : 'Mark all read'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--on-surface-variant)',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        <path d="M9 11l2 2 4-4" />
                      </svg>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
                        {lang === 'id' ? 'Tidak ada pemberitahuan baru' : 'No new notifications'}
                      </div>
                      <div style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                        {lang === 'id' ? 'Semua jadwal dan tugasmu sudah beres!' : 'You are all caught up with your classes and tasks.'}
                      </div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          ds.markNotificationRead(n.id);
                          if (n.link) navigate(n.link);
                          setShowNotifications(false);
                        }}
                        style={{
                          padding: '0.5rem 0.625rem',
                          borderRadius: 8,
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'flex-start',
                          opacity: n.read ? 0.65 : 1,
                        }}
                        className="hover-highlight"
                      >
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: n.read ? 'transparent' : 'var(--primary)',
                          marginTop: '0.375rem', flexShrink: 0
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.125rem' }}>
                            <span style={{ fontWeight: n.read ? 600 : 700, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>{n.title}</span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', flexShrink: 0, marginLeft: '0.5rem' }}>{n.time}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{n.message}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile header: Unified, Non-duplicate Navigation & Actions */}
      <div className="show-mobile schedule-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
            <button
              type="button"
              className="btn-ghost min-touch-target"
              onClick={prevPeriod}
              aria-label={viewMode === 'today' ? "Previous day" : "Previous week"}
              style={{ width: 34, height: 34, padding: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={goToToday}
              style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0.25rem 0.5rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {t.common.today}
            </button>
            <button
              type="button"
              className="btn-ghost min-touch-target"
              onClick={nextPeriod}
              aria-label={viewMode === 'today' ? "Next day" : "Next week"}
              style={{ width: 34, height: 34, padding: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div style={{ marginLeft: '0.25rem', minWidth: 0 }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
                {lang === 'id' ? 'Semester Ganjil 2026' : 'Fall term 2026'}
              </div>
              <h1 className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {viewMode === 'today'
                  ? `${currentDate.getDate()} ${getMonthName(currentDate.getMonth(), true)}`
                  : (mondayDate ? `${mondayDate.getDate()} ${getMonthName(mondayDate.getMonth(), true)}` : '')}
              </h1>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-container-high)',
              padding: '2px',
              borderRadius: 9,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('today')}
              style={{
                padding: '0.3rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: viewMode === 'today' ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'today' ? 'var(--surface-container-lowest)' : 'transparent',
                color: viewMode === 'today' ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                borderRadius: 7,
                boxShadow: viewMode === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t.common.today}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              style={{
                padding: '0.3rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: viewMode === 'week' ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'week' ? 'var(--surface-container-lowest)' : 'transparent',
                color: viewMode === 'week' ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                borderRadius: 7,
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t.common.week}
            </button>
          </div>
        </div>

        {/* Mobile Quick Action Buttons Row */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAddClass(true)}
            style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', padding: '0.45rem 0.5rem', minHeight: 36, borderRadius: 10 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {lang === 'id' ? 'Tambah kelas' : 'Add class'}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setShowAddEvent(true)}
            style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', padding: '0.45rem 0.5rem', minHeight: 36, borderRadius: 10 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {lang === 'id' ? 'Tambah acara' : 'Add event'}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => void handleCreateShareCode()}
            aria-label="Share schedule"
            style={{ padding: '0.45rem 0.625rem', minHeight: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Share2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Glance Card: Up Next Class (Visible on mobile) */}
      {nextClass && (
        <div className="show-mobile schedule-mobile-upnext" style={{ padding: '0.75rem 1rem 0' }}>
          <div
            onClick={() => setSelectedBlock({
              session: nextClass.session,
              course: nextClass.course,
              date: nextClass.date,
              exception: nextClass.exception,
            })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSelectedBlock({
                  session: nextClass.session,
                  course: nextClass.course,
                  date: nextClass.date,
                  exception: nextClass.exception,
                });
              }
            }}
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.875rem 1rem',
              boxShadow: 'var(--shadow-xs)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--primary)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                Up next {nextClass.minutesUntil <= 60 ? `in ${nextClass.minutesUntil}m` : `today`}
              </span>
              <span
                className="badge"
                style={{
                  background: `color-mix(in srgb, ${nextClass.course.color || 'var(--primary)'} 15%, transparent)`,
                  color: nextClass.course.color || 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                }}
              >
                {nextClass.course.code}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>
              {nextClass.course.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)', flexWrap: 'wrap' }}>
              <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                {formatTime12(nextClass.startTime)} – {formatTime12(nextClass.endTime)}
              </span>
              <span>•</span>
              <span>{nextClass.room}</span>
              {nextClass.course.professor && (
                <>
                  <span>•</span>
                  <span>{nextClass.course.professor}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="schedule-layout" style={{
        display: 'flex',
        gap: '0',
      }}>
        {/* ─── Main schedule area ─── */}
        <div className="schedule-main-column" style={{ flex: 1, minWidth: 0 }}>
          {/* Week title + Add Class & Event — hidden on mobile since mobile header handles it */}
          <div className="schedule-controls hidden-mobile" style={{
            padding: '1rem 2rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 className="schedule-title tabular-nums" style={{ fontSize: '1.375rem', margin: 0 }}>
                {viewMode === 'today'
                  ? (lang === 'id' ? `Jadwal Hari Ini – ${formatDateShort(currentDate)}` : `Today's Schedule – ${formatDateShort(currentDate)}`)
                  : (lang === 'id' ? `Minggu ${formatDateShort(mondayDate)}` : `Week of ${getMonthName(mondayDate.getMonth(), true)} ${mondayDate.getDate()}, ${mondayDate.getFullYear()}`)}
              </h2>
              <div
                style={{
                  display: 'flex',
                  background: 'var(--surface-container)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'week' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'week' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    borderRadius: viewMode === 'week' ? 8 : 0,
                    transition: 'background 0.15s',
                  }}
                >
                  {t.common.week}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('today')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'today' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'today' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    borderRadius: viewMode === 'today' ? 8 : 0,
                    transition: 'background 0.15s',
                  }}
                >
                  {t.common.today}
                </button>
              </div>
            </div>
            <div className="schedule-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => void handleCreateShareCode()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Share2 size={15} aria-hidden="true" />
                {lang === 'id' ? 'Bagikan' : 'Share'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowAddEvent(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {lang === 'id' ? 'Tambah acara' : 'Add event'}
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowAddClass(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {lang === 'id' ? 'Tambah kelas' : 'Add class'}
              </button>
            </div>
          </div>

          {/* ─── Week / Day Grid ─── */}
          {(() => {
            const displayDays = viewMode === 'today' ? [currentDate] : weekDates.slice(0, 5);
            const dayScheduleData = displayDays.map((date) => {
              const daySessions = getSessionsForDay(date);
              const dayEvents = getEventsForDay(date);
              const gridStart = getGridStartForDay(daySessions, dayEvents);
              return { date, daySessions, dayEvents, gridStart, hours: getHoursForGrid(gridStart) };
            });
            const validGridStarts = dayScheduleData.map((day) => day.gridStart).filter(Number.isFinite);
            const gridStart = validGridStarts.length > 0 ? Math.min(...validGridStarts) : DEFAULT_GRID_START;
            const hours = getHoursForGrid(gridStart);
            return (
              <div className="schedule-grid-scroll" style={{
                padding: '0 2rem 2rem',
                overflowX: 'auto',
              }}>
                <div className={`schedule-grid ${viewMode === 'today' ? 'schedule-grid--today' : 'schedule-grid--week'}`} style={{
                  display: 'grid',
                  gridTemplateColumns: viewMode === 'today' ? '70px 1fr' : '70px repeat(5, 1fr)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  minWidth: viewMode === 'today' ? 0 : 600,
                  background: 'var(--surface-container-lowest)',
                }}>
                  {/* Day headers */}
                  {(() => {
                    const tzOffsetMinutes = -new Date().getTimezoneOffset();
                    const tzOffsetHours = Math.floor(Math.abs(tzOffsetMinutes) / 60);
                    const tzSign = tzOffsetMinutes >= 0 ? '+' : '-';
                    const tzLabel = `GMT${tzSign}${tzOffsetHours}`;
                    return (
                      <div
                        style={{
                          padding: '0.75rem',
                          background: 'var(--surface-container-low)',
                          borderBottom: '1px solid var(--outline-variant)',
                          fontSize: '0.75rem',
                          color: 'var(--on-surface-variant)',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                        title={Intl.DateTimeFormat().resolvedOptions().timeZone}
                      >
                        {tzLabel}
                      </div>
                    );
                  })()}
                  {dayScheduleData.map(({ date }, i) => {
                    const dayNames = lang === 'id' ? ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'] : ['MO', 'TU', 'WED', 'TH', 'FR', 'SAT', 'SUN'];
                    const dayIndex = getISODay(date) - 1;
                    const today = isToday(date);
                    return (
                      <div
                        key={i}
                        ref={viewMode === 'today' && i === 0 ? dayHeaderRef : undefined}
                        style={{
                          padding: '0.5rem',
                          background: today ? 'var(--surface-container)' : 'var(--surface-container-low)',
                          borderBottom: '1px solid var(--outline-variant)',
                          textAlign: 'center',
                          borderLeft: '1px solid var(--outline-variant)',
                        }}
                      >
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--on-surface-variant)',
                          letterSpacing: '0.05em',
                        }}>
                          {dayNames[dayIndex] || 'DAY'}
                        </div>
                    <div className="tabular-nums" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: today ? 32 : 'auto',
                      height: today ? 32 : 'auto',
                      borderRadius: today ? '50%' : 0,
                      background: today ? 'var(--primary)' : 'transparent',
                      color: today ? 'var(--on-primary)' : 'var(--on-surface)',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                    }}>
                      {date.getDate()}
                    </div>
                    {mondayDate && date.getMonth() !== mondayDate.getMonth() && (
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {getMonthName(date.getMonth(), true)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Time grid body */}
              <div style={{
                gridColumn: '1 / -1',
                display: 'grid',
                gridTemplateColumns: viewMode === 'today' ? '70px 1fr' : '70px repeat(5, 1fr)',
                position: 'relative',
              }}>
                {/* Hour labels */}
                <div>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="tabular-nums"
                      style={{
                        height: 60,
                        borderBottom: '1px solid var(--outline-variant)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: '0.25rem',
                        fontSize: '0.75rem',
                        color: 'var(--on-surface-variant)',
                      }}
                    >
                      {lang === 'id'
                        ? `${String(h).padStart(2, '0')}:00`
                        : (h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {dayScheduleData.map(({ date, daySessions, dayEvents }, dayIdx) => {
                  return (
                    <div
                      key={dayIdx}
                      style={{
                        position: 'relative',
                        borderLeft: '1px solid var(--outline-variant)',
                        background: isToday(date) ? 'rgba(49, 99, 66, 0.02)' : 'transparent',
                      }}
                    >
                      {/* Hour grid lines */}
                      {hours.map((h) => (
                        <div
                          key={h}
                          style={{
                            height: 60,
                            borderBottom: '1px solid var(--outline-variant)',
                          }}
                        />
                      ))}

                      {/* Current time indicator */}
                      {isToday(date) && (() => {
                        const now = new Date();
                        const pos = timeToGridPosition(
                          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                          gridStart,
                          GRID_END + 1
                        );
                        if (pos >= 0 && pos <= 100) {
                          return (
                            <div ref={currentTimeRef} style={{
                              position: 'absolute',
                              top: `${pos}%`,
                              left: -5,
                              right: 0,
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                            }}>
                              <div style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: 'var(--error)',
                              }} />
                              <div style={{
                                flex: 1,
                                height: 2,
                                background: 'var(--error)',
                              }} />
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Timetable blocks with collision / overlap layout */}
                      {getLayoutBlocksForDay(daySessions, dayEvents, gridStart).map((block) => {
                        const isMultiCol = block.totalCols > 1;
                        const isPast = scheduleItemHasPassed(date, block.endTime);
                        const widthPct = 100 / block.totalCols;
                        const leftStyle = isMultiCol
                          ? `calc(${block.colIndex * widthPct}% + 1px)`
                          : '2px';
                        const widthStyle = isMultiCol
                          ? `calc(${widthPct}% - 2px)`
                          : 'calc(100% - 4px)';

                        if (block.kind === 'session' && block.session && block.course) {
                          const { session, course, exception, room } = block;
                          const isMatch = !searchQuery.trim() ||
                            course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (course.professor && course.professor.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (room && room.toLowerCase().includes(searchQuery.toLowerCase()));

                          return (
                            <div
                              key={session.id}
                              className="schedule-item-block"
                              role="button"
                              tabIndex={0}
                              aria-label={`${course.code} ${course.name}, ${formatTime12(block.startTime)} to ${formatTime12(block.endTime)} in ${room}`}
                              onClick={() => setSelectedBlock({ session, course, date, exception })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedBlock({ session, course, date, exception });
                                }
                              }}
                              style={{
                                position: 'absolute',
                                top: `${block.top}%`,
                                height: `${block.height}%`,
                                left: leftStyle,
                                width: widthStyle,
                                background: `color-mix(in srgb, ${course.color} 8%, var(--surface-container-lowest))`,
                                border: `1px solid color-mix(in srgb, ${course.color} 28%, var(--outline-variant))`,
                                borderRadius: 6,
                                padding: isMultiCol ? '0.25rem 0.375rem' : '0.375rem 0.5rem',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                fontSize: '0.75rem',
                                opacity: (isMatch ? 1 : 0.28) * (isPast ? 0.58 : 1),
                                filter: isPast ? 'grayscale(1)' : undefined,
                                boxShadow: isMatch && searchQuery.trim() ? '0 0 0 2.5px var(--primary), var(--shadow-sm)' : 'var(--shadow-xs)',
                                transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, opacity 0.15s ease',
                                zIndex: 5 + block.colIndex,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.zIndex = '30';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.zIndex = String(5 + block.colIndex);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                                <CategoryIndicator shape="square" color={course.color} size={6} />
                                <span style={{ fontWeight: 700, fontSize: '0.6875rem', color: course.color, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                                  {course.code}
                                </span>
                                <span className="tabular-nums" style={{ fontSize: '0.5625rem', color: 'var(--on-surface-variant)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                  {formatTime12(block.startTime).replace(' AM', '').replace(' PM', '')}–{formatTime12(block.endTime).replace(' AM', '').replace(' PM', '')}
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {course.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', color: 'var(--on-surface-variant)' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span style={{ fontSize: '0.625rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room}</span>
                              </div>
                              {exception && (
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                                  marginTop: '0.2rem',
                                }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.6px',
                                    color: exception.type === 'room-changed' ? 'var(--tertiary)' : 'var(--error)',
                                  }}>
                                    {exception.type === 'room-changed' ? 'Relocated' : exception.type}
                                  </span>
                                </div>
                              )}
                              {!isMultiCol && (
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                                  marginTop: '0.25rem', color: 'var(--on-surface-variant)',
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                  </svg>
                                  <span style={{ fontSize: '0.625rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.professor}</span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (block.kind === 'event' && block.event) {
                          const ev = block.event;
                          const shape: CategoryShape = ev.type === 'class' ? 'square' : ev.type === 'personal' ? 'circle' : ev.type === 'exam' ? 'diamond' : 'outline-square';
                          const color = ev.color || (ev.type === 'class' ? 'var(--classes)' : ev.type === 'personal' ? 'var(--personal)' : ev.type === 'exam' ? 'var(--exams)' : 'var(--deadlines)');
                          const isMatch = !searchQuery.trim() ||
                            ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ev.notes && ev.notes.toLowerCase().includes(searchQuery.toLowerCase()));

                          return (
                            <div
                              key={ev.id}
                              className="schedule-item-block"
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedEventForModal(ev)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedEventForModal(ev);
                                }
                              }}
                              style={{
                                position: 'absolute',
                                top: `${block.top}%`,
                                height: `${block.height}%`,
                                left: leftStyle,
                                width: widthStyle,
                                background: `color-mix(in srgb, ${color} 8%, var(--surface-container-lowest))`,
                                border: `1px solid color-mix(in srgb, ${color} 28%, var(--outline-variant))`,
                                borderRadius: 6,
                                padding: isMultiCol ? '0.25rem 0.375rem' : '0.25rem 0.5rem',
                                overflow: 'hidden',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                opacity: (isMatch ? 1 : 0.28) * (isPast ? 0.58 : 1),
                                filter: isPast ? 'grayscale(1)' : undefined,
                                boxShadow: isMatch && searchQuery.trim() ? '0 0 0 2.5px var(--primary), var(--shadow-sm)' : 'var(--shadow-xs)',
                                transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, opacity 0.15s ease',
                                zIndex: 6 + block.colIndex,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.zIndex = '30';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.zIndex = String(6 + block.colIndex);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
                                <CategoryIndicator shape={shape} color={color} size={6} />
                                <span style={{ fontWeight: 700, fontSize: '0.6875rem', color, letterSpacing: '-0.01em', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                  {ev.type}
                                </span>
                                {ev.startTime && (
                                  <span className="tabular-nums" style={{ fontSize: '0.5625rem', color: 'var(--on-surface-variant)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                    {formatTime12(ev.startTime).replace(' AM', '').replace(' PM', '')}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ev.title}
                              </div>
                              {ev.notes && (
                                <div style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {ev.notes}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
            );
          })()}
        </div>

        {/* ─── Right panel (desktop only) ─── */}
        <div style={{
          width: 320,
          borderLeft: '1px solid var(--outline-variant)',
          padding: '0',
          flexShrink: 0,
          overflowY: 'auto',
          maxHeight: 'calc(100dvh - 60px)',
        }}
          className="hidden-mobile"
        >
          {/* Next Class Hero Card */}
          {nextClass && (
            <div style={{
              margin: '1rem',
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                  letterSpacing: '0.01em',
                }}>
                  Up next today
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: nextClass.course.color || 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}>
                  {nextClass.course.code}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--on-surface)' }}>
                {nextClass.course.name}
              </h3>

              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}>
                <span className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>
                  {formatTime12(nextClass.startTime)}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  – {formatTime12(nextClass.endTime)} ({durationMinutes(nextClass.startTime, nextClass.endTime)} min)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {nextClass.room}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  {nextClass.course.professor}
                </div>
              </div>

              <button
                type="button"
                className="btn-outline min-touch-target"
                onClick={() => setSelectedBlock({
                  session: nextClass.session,
                  course: nextClass.course,
                  date: nextClass.date,
                  exception: nextClass.exception,
                })}
                style={{
                  marginTop: '1rem', width: '100%', justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                View course details
              </button>
            </div>
          )}

          {/* Today's Schedule */}
          <div style={{ padding: '0 1rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface)" strokeWidth="2" aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Today's schedule</h3>
              </div>
              <span className="tabular-nums" style={{
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
              }}>
                {todaySessions.length} {todaySessions.length === 1 ? 'class' : 'classes'}
                {todayEvents.length > 0 ? ` · ${todayEvents.length} ${todayEvents.length === 1 ? 'event' : 'events'}` : ''}
              </span>
            </div>

            {todaySessions.map(({ session, exception }) => {
              const course = courseMap.get(session.courseId);
              if (!course) return null;
              const startTime = exception?.newStartTime || session.startTime;
              const endTime = exception?.newEndTime || session.endTime;
              const room = exception?.newRoom || session.room;
              const isPast = scheduleItemHasPassed(new Date(), endTime);

              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${course.code} ${course.name}, ${formatTime12(startTime)} in ${room}`}
                  className="card"
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.75rem 0.875rem',
                    cursor: 'pointer',
                    borderRadius: 8,
                    opacity: isPast ? 0.58 : 1,
                    filter: isPast ? 'grayscale(1)' : undefined,
                  }}
                  onClick={() => setSelectedBlock({
                    session,
                    course,
                    date: new Date(),
                    exception,
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedBlock({
                        session,
                        course,
                        date: new Date(),
                        exception,
                      });
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <CategoryIndicator shape="square" color={course.color} size={8} />
                      <span className="badge" style={{
                        background: `color-mix(in srgb, ${course.color} 15%, transparent)`,
                        color: course.color,
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                      }}>
                        {course.code}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                        {course.name}
                      </span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                      {formatTime12(startTime)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.75rem', color: 'var(--on-surface-variant)',
                    marginTop: '0.25rem',
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}>
                    <span>{room}</span>
                    <span>·</span>
                    <span>{course.professor}</span>
                  </div>
                  {exception && (
                    <div style={{ marginTop: '0.375rem' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: exception.type === 'room-changed' ? 'var(--tertiary)' : 'var(--error)',
                      }}>
                        {exception.type === 'room-changed' ? 'Relocated' : exception.type}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Today's Events (Personal, Exams, Deadlines) with Category Indicator */}
            {todayEvents.map((ev) => {
              const shape: CategoryShape = ev.type === 'class' ? 'square' : ev.type === 'personal' ? 'circle' : ev.type === 'exam' ? 'diamond' : 'outline-square';
              const color = ev.color || (ev.type === 'class' ? 'var(--classes)' : ev.type === 'personal' ? 'var(--personal)' : ev.type === 'exam' ? 'var(--exams)' : 'var(--deadlines)');
              const isPast = scheduleItemHasPassed(new Date(), ev.endTime || ev.startTime);

              return (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEventForModal(ev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEventForModal(ev);
                    }
                  }}
                  className="card"
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.75rem 0.875rem',
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${color} 4%, var(--surface-container-lowest))`,
                    cursor: 'pointer',
                    opacity: isPast ? 0.58 : 1,
                    filter: isPast ? 'grayscale(1)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <CategoryIndicator shape={shape} color={color} size={8} />
                      <span className="badge" style={{
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                        color: color,
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        textTransform: 'capitalize',
                      }}>
                        {ev.type}
                      </span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                        {ev.title}
                      </span>
                    </div>
                    {ev.startTime && (
                      <span className="tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                        {formatTime12(ev.startTime)}
                      </span>
                    )}
                  </div>
                  {ev.notes && (
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--on-surface-variant)',
                      marginTop: '0.25rem',
                    }}>
                      {ev.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Study Gap Detected & Quiet Pod Reservation */}
          {studyGap && (
            <div className="card" style={{ margin: '0.75rem 1rem', padding: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--secondary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-secondary-container)" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9375rem' }}>Study gap detected</h4>
                  <p className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {studyGap.hours} hours free between {studyGap.before} & {studyGap.after}
                  </p>
                </div>
              </div>

              {podReservation ? (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 6,
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>✓ {podReservation.name} Reserved</div>
                    <div style={{ fontSize: '0.6875rem', opacity: 0.85 }}>{podReservation.location} ({podReservation.timeSlot})</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => ds.cancelPodReservation()}
                    className="btn-ghost"
                    style={{ fontSize: '0.6875rem', padding: '0.2rem 0.4rem', color: 'var(--on-primary-container)' }}
                  >
                    Release
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => ds.reservePod({
                    podId: 'pod-b14',
                    name: 'Pod B-14',
                    location: 'Main Library 2nd Floor',
                    timeSlot: `${studyGap.before} – ${studyGap.after}`,
                    date: toDateString(new Date()),
                  })}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '0.4rem' }}
                >
                  Reserve Quiet Pod (Library Floor 2)
                </button>
              )}
            </div>
          )}

          {/* Weekly Load Overview */}
          <div className="card" style={{ margin: '0.75rem 1rem', padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--surface-container-high)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2" aria-hidden="true">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem' }}>Weekly load overview</h4>
                <p className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  {weeklyLoad.hours} contact hours · {weeklyLoad.pace}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share your schedule">
        <div style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Share this code with someone to copy your current classes and assignments.
          </p>
          {isCreatingShareCode ? (
            <div role="status" aria-live="polite" style={{ padding: '1.25rem', color: 'var(--on-surface-variant)' }}>Creating code…</div>
          ) : shareCode ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <output aria-label="Schedule share code" className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.18em', padding: '0.75rem 1rem', borderRadius: 8, background: 'var(--surface-container)', color: 'var(--on-surface)' }}>
                {shareCode}
              </output>
              <button type="button" className="btn-outline min-touch-target" onClick={() => void handleCopyShareCode()} aria-label={isShareCodeCopied ? 'Code copied' : 'Copy share code'} title="Copy code">
                {isShareCodeCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              </button>
            </div>
          ) : null}
          {shareError && <div role="alert" style={{ marginTop: '0.75rem', color: 'var(--error)', fontSize: '0.8125rem' }}>{shareError}</div>}
          {isShareCodeCopied && <div role="status" style={{ marginTop: '0.5rem', color: 'var(--primary)', fontSize: '0.8125rem' }}>Code copied.</div>}
        </div>
      </Modal>

      {/* Add Class Modal */}
      <AddClassModal isOpen={showAddClass} onClose={() => setShowAddClass(false)} />

      {/* Class Details Modal */}
      {selectedBlock && (
        <ClassDetailsModal
          session={selectedBlock.session}
          course={selectedBlock.course}
          date={selectedBlock.date}
          exception={selectedBlock.exception}
          onClose={() => setSelectedBlock(null)}
        />
      )}

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEventForModal}
        isOpen={!!selectedEventForModal}
        onClose={() => setSelectedEventForModal(null)}
      />

      {/* Add Event Modal */}
      <ScheduleAddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        defaultDate={toDateString(currentDate)}
      />


    </div>
  );
}

// ─── Schedule Add Event Modal ───
function ScheduleAddEventModal({
  isOpen,
  onClose,
  defaultDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const courses = useData(ds.getCourses);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [type, setType] = useState<EventType>('exam');
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTitleError(null);
      setDate(defaultDate);
      setStartTime('10:00');
      setEndTime('11:00');
      setType('exam');
      setCourseId('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, defaultDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError(isId ? 'Judul kegiatan tidak boleh kosong' : 'Event title is required');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ds.addEvent({
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type,
        courseId: courseId || undefined,
        notes: notes || undefined,
      });
      setTitle('');
      setNotes('');
      setTitleError(null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isId ? 'Tambah kegiatan ke jadwal' : 'Add event to schedule'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="schedule-event-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Judul Kegiatan *' : 'Event Title *'}
          </label>
          <input
            id="schedule-event-title"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) {
                setTitleError(null);
              }
            }}
            placeholder={isId ? 'contoh: Ujian Tengah Semester, Belajar Bersama' : 'e.g. Midterm Exam, Study Session, Project Presentation'}
            style={{
              width: '100%',
              borderColor: titleError ? 'var(--critical, #dc2626)' : undefined,
              boxShadow: titleError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
            }}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'schedule-event-title-error' : undefined}
            required
          />
          {titleError && (
            <div
              id="schedule-event-title-error"
              role="alert"
              style={{
                color: 'var(--critical, #dc2626)',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                fontWeight: 500,
              }}
            >
              {titleError}
            </div>
          )}
        </div>

        <div>
          <div id="schedule-event-category-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Kategori Kegiatan' : 'Event Category'}
          </div>
          <div role="group" aria-labelledby="schedule-event-category-label" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(['exam', 'deadline', 'personal', 'other'] as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={type === t ? 'chip active' : 'chip'}
                onClick={() => setType(t)}
              >
                {t === 'exam' ? (isId ? 'Ujian' : 'Exam') :
                 t === 'deadline' ? (isId ? 'Tenggat' : 'Deadline') :
                 t === 'personal' ? (isId ? 'Pribadi' : 'Personal') :
                 (isId ? 'Lainnya' : 'Other')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="schedule-event-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Tanggal *' : 'Date *'}
            </label>
            <input
              id="schedule-event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label htmlFor="schedule-event-course" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Mata Kuliah Terkait' : 'Associated Course'}
            </label>
            <select
              id="schedule-event-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">{isId ? 'Tidak ada / Umum' : 'None / General'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="schedule-event-start-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Waktu Mulai' : 'Start Time'}
            </label>
            <input
              id="schedule-event-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="schedule-event-end-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Waktu Selesai' : 'End Time'}
            </label>
            <input
              id="schedule-event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="schedule-event-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Catatan / Lokasi' : 'Notes / Location'}
          </label>
          <textarea
            id="schedule-event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isId ? 'Ruang kelas, materi ujian, dll.' : 'Room number, materials permitted, etc.'}
            rows={2}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
            {isId ? 'Tambah Kegiatan' : 'Add Event'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Class Modal ───
function AddClassModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const [courseName, setCourseName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [instructor, setInstructor] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('#1b4332');
  const [type, setType] = useState<'lecture' | 'lab' | 'tutorial' | 'seminar'>('lecture');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCourseName('');
      setNameError(null);
      setCourseCode('');
      setCodeError(null);
      setInstructor('');
      setDays([]);
      setDaysError(null);
      setStartTime('09:00');
      setEndTime('10:30');
      setRoom('');
      setColor('#1b4332');
      setType('lecture');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const toggleDay = (d: number) => {
    setDays((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      if (next.length > 0 && daysError) {
        setDaysError(null);
      }
      return next;
    });
  };

  const handleSave = async () => {
    let hasError = false;
    if (!courseName.trim()) {
      setNameError(isId ? 'Nama mata kuliah tidak boleh kosong' : 'Class name is required');
      hasError = true;
    }
    if (!courseCode.trim()) {
      setCodeError(isId ? 'Kode mata kuliah tidak boleh kosong' : 'Course code is required');
      hasError = true;
    }
    if (days.length === 0) {
      setDaysError(isId ? 'Pilih minimal satu hari pertemuan' : 'Select at least one day');
      hasError = true;
    }
    if (hasError || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await ds.addClassSession({
        courseId: '',
        daysOfWeek: days,
        startTime,
        endTime,
        room,
        type,
      }, {
        name: courseName.trim(),
        code: courseCode.trim(),
        professor: instructor.trim(),
        room,
        color,
      });
      setCourseName('');
      setNameError(null);
      setCourseCode('');
      setCodeError(null);
      setInstructor('');
      setDays([]);
      setDaysError(null);
      setRoom('');
      setColor('#1b4332');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isId ? 'Tambah mata kuliah' : 'Add class'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="class-name" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Nama Mata Kuliah *' : 'Class name *'}
            </label>
            <input
              id="class-name"
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value);
                if (nameError && e.target.value.trim()) setNameError(null);
              }}
              placeholder={isId ? 'contoh: Biologi Sel' : 'e.g. Biology'}
              style={{
                width: '100%',
                borderColor: nameError ? 'var(--critical, #dc2626)' : undefined,
                boxShadow: nameError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
              }}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'class-name-error' : undefined}
            />
            {nameError && (
              <div
                id="class-name-error"
                role="alert"
                style={{
                  color: 'var(--critical, #dc2626)',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  fontWeight: 500,
                }}
              >
                {nameError}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="class-code" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Kode MK *' : 'Course code *'}
            </label>
            <input
              id="class-code"
              value={courseCode}
              onChange={(e) => {
                setCourseCode(e.target.value);
                if (codeError && e.target.value.trim()) setCodeError(null);
              }}
              placeholder={isId ? 'contoh: BIO110' : 'e.g. BIO110'}
              style={{
                width: '100%',
                borderColor: codeError ? 'var(--critical, #dc2626)' : undefined,
                boxShadow: codeError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
              }}
              aria-invalid={!!codeError}
              aria-describedby={codeError ? 'class-code-error' : undefined}
            />
            {codeError && (
              <div
                id="class-code-error"
                role="alert"
                style={{
                  color: 'var(--critical, #dc2626)',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  fontWeight: 500,
                }}
              >
                {codeError}
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="class-instructor" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Dosen Pengampu' : 'Instructor'}
          </label>
          <input
            id="class-instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder={isId ? 'Opsional' : 'Optional'}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div id="class-days-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Hari Pertemuan *' : 'Days *'}
          </div>
          <div
            role="group"
            aria-labelledby="class-days-label"
            style={{
              display: 'flex',
              gap: '0.375rem',
              flexWrap: 'wrap',
              padding: daysError ? '0.375rem' : 0,
              borderRadius: 8,
              border: daysError ? '1px solid var(--critical, #dc2626)' : '1px solid transparent',
            }}
          >
            {[
              { num: 1, label: isId ? 'Sen' : 'Mon' },
              { num: 2, label: isId ? 'Sel' : 'Tue' },
              { num: 3, label: isId ? 'Rab' : 'Wed' },
              { num: 4, label: isId ? 'Kam' : 'Thu' },
              { num: 5, label: isId ? 'Jum' : 'Fri' },
              { num: 6, label: isId ? 'Sab' : 'Sat' },
              { num: 7, label: isId ? 'Min' : 'Sun' },
            ].map(({ num, label }) => (
              <button
                key={num}
                type="button"
                className={days.includes(num) ? 'chip active' : 'chip'}
                onClick={() => toggleDay(num)}
              >
                {label}
              </button>
            ))}
          </div>
          {daysError && (
            <div
              id="class-days-error"
              role="alert"
              style={{
                color: 'var(--critical, #dc2626)',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                fontWeight: 500,
              }}
            >
              {daysError}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="class-start-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Jam Mulai' : 'Start time'}
            </label>
            <input id="class-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="class-end-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Jam Selesai' : 'End time'}
            </label>
            <input id="class-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <label htmlFor="class-room" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Ruang Kelas' : 'Room'}
          </label>
          <input
            id="class-room"
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={isId ? 'contoh: Ruang B-204' : 'e.g. Room B-204'}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label htmlFor="class-color" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Warna Penanda' : 'Color'}
          </label>
          <input id="class-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 56, height: 40, padding: '0.25rem' }} />
        </div>

        <div>
          <label htmlFor="class-type" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Tipe Kegiatan' : 'Type'}
          </label>
          <select id="class-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} style={{ width: '100%' }}>
            <option value="lecture">{isId ? 'Kuliah' : 'Lecture'}</option>
            <option value="lab">{isId ? 'Praktikum' : 'Lab'}</option>
            <option value="tutorial">{isId ? 'Tutorial' : 'Tutorial'}</option>
            <option value="seminar">{isId ? 'Seminar' : 'Seminar'}</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
            {isId ? 'Batal' : 'Discard'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isId ? 'Tambah Kelas' : 'Add class'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Class Details / Exception Modal ───
function ClassDetailsModal({
  session,
  course,
  date,
  exception,
  onClose,
}: {
  session: ClassSession;
  course: Course;
  date: Date;
  exception?: SessionException;
  onClose: () => void;
}) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const [scope, setScope] = useState<'this-day' | 'all-future'>('this-day');
  const [excType, setExcType] = useState<ExceptionType | ''>('');
  const [instructor, setInstructor] = useState(course.professor || '');
  const [newRoom, setNewRoom] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [note, setNote] = useState('');

  const dateStr = formatDateLong(date);
  const startTime = exception?.newStartTime || session.startTime;
  const endTime = exception?.newEndTime || session.endTime;
  const room = exception?.newRoom || session.room;

  const handleSave = () => {
    if (instructor.trim() !== (course.professor || '')) {
      ds.updateCourse(course.id, { professor: instructor.trim() || undefined });
    }
    if (scope === 'this-day' && excType) {
      ds.addSessionException({
        classSessionId: session.id,
        date: toDateString(date),
        type: excType,
        newStartTime: newStartTime || undefined,
        newEndTime: newEndTime || undefined,
        newRoom: newRoom || undefined,
        note: note || undefined,
      });
    } else if (scope === 'all-future') {
      // Edit recurring session directly
      const updates: Partial<ClassSession> = {};
      if (newRoom) updates.room = newRoom;
      if (newStartTime) updates.startTime = newStartTime;
      if (newEndTime) updates.endTime = newEndTime;
      ds.updateClassSession(session.id, updates);
    }
    onClose();
  };

  const excTypes: { type: ExceptionType; label: string; icon: React.ReactNode }[] = [
    { type: 'cancelled', label: isId ? 'Batal' : 'Cancel', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
    { type: 'moved', label: isId ? 'Pindah Jam' : 'Move', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { type: 'room-changed', label: isId ? 'Ruangan' : 'Room', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { type: 'online', label: 'Online', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
    { type: 'extra', label: isId ? 'Kelas Tambahan' : 'Extra class', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { type: 'no-class', label: isId ? 'Libur Hari Ini' : 'No class today', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title={isId ? 'Ubah kelas' : 'Edit class'} maxWidth="560px">
      {/* Occurrence info */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'var(--surface-container)',
        borderRadius: 8,
        marginBottom: '1rem',
        fontSize: '0.8125rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 10h18M8 2v4M16 2v4" />
          </svg>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', fontFamily: 'var(--font-heading)' }}>
            {isId ? 'Mengubah Pertemuan:' : 'Modifying occurrence:'}
          </span>
        </div>
        <span className="tabular-nums" style={{ fontWeight: 600 }}>{dateStr}</span>
      </div>

      {/* Scope choice */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.5rem',
        }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.05em' }}>
            {isId ? 'Cakupan perubahan' : 'Scope choice'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
            {isId ? 'Pilih frekuensi perubahan' : 'Select change frequency'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            className={scope === 'this-day' ? 'chip active' : 'chip'}
            onClick={() => setScope('this-day')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, justifyContent: 'center' }}
          >
            {isId ? 'Hari ini saja' : 'This day only'}
          </button>
          <button
            type="button"
            className={scope === 'all-future' ? 'chip active' : 'chip'}
            onClick={() => setScope('all-future')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, justifyContent: 'center' }}
          >
            {isId ? 'Semua minggu mendatang' : 'All future weeks'}
          </button>
        </div>
      </div>

      {/* Course info */}
      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--outline-variant)' }}>
        <h4>{course.code} {course.name}</h4>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8125rem' }}>
          <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            {dateStr}
            <span style={{ color: 'var(--on-surface-variant)' }}>
              {formatTime12(startTime)}–{formatTime12(endTime)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem', fontSize: '0.8125rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {room}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            {instructor || course.professor || (isId ? 'Dosen belum ditentukan' : 'Instructor TBA')}
          </div>
        </div>
      </div>

      {/* Instructor field */}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="class-instructor-edit" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {isId ? 'Dosen Pengampu' : 'Instructor'}
        </label>
        <input
          id="class-instructor-edit"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          placeholder={isId ? 'contoh: Dr. Budi Santoso' : 'e.g. Dr. Jane Smith'}
          style={{ width: '100%' }}
        />
      </div>

      {/* Exception types (only for "this day only") */}
      {scope === 'this-day' && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.5rem',
          }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.05em' }}>
              {isId ? 'Pengecualian satu hari' : 'Single-day exceptions'}
            </span>
            <span className="tabular-nums" style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
              {isId ? `Hanya untuk ${dateStr}` : `Apply to ${getMonthName(date.getMonth(), true)} ${date.getDate()} only`}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {excTypes.map((et) => (
              <button
                key={et.type}
                type="button"
                className={excType === et.type ? 'card' : 'card'}
                onClick={() => setExcType(excType === et.type ? '' : et.type)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.375rem', padding: '0.75rem',
                  cursor: 'pointer',
                  border: excType === et.type
                    ? '2px solid var(--primary)'
                    : '1px solid var(--outline-variant)',
                  background: excType === et.type
                    ? 'var(--surface-container)'
                    : 'var(--surface-container-lowest)',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{et.icon}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{et.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New room/time fields (contextual) */}
      {(excType === 'moved' || excType === 'room-changed' || scope === 'all-future') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {(excType === 'room-changed' || scope === 'all-future') && (
            <div>
              <label htmlFor="new-room-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                {isId ? 'Ruangan baru' : 'New room'}
              </label>
              <input id="new-room-input" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="e.g. A-103" style={{ width: '100%' }} />
            </div>
          )}
          {(excType === 'moved' || scope === 'all-future') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="new-start-time-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {isId ? 'Mulai baru' : 'New start'}
                </label>
                <input id="new-start-time-input" className="tabular-nums" type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label htmlFor="new-end-time-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {isId ? 'Selesai baru' : 'New end'}
                </label>
                <input id="new-end-time-input" className="tabular-nums" type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <label htmlFor="class-note-input" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            {isId ? 'Catatan pertemuan' : 'Note for this class'}
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            {isId ? 'Opsional' : 'Optional'}
          </span>
        </div>
        <textarea
          id="class-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isId ? 'contoh: Bawa laptop, kuis di awal jam...' : 'e.g., Bring laptop, quiz at start, attending remotely...'}
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-outline" onClick={onClose}>
          {isId ? 'Batal' : 'Discard'}
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isId ? 'Simpan perubahan' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}
