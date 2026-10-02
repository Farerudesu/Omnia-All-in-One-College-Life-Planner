import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, AlertTriangle, Pin, Share2, Copy, Check } from 'lucide-react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import type { CategoryKey } from '../lib/dataService';
import { Modal } from '../components/Modal';
import { CategoryIndicator } from '../components/CategoryIndicator';
import { EventDetailsModal } from '../components/EventDetailsModal';
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
  parseTime,
} from '../lib/dateUtils';
import type { ClassSession, Course, SessionException, ExceptionType, CategoryShape, CalendarEvent, EventType } from '../types';

const GRID_START = 8;
const GRID_END = 18;
const HOURS = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => GRID_START + i);

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
    (currentTimeRef.current || dayHeaderRef.current)?.scrollIntoView({ block: 'center' });
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
  function getLayoutBlocksForDay(
    daySessions: Array<{ session: ClassSession; exception?: SessionException }>,
    dayEvents: CalendarEvent[]
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
      const top = timeToGridPosition(startTime, GRID_START, GRID_END);
      const height = timeToGridHeight(startTime, endTime, GRID_START, GRID_END);

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
      const top = timeToGridPosition(startTime, GRID_START, GRID_END);
      const height = timeToGridHeight(startTime, endTime, GRID_START, GRID_END);

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

  // Navigate week
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
        const [h, m] = startTime.split(':').map(Number);
        const sessionStart = new Date(checkDate);
        sessionStart.setHours(h, m, 0, 0);
        if (sessionStart > now) {
          const course = courseMap.get(session.courseId);
          if (course) {
            const diff = sessionStart.getTime() - now.getTime();
            const mins = Math.floor(diff / 60000);
            return {
              course,
              session,
              exception,
              startTime,
              endTime: exception?.newEndTime || session.endTime,
              room: exception?.newRoom || session.room,
              minutesUntil: mins,
              date: checkDate,
            };
          }
        }
      }
    }
    return null;
  }, [sessions, exceptions, courses]);

  // Study gap detection
  const studyGap = useMemo(() => {
    const today = new Date();
    const daySess = getSessionsForDay(today);
    if (daySess.length < 2) return null;

    const sorted = daySess
      .map(({ session, exception }) => ({
        startTime: exception?.newStartTime || session.startTime,
        endTime: exception?.newEndTime || session.endTime,
        courseId: session.courseId,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
  }, [sessions, exceptions, courses]);

  // Weekly load
  const weeklyLoad = useMemo(() => {
    let totalMinutes = 0;
    weekDates.forEach((date) => {
      const daySess = getSessionsForDay(date);
      daySess.forEach(({ session, exception }) => {
        const start = exception?.newStartTime || session.startTime;
        const end = exception?.newEndTime || session.endTime;
        totalMinutes += durationMinutes(start, end);
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
            {getMonthName(mondayDate.getMonth())} {mondayDate.getFullYear()}
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
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => ds.markAllNotificationsRead()}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--primary)', fontWeight: 600 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.map((n) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="show-mobile" style={{
        padding: '1rem',
        display: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
              Fall term 2026
            </div>
            <h1 className="tabular-nums" style={{ fontSize: '1.5rem' }}>
              {formatDateShort(new Date())}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={viewMode === 'today' ? 'chip active' : 'chip'}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'chip active' : 'chip'}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '0',
      }}>
        {/* ─── Main schedule area ─── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Week title + Add Class & Event */}
          <div style={{
            padding: '1rem 2rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 className="tabular-nums" style={{ fontSize: '1.375rem', margin: 0 }}>
                {viewMode === 'today'
                  ? `Today's Schedule – ${formatDateShort(new Date())}`
                  : `Week of ${getMonthName(mondayDate.getMonth(), true)} ${mondayDate.getDate()}, ${mondayDate.getFullYear()}`}
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
                  Week
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
                  Today
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => void handleCreateShareCode()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Share2 size={15} aria-hidden="true" />
                Share
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
                Add event
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowAddClass(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add class
              </button>
            </div>
          </div>

          {/* ─── Week / Day Grid ─── */}
          {(() => {
            const displayDays = viewMode === 'today' ? [new Date()] : weekDates.slice(0, 5);
            return (
              <div style={{
                padding: '0 2rem 2rem',
                overflowX: 'auto',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: viewMode === 'today' ? '70px 1fr' : '70px repeat(5, 1fr)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  minWidth: viewMode === 'today' ? 320 : 600,
                  background: 'var(--surface-container-lowest)',
                }}>
                  {/* Day headers */}
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--surface-container-low)',
                    borderBottom: '1px solid var(--outline-variant)',
                    fontSize: '0.75rem',
                    color: 'var(--on-surface-variant)',
                    textAlign: 'center',
                  }}>
                    GMT-4
                  </div>
                  {displayDays.map((date, i) => {
                    const dayNames = ['MO', 'TU', 'WED', 'TH', 'FR', 'SAT', 'SUN'];
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
                    {date.getMonth() !== mondayDate.getMonth() && (
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
                  {HOURS.map((h) => (
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
                      {h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {displayDays.map((date, dayIdx) => {
                  const daySessions = getSessionsForDay(date);
                  const dayEvents = getEventsForDay(date);
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
                      {HOURS.map((h) => (
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
                          GRID_START,
                          GRID_END
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
                      {getLayoutBlocksForDay(daySessions, dayEvents).map((block) => {
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
                  color: nextClass.course.color,
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

      <style>{`
        @media (max-width: 819px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: block !important; }
        }
        @media (min-width: 820px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
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
  const courses = useData(ds.getCourses);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [type, setType] = useState<EventType>('exam');
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    ds.addEvent({
      title,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      type,
      courseId: courseId || undefined,
      notes: notes || undefined,
    });
    setTitle('');
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add event to schedule">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Event Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midterm Exam, Study Session, Project Presentation"
            style={{ width: '100%' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Event Category
          </label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(['exam', 'deadline', 'personal', 'other'] as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={type === t ? 'chip active' : 'chip'}
                onClick={() => setType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Associated Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">None / General</option>
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
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Notes / Location
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Room number, materials permitted, etc."
            rows={2}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            Add Event
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Class Modal ───
function AddClassModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [instructor, setInstructor] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('#1b4332');
  const [type, setType] = useState<'lecture' | 'lab' | 'tutorial' | 'seminar'>('lecture');

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleSave = () => {
    if (!courseName.trim() || !courseCode.trim() || days.length === 0) return;
    ds.addClassSession({
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
    setCourseCode('');
    setInstructor('');
    setDays([]);
    setRoom('');
    setColor('#1b4332');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add class">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="class-name" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Class name</label>
            <input id="class-name" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Biology" style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="class-code" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Course code</label>
            <input id="class-code" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="e.g. BIO110" style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <label htmlFor="class-instructor" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Instructor</label>
          <input id="class-instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="Optional" style={{ width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Days</label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {[
              { num: 1, label: 'Mon' },
              { num: 2, label: 'Tue' },
              { num: 3, label: 'Wed' },
              { num: 4, label: 'Thu' },
              { num: 5, label: 'Fri' },
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="class-start-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Start time</label>
            <input id="class-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="class-end-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>End time</label>
            <input id="class-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <label htmlFor="class-room" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Room</label>
          <input id="class-room" type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Room B-204" style={{ width: '100%' }} />
        </div>

        <div>
          <label htmlFor="class-color" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Color</label>
          <input id="class-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 56, height: 40, padding: '0.25rem' }} />
        </div>

        <div>
          <label htmlFor="class-type" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Type</label>
          <select id="class-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} style={{ width: '100%' }}>
            <option value="lecture">Lecture</option>
            <option value="lab">Lab</option>
            <option value="tutorial">Tutorial</option>
            <option value="seminar">Seminar</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose}>Discard</button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Add class
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
  const [scope, setScope] = useState<'this-day' | 'all-future'>('this-day');
  const [excType, setExcType] = useState<ExceptionType | ''>('');
  const [newRoom, setNewRoom] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [note, setNote] = useState('');

  const dateStr = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}, ${getMonthName(date.getMonth(), true)} ${date.getDate()}, ${date.getFullYear()}`;
  const startTime = exception?.newStartTime || session.startTime;
  const endTime = exception?.newEndTime || session.endTime;
  const room = exception?.newRoom || session.room;

  const handleSave = () => {
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
    { type: 'cancelled', label: 'Cancel', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
    { type: 'moved', label: 'Move', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { type: 'room-changed', label: 'Room', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { type: 'online', label: 'Online', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
    { type: 'extra', label: 'Extra class', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { type: 'no-class', label: 'No class today', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit class" maxWidth="560px">
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
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Modifying occurrence:
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
            Scope choice
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
            Select change frequency
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            className={scope === 'this-day' ? 'chip active' : 'chip'}
            onClick={() => setScope('this-day')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, justifyContent: 'center' }}
          >
            This day only
          </button>
          <button
            type="button"
            className={scope === 'all-future' ? 'chip active' : 'chip'}
            onClick={() => setScope('all-future')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, justifyContent: 'center' }}
          >
            All future weeks
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
            {course.professor}
          </div>
        </div>
      </div>

      {/* Exception types (only for "this day only") */}
      {scope === 'this-day' && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.5rem',
          }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6875rem', letterSpacing: '0.05em' }}>
              Single-day exceptions
            </span>
            <span className="tabular-nums" style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
              Apply to {getMonthName(date.getMonth(), true)} {date.getDate()} only
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
              <label htmlFor="new-room-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>New room</label>
              <input id="new-room-input" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="e.g. A-103" style={{ width: '100%' }} />
            </div>
          )}
          {(excType === 'moved' || scope === 'all-future') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="new-start-time-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>New start</label>
                <input id="new-start-time-input" className="tabular-nums" type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label htmlFor="new-end-time-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>New end</label>
                <input id="new-end-time-input" className="tabular-nums" type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Note */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <label htmlFor="class-note-input" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Note for this class</label>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Optional</span>
        </div>
        <textarea
          id="class-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Bring laptop, quiz at start, attending remotely..."
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-outline" onClick={onClose}>Discard</button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save changes
        </button>
      </div>
    </Modal>
  );
}
