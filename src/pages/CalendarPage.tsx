import { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { Modal } from '../components/Modal';
import { CategoryIndicator } from '../components/CategoryIndicator';
import { EventDetailsModal } from '../components/EventDetailsModal';
import {
  getMonthGrid,
  getMonthName,
  toDateString,
  isToday,
  isSameDay,
  formatDateLong,
  formatTime12,
  getISODay,
  getWeekDates,
} from '../lib/dateUtils';
import type { EventType, CategoryShape, CalendarEvent } from '../types';

const VIEW_MODES = ['Day', 'Week', 'Month', 'Agenda'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const CATEGORY_MAP: Record<string, { shape: CategoryShape; color: string }> = {
  class: { shape: 'square', color: 'var(--classes)' },
  classes: { shape: 'square', color: 'var(--classes)' },
  exam: { shape: 'diamond', color: 'var(--exams)' },
  deadline: { shape: 'outline-square', color: 'var(--deadlines)' },
  personal: { shape: 'circle', color: 'var(--personal)' },
  other: { shape: 'circle', color: 'var(--on-surface-variant)' },
};

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Month');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickActionMenu, setQuickActionMenu] = useState<{ id: string, originX: number, originY: number, isExiting: boolean } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contextMenuRef.current && quickActionMenu && !quickActionMenu.isExiting) {
      const rect = contextMenuRef.current.getBoundingClientRect();
      const originX = quickActionMenu.originX - rect.left;
      const originY = quickActionMenu.originY - rect.top;
      contextMenuRef.current.style.transformOrigin = `${originX}px ${originY}px`;
    }
  }, [quickActionMenu]);

  const closeQuickActionMenu = () => {
    if (!quickActionMenu) return;
    setQuickActionMenu(prev => prev ? { ...prev, isExiting: true } : null);
    setTimeout(() => {
      setQuickActionMenu(null);
    }, 160);
  };

  const events = useData(ds.getEvents);
  const courses = useData(ds.getCourses);
  const sessions = useData(ds.getClassSessions);
  const assignments = useData(ds.getAssignments);
  const categoryVisibility = useData(ds.getCategoryVisibility);

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
    const map = new Map<string, (typeof courses)[0]>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  // Get all items for a date: events + auto-generated class entries
  function getItemsForDate(date: Date) {
    const dateStr = toDateString(date);
    const dayNum = getISODay(date);
    const items: Array<{
      id: string;
      title: string;
      type: string;
      time?: string;
      endTime?: string;
      color: string;
      shape: CategoryShape;
      room?: string;
      notes?: string;
      rawEvent?: CalendarEvent;
    }> = [];

    const hasPassed = (item: { time?: string; endTime?: string }) => {
      const [hours, minutes] = (item.endTime || item.time || '23:59').split(':').map(Number);
      const endsAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0);
      return endsAt.getTime() < Date.now();
    };

    // Classes from sessions
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
          });
        }
      });
    }

    // Events
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
        color: ev.color || cat.color,
        shape: cat.shape,
        notes: ev.notes,
        rawEvent: ev,
      });
    });

    // Assignments as deadlines
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
          });
        }
      });
    }

    return items
      .map((item) => ({ ...item, isPast: hasPassed(item) }))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  // Universal Calendar Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      date: string;
      time?: string;
      type: string;
      color: string;
      shape: CategoryShape;
      rawEvent?: CalendarEvent;
    }> = [];

    // Search events
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

    // Search assignments
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
        });
      }
    });

    // Search courses
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
        });
      }
    });

    return results;
  }, [searchQuery, events, courses, currentDate]);

  // Navigation handlers
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
    const catKey = (key === 'exam' ? 'exams' : key === 'deadline' ? 'deadlines' : key) as ds.CategoryKey;
    ds.toggleCategoryVisibility(catKey);
  };

  // Agenda view items (next 30 days)
  const agendaDates = useMemo(() => {
    const list: Array<{ date: Date; dateStr: string; items: ReturnType<typeof getItemsForDate> }> = [];
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
  }, [currentDate, events, sessions, filters]);

  // Week view dates
  const weekDates = useMemo(() => {
    return getWeekDates(selectedDate || currentDate);
  }, [selectedDate, currentDate]);

  return (
    <div>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 2rem',
          borderBottom: '1px solid var(--outline-variant)',
          flexWrap: 'wrap',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          background: 'var(--surface-container-lowest)',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={goToToday}>Today</button>
          <button className="btn-ghost min-touch-target" onClick={prevPeriod} aria-label="Previous period">‹</button>
          <button className="btn-ghost min-touch-target" onClick={nextPeriod} aria-label="Next period">›</button>

          <span className="tabular-nums" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 600 }}>
            {viewMode === 'Day' && selectedDate
              ? formatDateLong(selectedDate)
              : `${getMonthName(month)} ${year}`}
          </span>


        </div>

        {/* Search Bar with auto-suggest dropdown & View Mode Switcher */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-container)',
              borderRadius: 8,
              overflow: 'hidden',
              marginRight: '0.5rem',
            }}
          >
            {VIEW_MODES.map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  background: viewMode === v ? 'var(--primary)' : 'transparent',
                  color: viewMode === v ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  borderRadius: viewMode === v ? 8 : 0,
                  transition: 'background 0.15s',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <input
              id="calendar-search"
              type="text"
              placeholder="Search events, exams, courses…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 250,
                fontSize: '0.8125rem',
                padding: '0.45rem 2rem 0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            {searchQuery ? (
              <button
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
            ) : null}
          </div>

          <button
            className="btn-primary"
            onClick={() => setShowAddEvent(true)}
            style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add event
          </button>

          {/* Search Results Dropdown */}
          {searchQuery.trim() && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: 340,
                maxHeight: 380,
                overflowY: 'auto',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-modal)',
                zIndex: 100,
                padding: '0.5rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--on-surface-variant)',
                  padding: '0.375rem 0.5rem',
                  letterSpacing: '0.04em',
                }}
              >
                {searchResults.length} Match{searchResults.length !== 1 ? 'es' : ''} found
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  No events or courses matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const [y, m, d] = item.date.split('-').map(Number);
                      const targetDate = new Date(y, m - 1, d);
                      setCurrentDate(targetDate);
                      setSelectedDate(targetDate);
                      setSearchQuery('');
                      if (item.rawEvent) {
                        setSelectedEventForModal(item.rawEvent);
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.625rem',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.1s',
                    }}
                    className="hover-highlight"
                  >
                    <CategoryIndicator shape={item.shape} color={item.color} size={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {item.date} {item.time ? `· ${item.time}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, padding: '1.5rem 2rem', minWidth: 0 }}>
          {/* Subheader with category toggles */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                {viewMode === 'Month' && `${getMonthName(month)} ${year}`}
                {viewMode === 'Week' && `Week of ${formatDateLong(weekDates[0])}`}
                {viewMode === 'Day' && (selectedDate ? formatDateLong(selectedDate) : 'Today')}
                {viewMode === 'Agenda' && 'Upcoming Agenda & Milestones'}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(CATEGORY_MAP).filter(([k]) => k !== 'other').map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: filters[key as keyof typeof filters] ? 'var(--on-surface)' : 'var(--outline)',
                    opacity: filters[key as keyof typeof filters] ? 1 : 0.5,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <CategoryIndicator shape={val.shape} color={val.color} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  {key === 'exam' ? 's' : key === 'deadline' ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* ══════ VIEW: MONTH ══════ */}
          {viewMode === 'Month' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div
                  key={d}
                  style={{
                    padding: '0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--on-surface-variant)',
                    textAlign: 'center',
                    background: 'var(--surface-container-low)',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  {d}
                </div>
              ))}

              {monthGrid.map((date, i) => {
                const isCurrentMonth = date.getMonth() === month;
                const today = isToday(date);
                const selected = selectedDate && isSameDay(date, selectedDate);
                const items = getItemsForDate(date);
                const isMatchingSearch =
                  searchQuery.trim() &&
                  items.some(
                    (it) =>
                      it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      it.notes?.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      minHeight: 92,
                      padding: '0.375rem 0.5rem',
                      borderBottom: i < 35 ? '1px solid var(--outline-variant)' : undefined,
                      borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--outline-variant)' : undefined,
                      background: selected
                        ? 'var(--surface-container)'
                        : isMatchingSearch
                        ? 'color-mix(in srgb, var(--primary) 12%, var(--surface-container-lowest))'
                        : today
                        ? 'color-mix(in srgb, var(--primary) 6%, var(--surface-container-lowest))'
                        : 'var(--surface-container-lowest)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      opacity: isCurrentMonth ? 1 : 0.45,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: today ? 24 : 'auto',
                          height: today ? 24 : 'auto',
                          borderRadius: today ? '50%' : 0,
                          background: today ? 'var(--primary)' : 'transparent',
                          color: today ? 'var(--on-primary)' : 'var(--on-surface)',
                          fontSize: '0.8125rem',
                          fontWeight: today ? 700 : 500,
                        }}
                      >
                        {date.getDate()}
                      </span>
                      {today && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--primary)' }}>Today</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="group relative"
                          onClick={(e) => {
                            if (item.rawEvent) {
                              e.stopPropagation();
                              setSelectedEventForModal(item.rawEvent);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (quickActionMenu?.id === item.id) {
                              closeQuickActionMenu();
                            } else {
                              setQuickActionMenu({ id: item.id, originX: e.clientX, originY: e.clientY, isExiting: false });
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.25rem',
                            fontSize: '0.6875rem',
                            lineHeight: 1.2,
                            padding: '0.1rem 0.2rem',
                            borderRadius: 3,
                            cursor: 'pointer',
                            filter: item.isPast ? 'grayscale(1)' : undefined,
                            opacity: item.isPast ? 0.58 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            <CategoryIndicator shape={item.shape} color={item.color} size={7} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--on-surface)' }}>
                              {item.title}
                            </span>
                          </div>

                          <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all min-touch-target"
                            style={{ flexShrink: 0, color: 'var(--on-surface-variant)', background: 'transparent' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (quickActionMenu?.id === item.id) {
                                closeQuickActionMenu();
                              } else {
                                setQuickActionMenu({ id: item.id, originX: e.clientX, originY: e.clientY, isExiting: false });
                              }
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="12" cy="19" r="2" />
                            </svg>
                          </button>

                          {quickActionMenu?.id === item.id && (
                            <>
                              <div 
                                className={`fixed inset-0 z-40 ${quickActionMenu.isExiting ? 'context-scrim-exit' : 'context-scrim-enter'}`}
                                onClick={(e) => { e.stopPropagation(); closeQuickActionMenu(); }}
                              />
                              <div 
                                ref={contextMenuRef}
                                className={`absolute z-50 w-64 rounded-xl shadow-lg flex flex-col cursor-default ${quickActionMenu.isExiting ? 'context-menu-exit' : 'context-menu-enter'}`}
                                style={{ 
                                  top: '0', 
                                  left: '100%', 
                                  marginLeft: '0.5rem',
                                  background: 'var(--surface-container-lowest)',
                                  border: '1px solid var(--outline-variant)',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="context-item" style={{ padding: '0.75rem 1rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {item.title}
                                    </div>
                                    <div style={{ 
                                      fontSize: '11px', fontWeight: 600, 
                                      color: item.color, textTransform: 'uppercase', letterSpacing: '0.6px'
                                    }}>
                                      {item.type}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formatDateLong(date)} {item.time && `· ${formatTime12(item.time)}`}
                                  </div>
                                </div>
                                <div style={{ padding: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                                  
                                  <button 
                                    className="btn-ghost hover-highlight context-item" 
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem', width: '100%' }}
                                    onClick={(e) => { e.stopPropagation(); closeQuickActionMenu(); alert('Item pinned to sidebar!'); }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                        <path d="M12 2L12 22M2 12L22 12" />
                                      </svg>
                                      Pin to Sidebar
                                    </div>
                                    <div style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginLeft: '1.625rem', marginTop: '0.125rem' }}>
                                      Display in Upcoming & Pinned
                                    </div>
                                  </button>

                                  <button 
                                    className="btn-ghost hover-highlight context-item" 
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.5rem 0.75rem', width: '100%' }}
                                    onClick={(e) => { e.stopPropagation(); closeQuickActionMenu(); if(item.rawEvent) setSelectedEventForModal(item.rawEvent); }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      Edit Details
                                    </div>
                                    <div style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginLeft: '1.625rem', marginTop: '0.125rem' }}>
                                      Modify time, room, notes
                                    </div>
                                  </button>

                                  <button 
                                    className="btn-ghost hover-highlight context-item" 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}
                                    onClick={(e) => { e.stopPropagation(); closeQuickActionMenu(); if(item.rawEvent) setSelectedEventForModal(item.rawEvent); }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                      <circle cx="12" cy="12" r="10" />
                                      <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    Reschedule / Move
                                  </button>

                                  <button 
                                    className="btn-ghost hover-highlight context-item" 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (item.rawEvent) {
                                        const copy = { ...item.rawEvent, title: `${item.rawEvent.title} (Copy)` };
                                        ds.addEvent(copy);
                                      }
                                      closeQuickActionMenu(); 
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    Duplicate Event
                                  </button>

                                  <div style={{ height: 1, background: 'var(--outline-variant)', margin: '0.25rem 0' }} />

                                  <div className="context-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                        <path d="M2 12h20" />
                                      </svg>
                                      Category
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); if(item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'other' }); closeQuickActionMenu(); }} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }} className="hover-highlight"><CategoryIndicator shape="square" color="var(--classes)" size={10} /></button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); if(item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'exam' }); closeQuickActionMenu(); }} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }} className="hover-highlight"><CategoryIndicator shape="diamond" color="var(--exams)" size={10} /></button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); if(item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'deadline' }); closeQuickActionMenu(); }} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }} className="hover-highlight"><CategoryIndicator shape="outline-square" color="var(--deadlines)" size={10} /></button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); if(item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'personal' }); closeQuickActionMenu(); }} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }} className="hover-highlight"><CategoryIndicator shape="circle" color="var(--personal)" size={10} /></button>
                                    </div>
                                  </div>

                                  <button 
                                    className="btn-ghost hover-highlight context-item" 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}
                                    onClick={(e) => { e.stopPropagation(); closeQuickActionMenu(); alert('Event exported to .ics file'); }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem', color: 'var(--on-surface-variant)' }}>
                                      <circle cx="18" cy="5" r="3" />
                                      <circle cx="6" cy="12" r="3" />
                                      <circle cx="18" cy="19" r="3" />
                                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                    </svg>
                                    Share / Export .ics
                                  </button>

                                  <div style={{ height: 1, background: 'var(--outline-variant)', margin: '0.25rem 0' }} />

                                  <button 
                                    className="btn-ghost hover-highlight context-item" 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--error)' }}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if(item.id.startsWith('assign-')) {
                                        ds.deleteAssignment(item.id.replace('assign-', ''));
                                      } else if(item.rawEvent) {
                                        ds.deleteEvent(item.rawEvent.id); 
                                      }
                                      closeQuickActionMenu(); 
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.75rem' }}>
                                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete Event
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <span style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                          +{items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════ VIEW: WEEK ══════ */}
          {viewMode === 'Week' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.75rem',
              }}
            >
              {weekDates.map((dayDate, i) => {
                const today = isToday(dayDate);
                const selected = selectedDate && isSameDay(dayDate, selectedDate);
                const items = getItemsForDate(dayDate);

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(dayDate)}
                    style={{
                      background: selected
                        ? 'var(--surface-container-high)'
                        : 'var(--surface-container-lowest)',
                      border: today ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
                      borderRadius: 10,
                      padding: '0.875rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      minHeight: 380,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: today ? 'var(--primary)' : 'var(--on-surface)',
                        }}
                      >
                        {dayDate.getDate()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            if (item.rawEvent) {
                              e.stopPropagation();
                              setSelectedEventForModal(item.rawEvent);
                            }
                          }}
                          style={{
                            padding: '0.5rem 0.625rem',
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${item.color} 8%, var(--surface-container-low))`,
                            borderLeft: `3px solid ${item.color}`,
                            fontSize: '0.75rem',
                            filter: item.isPast ? 'grayscale(1)' : undefined,
                            opacity: item.isPast ? 0.58 : 1,
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.125rem' }}>
                            {item.title}
                          </div>
                          {item.time && (
                            <div className="tabular-nums" style={{ color: 'var(--on-surface-variant)', fontSize: '0.6875rem' }}>
                              {formatTime12(item.time)}
                            </div>
                          )}
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: '2rem', textAlign: 'center' }}>
                          No events
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════ VIEW: DAY ══════ */}
          {viewMode === 'Day' && (
            <div
              style={{
                background: 'var(--surface-container-lowest)',
                borderRadius: 12,
                border: '1px solid var(--outline-variant)',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {selectedDate ? formatDateLong(selectedDate) : 'Today'}
                  </h2>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} scheduled
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowAddEvent(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add event for this day
                </button>
              </div>

              {selectedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--on-surface-variant)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☕</div>
                  <div style={{ fontWeight: 600 }}>Completely free day</div>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Nothing scheduled for this date.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.rawEvent) setSelectedEventForModal(item.rawEvent);
                      }}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${item.color} 5%, var(--surface-container-low))`,
                        border: `1px solid color-mix(in srgb, ${item.color} 20%, var(--outline-variant))`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: item.rawEvent ? 'pointer' : 'default',
                        filter: item.isPast ? 'grayscale(1)' : undefined,
                        opacity: item.isPast ? 0.58 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <CategoryIndicator shape={item.shape} color={item.color} size={10} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                            {item.title}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                            {item.time && (
                              <span className="tabular-nums">
                                {formatTime12(item.time)}
                                {item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
                              </span>
                            )}
                            {item.room && <span>Room: {item.room}</span>}
                            {item.notes && <span>{item.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
                          color: item.color,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ VIEW: AGENDA ══════ */}
          {viewMode === 'Agenda' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {agendaDates.map(({ date, dateStr, items }) => (
                <div
                  key={dateStr}
                  style={{
                    background: 'var(--surface-container-lowest)',
                    borderRadius: 12,
                    border: '1px solid var(--outline-variant)',
                    padding: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--outline-variant)',
                      paddingBottom: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: isToday(date) ? 'var(--primary)' : 'var(--on-surface)',
                        }}
                      >
                        {formatDateLong(date)}
                      </span>
                      {isToday(date) && (
                        <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                          Today
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.rawEvent) setSelectedEventForModal(item.rawEvent);
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: 6,
                          background: `color-mix(in srgb, ${item.color} 5%, var(--surface-container-low))`,
                          borderLeft: `4px solid ${item.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: item.rawEvent ? 'pointer' : 'default',
                          filter: item.isPast ? 'grayscale(1)' : undefined,
                          opacity: item.isPast ? 0.58 : 1,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                            {item.time ? formatTime12(item.time) : 'All day'} {item.room ? `· ${item.room}` : ''} {item.notes ? `· ${item.notes}` : ''}
                          </div>
                        </div>

                        <span
                          className="badge"
                          style={{
                            background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
                            color: item.color,
                            fontWeight: 600,
                            fontSize: '0.6875rem',
                          }}
                        >
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected date side panel (desktop only for Month mode) */}
        {viewMode === 'Month' && selectedDate && (
          <div
            style={{
              width: 320,
              borderLeft: '1px solid var(--outline-variant)',
              padding: '1.5rem 1rem',
              overflowY: 'auto',
              maxHeight: 'calc(100dvh - 60px)',
              background: 'var(--surface-container-lowest)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.0625rem' }}>{formatDateLong(selectedDate)}</h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="btn-ghost min-touch-target"
                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}
                aria-label="Close date details"
              >
                ✕
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  border: '1px dashed var(--outline-variant)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-container-low)',
                  marginTop: '1rem',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--outline)" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                    A free day!
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Nothing scheduled for this date.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.rawEvent) setSelectedEventForModal(item.rawEvent);
                    }}
                    style={{
                      padding: '0.875rem 1rem',
                      background: `color-mix(in srgb, ${item.color} 5%, var(--surface-container-lowest))`,
                      border: `1px solid color-mix(in srgb, ${item.color} 18%, var(--outline-variant))`,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      boxShadow: 'var(--shadow-xs)',
                      cursor: item.rawEvent ? 'pointer' : 'default',
                      filter: item.isPast ? 'grayscale(1)' : undefined,
                      opacity: item.isPast ? 0.58 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                      <CategoryIndicator shape={item.shape} color={item.color} size={8} />
                      <span
                        className="badge"
                        style={{
                          background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
                          color: item.color,
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                        }}
                      >
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>{item.title}</div>
                    {item.time && (
                      <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem' }}>
                        {formatTime12(item.time)}
                        {item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
                      </div>
                    )}
                    {item.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn-primary"
              onClick={() => setShowAddEvent(true)}
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add event
            </button>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        defaultDate={selectedDate ? toDateString(selectedDate) : toDateString(new Date())}
      />

      {/* Event Details / Edit / Delete Modal */}
      <EventDetailsModal
        event={selectedEventForModal}
        isOpen={!!selectedEventForModal}
        onClose={() => setSelectedEventForModal(null)}
      />
    </div>
  );
}

// ─── Add Event Modal ───
function AddEventModal({
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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<EventType>('personal');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add calendar event">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="event-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Event Title *
          </label>
          <input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midterm Exam, Problem Set 3 Due, Club Meeting"
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

        <div>
          <label htmlFor="event-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Date *
          </label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%' }}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="event-start-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Start Time
            </label>
            <input
              id="event-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="event-end-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              End Time
            </label>
            <input
              id="event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="event-course" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Associated Course (Optional)
          </label>
          <select id="event-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: '100%' }}>
            <option value="">None / General</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="event-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            Notes & Location
          </label>
          <textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Room number, materials needed, notes…"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Save Event
          </button>
        </div>
      </div>
    </Modal>
  );
}
