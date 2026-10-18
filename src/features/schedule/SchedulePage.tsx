import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import * as ds from '@/lib/dataService';
import { Modal } from '@/components/Modal';
import { EventDetailsModal } from '@/components/EventDetailsModal';
import { useLanguage } from '@/lib/useLanguage';
import { toDateString, formatTime12 } from '@/lib/dateUtils';
import type { CalendarEvent } from '@/types';
import type { SelectedClassBlock } from './types';
import { getUpcomingBadgeText, getClassBadges } from './utils/scheduleUtils';
import { ScheduleHeader } from './components/ScheduleHeader';
import { ScheduleGrid } from './components/ScheduleGrid';
import { ScheduleRightPanel } from './components/ScheduleRightPanel';
import { AddClassModal } from './components/AddClassModal';
import { ClassDetailsModal } from './components/ClassDetailsModal';
import { ScheduleAddEventModal } from './components/ScheduleAddEventModal';
import { useScheduleData } from './hooks/useScheduleData';

export function SchedulePage() {
  const lang = useLanguage();
  const isId = lang === 'id';

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'today' | 'week'>('week');

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const firstActivityRef = useRef<HTMLDivElement>(null);
  const dayHeaderRef = useRef<HTMLDivElement>(null);

  const [selectedBlock, setSelectedBlock] = useState<SelectedClassBlock | null>(null);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CalendarEvent | null>(null);

  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [isCreatingShareCode, setIsCreatingShareCode] = useState(false);
  const [isShareCodeCopied, setIsShareCodeCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    settings,
    notifications,
    podReservation,
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
  } = useScheduleData({
    currentDate,
    viewMode,
    searchQuery,
    setSearchQuery,
    setSelectedBlock,
    setSelectedEventForModal,
    currentTimeRef,
    firstActivityRef,
  });

  const scrollToDay = (dayIndex: number) => {
    const container = gridScrollRef.current;
    if (!container) return;
    const grid = container.querySelector('.schedule-grid') as HTMLElement | null;
    if (!grid) return;
    const dayHeaders = grid.querySelectorAll('.schedule-day-header');
    if (dayHeaders[dayIndex]) {
      const header = dayHeaders[dayIndex] as HTMLElement;
      const targetLeft = Math.max(0, header.offsetLeft - 70);
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (viewMode === 'week') {
      const today = new Date();
      const todayIdx = weekDates.findIndex((d) => toDateString(d) === toDateString(today));
      if (todayIdx > 0 && todayIdx < 5) {
        const timer = setTimeout(() => {
          scrollToDay(todayIdx);
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [viewMode, currentDate, weekDates]);

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

  return (
    <div className="schedule-page-container">
      <ScheduleHeader
        lang={lang}
        currentDate={currentDate}
        mondayDate={mondayDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        prevPeriod={() => {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - (viewMode === 'today' ? 1 : 7));
          setCurrentDate(d);
        }}
        nextPeriod={() => {
          const d = new Date(currentDate);
          d.setDate(d.getDate() + (viewMode === 'today' ? 1 : 7));
          setCurrentDate(d);
        }}
        prevWeek={() => {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - 7);
          setCurrentDate(d);
        }}
        nextWeek={() => {
          const d = new Date(currentDate);
          d.setDate(d.getDate() + 7);
          setCurrentDate(d);
        }}
        goToToday={() => {
          setCurrentDate(new Date());
          setTimeout(() => {
            currentTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }}
        scrollToCurrentTime={() => {
          if (viewMode !== 'today') setViewMode('today');
          setCurrentDate(new Date());
          setTimeout(() => {
            currentTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={scheduleSearchResults}
        notifications={notifications}
        onOpenAddClass={() => setShowAddClass(true)}
        onOpenAddEvent={() => setShowAddEvent(true)}
        onOpenShare={() => void handleCreateShareCode()}
      />

      {/* Mobile Glance Card: Up Next Class */}
      {nextClass && (
        <div className="show-mobile schedule-mobile-upnext" style={{ padding: '0.75rem 1rem 0' }}>
          <div
            onClick={() =>
              setSelectedBlock({
                session: nextClass.session,
                course: nextClass.course,
                date: nextClass.date,
                exception: nextClass.exception,
              })
            }
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
              gap: '0.5rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--primary)',
                  minWidth: 0,
                }}
              >
                {getUpcomingBadgeText(nextClass.date, nextClass.minutesUntil, lang)}
              </span>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}
              >
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
                {getClassBadges(nextClass.session, nextClass.course, nextClass.exception, isId).map(
                  (b) => (
                    <span
                      key={b.key}
                      className="badge"
                      style={{
                        background: b.bg,
                        color: b.color,
                        fontWeight: 700,
                        fontSize: '0.625rem',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {b.label}
                    </span>
                  )
                )}
              </div>
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--on-surface)',
                overflowWrap: 'anywhere',
                lineHeight: 1.3,
              }}
            >
              {nextClass.course.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
                flexWrap: 'wrap',
              }}
            >
              <span
                className="tabular-nums"
                style={{ fontWeight: 600, color: 'var(--on-surface)' }}
              >
                {formatTime12(nextClass.startTime)} – {formatTime12(nextClass.endTime)}
              </span>
              <span
                style={{
                  background: 'var(--surface-container)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 6,
                  fontWeight: 500,
                  color: 'var(--on-surface)',
                }}
              >
                {nextClass.room}
              </span>
              {nextClass.course.professor && (
                <span style={{ color: 'var(--on-surface-variant)' }}>
                  {nextClass.course.professor}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Schedule & Side Panel */}
      <div className="schedule-layout" style={{ display: 'flex', gap: '0' }}>
        <div className="schedule-main-column" style={{ flex: 1, minWidth: 0 }}>
          <ScheduleGrid
            lang={lang}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            viewMode={viewMode}
            weekDates={weekDates}
            mondayDate={mondayDate}
            timeZone={settings?.timeZone}
            searchQuery={searchQuery}
            dayScheduleData={dayScheduleData}
            gridStart={gridStart}
            hours={hours}
            courseMap={courseMap}
            gridScrollRef={gridScrollRef}
            currentTimeRef={currentTimeRef}
            firstActivityRef={firstActivityRef}
            dayHeaderRef={dayHeaderRef}
            scrollToDay={scrollToDay}
            onSelectBlock={(b) => setSelectedBlock(b)}
            onSelectEvent={(e) => setSelectedEventForModal(e)}
          />
        </div>

        <ScheduleRightPanel
          nextClass={nextClass}
          todaySessions={todaySessions}
          todayEvents={todayEvents}
          courseMap={courseMap}
          studyGap={studyGap}
          podReservation={podReservation}
          weeklyLoad={weeklyLoad}
          lang={lang}
          onSelectBlock={(b) => setSelectedBlock(b)}
          onSelectEvent={(e) => setSelectedEventForModal(e)}
        />
      </div>

      {/* Modals */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share your schedule"
      >
        <div style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
          <p
            style={{
              color: 'var(--on-surface-variant)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            Share this code with someone to copy your current classes and assignments.
          </p>
          {isCreatingShareCode ? (
            <div
              role="status"
              aria-live="polite"
              style={{ padding: '1.25rem', color: 'var(--on-surface-variant)' }}
            >
              Creating code…
            </div>
          ) : shareCode ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              }}
            >
              <output
                aria-label="Schedule share code"
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'var(--surface-container)',
                  color: 'var(--on-surface)',
                }}
              >
                {shareCode}
              </output>
              <button
                type="button"
                className="btn-outline min-touch-target"
                onClick={() => void handleCopyShareCode()}
                aria-label={isShareCodeCopied ? 'Code copied' : 'Copy share code'}
                title="Copy code"
              >
                {isShareCodeCopied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          ) : null}
          {shareError && (
            <div
              role="alert"
              style={{ marginTop: '0.75rem', color: 'var(--error)', fontSize: '0.8125rem' }}
            >
              {shareError}
            </div>
          )}
          {isShareCodeCopied && (
            <div
              role="status"
              style={{ marginTop: '0.5rem', color: 'var(--primary)', fontSize: '0.8125rem' }}
            >
              Code copied.
            </div>
          )}
        </div>
      </Modal>

      <AddClassModal isOpen={showAddClass} onClose={() => setShowAddClass(false)} />

      {selectedBlock && (
        <ClassDetailsModal
          session={selectedBlock.session}
          course={selectedBlock.course}
          date={selectedBlock.date}
          exception={selectedBlock.exception}
          onClose={() => setSelectedBlock(null)}
        />
      )}

      <EventDetailsModal
        event={selectedEventForModal}
        isOpen={!!selectedEventForModal}
        onClose={() => setSelectedEventForModal(null)}
      />

      <ScheduleAddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        defaultDate={toDateString(currentDate)}
      />
    </div>
  );
}

export default SchedulePage;
