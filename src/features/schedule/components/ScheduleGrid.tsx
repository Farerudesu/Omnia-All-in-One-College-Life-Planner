import React, { useRef } from 'react';
import type { ClassSession, Course, SessionException, CalendarEvent } from '@/types';
import type { SelectedClassBlock } from '../types';
import {
  getISODay,
  toDateString,
  isToday,
  timeToGridPosition,
  getMonthName,
  formatTimezoneLabel,
} from '@/lib/dateUtils';
import { GRID_END, getLayoutBlocksForDay } from '../utils/scheduleUtils';
import { ScheduleMobileWeekStrip } from './ScheduleMobileWeekStrip';
import { ScheduleGridBlock } from './ScheduleGridBlock';

interface DayScheduleItem {
  date: Date;
  daySessions: Array<{ session: ClassSession; exception?: SessionException }>;
  dayEvents: CalendarEvent[];
  gridStart: number;
  hours: number[];
}

interface ScheduleGridProps {
  lang: 'id' | 'en';
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  viewMode: 'today' | 'week';
  weekDates: Date[];
  mondayDate?: Date;
  timeZone?: string;
  searchQuery: string;
  dayScheduleData: DayScheduleItem[];
  gridStart: number;
  hours: number[];
  courseMap: Map<string, Course>;
  gridScrollRef: React.RefObject<HTMLDivElement | null>;
  currentTimeRef: React.RefObject<HTMLDivElement | null>;
  firstActivityRef: React.RefObject<HTMLDivElement | null>;
  dayHeaderRef: React.RefObject<HTMLDivElement | null>;
  scrollToDay: (dayIdx: number) => void;
  onSelectBlock: (block: SelectedClassBlock) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function ScheduleGrid({
  lang,
  currentDate,
  setCurrentDate,
  viewMode,
  weekDates,
  mondayDate,
  timeZone,
  searchQuery,
  dayScheduleData,
  gridStart,
  hours,
  courseMap,
  gridScrollRef,
  currentTimeRef,
  firstActivityRef,
  dayHeaderRef,
  scrollToDay,
  onSelectBlock,
  onSelectEvent,
}: ScheduleGridProps) {
  const isId = lang === 'id';
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;

    const container = gridScrollRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.clientX;
    scrollLeftRef.current = container.scrollLeft;

    if (e.pointerType === 'mouse') {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const container = gridScrollRef.current;
    if (!container) return;

    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 4) {
      hasDraggedRef.current = true;
      container.scrollLeft = scrollLeftRef.current - dx;
      container.classList.add('is-dragging');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const container = gridScrollRef.current;
    if (container) {
      container.classList.remove('is-dragging');
      if (e.pointerType === 'mouse') {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  const displayDays = viewMode === 'today' ? [currentDate] : weekDates;

  return (
    <>
      <ScheduleMobileWeekStrip
        isId={isId}
        weekDates={weekDates}
        currentDate={currentDate}
        viewMode={viewMode}
        setCurrentDate={setCurrentDate}
        scrollToDay={scrollToDay}
      />

      <div
        ref={gridScrollRef}
        className="schedule-grid-scroll"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          padding: '0 2rem 2rem',
          overflowX: 'auto',
          touchAction: 'pan-x pan-y',
        }}
      >
        <div
          key={viewMode === 'today' ? toDateString(currentDate) : 'week-view'}
          className={`schedule-grid ${viewMode === 'today' ? 'schedule-grid--today' : 'schedule-grid--week'} schedule-grid-animated`}
          style={{
            display: 'grid',
            gridTemplateColumns:
              viewMode === 'today'
                ? '70px 1fr'
                : `70px repeat(${displayDays.length}, minmax(130px, 1fr))`,
            border: '1px solid var(--outline-variant)',
            borderRadius: 12,
            minWidth: viewMode === 'today' ? 0 : 70 + displayDays.length * 130,
            background: 'var(--surface-container-lowest)',
          }}
        >
          {/* Top Left Timezone Box */}
          <div
            style={{
              position: 'sticky',
              left: 0,
              zIndex: 25,
              padding: '0.75rem',
              background: 'var(--surface-container-low)',
              borderBottom: '1px solid var(--outline-variant)',
              borderRight: '1px solid var(--outline-variant)',
              borderTopLeftRadius: 11,
              fontSize: '0.75rem',
              color: 'var(--on-surface-variant)',
              textAlign: 'center',
              fontWeight: 600,
              boxShadow: '2px 0 6px rgba(0, 0, 0, 0.04)',
            }}
            title={Intl.DateTimeFormat().resolvedOptions().timeZone}
          >
            {formatTimezoneLabel(timeZone)}
          </div>

          {/* Day Headers */}
          {dayScheduleData.map(({ date }, i) => {
            const dayNames = isId
              ? ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN']
              : ['MO', 'TU', 'WED', 'TH', 'FR', 'SAT', 'SUN'];
            const dayIndex = getISODay(date) - 1;
            const today = isToday(date);
            return (
              <div
                key={i}
                ref={viewMode === 'today' && i === 0 ? dayHeaderRef : undefined}
                className="schedule-day-header"
                style={{
                  padding: '0.5rem',
                  background: today ? 'var(--surface-container)' : 'var(--surface-container-low)',
                  borderBottom: '1px solid var(--outline-variant)',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--outline-variant)',
                  borderTopRightRadius: i === dayScheduleData.length - 1 ? 11 : 0,
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--on-surface-variant)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {dayNames[dayIndex] || 'DAY'}
                </div>
                <div
                  className="tabular-nums"
                  style={{
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
                  }}
                >
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

          {/* Time Grid Body */}
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'grid',
              gridTemplateColumns:
                viewMode === 'today'
                  ? '70px 1fr'
                  : `70px repeat(${displayDays.length}, minmax(130px, 1fr))`,
              position: 'relative',
            }}
          >
            {/* Hour labels */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 20,
                background: 'var(--surface-container-lowest)',
                borderRight: '1px solid var(--outline-variant)',
                borderBottomLeftRadius: 11,
                boxShadow: '2px 0 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              {hours.map((h, hIdx) => (
                <div
                  key={h}
                  className="tabular-nums"
                  style={{
                    height: 60,
                    borderBottom:
                      hIdx === hours.length - 1 ? 'none' : '1px solid var(--outline-variant)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '0.25rem',
                    fontSize: '0.75rem',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  {isId
                    ? `${String(h).padStart(2, '0')}:00`
                    : h === 12
                      ? '12:00 PM'
                      : h > 12
                        ? `${h - 12}:00 PM`
                        : `${h}:00 AM`}
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
                  {isToday(date) &&
                    (() => {
                      const now = new Date();
                      const pos = timeToGridPosition(
                        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                        gridStart,
                        GRID_END + 1
                      );
                      if (pos >= 0 && pos <= 100) {
                        return (
                          <div
                            ref={currentTimeRef}
                            style={{
                              position: 'absolute',
                              top: `${pos}%`,
                              left: -5,
                              right: 0,
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: 'var(--error)',
                              }}
                            />
                            <div
                              style={{
                                flex: 1,
                                height: 2,
                                background: 'var(--error)',
                              }}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}

                  {/* Timetable blocks */}
                  {getLayoutBlocksForDay(daySessions, dayEvents, gridStart, courseMap).map(
                    (block, blockIdx) => (
                      <ScheduleGridBlock
                        key={block.id}
                        block={block}
                        blockIdx={blockIdx}
                        date={date}
                        isId={isId}
                        searchQuery={searchQuery}
                        hasDraggedRef={hasDraggedRef}
                        firstActivityRef={isToday(date) ? firstActivityRef : { current: null }}
                        onSelectBlock={onSelectBlock}
                        onSelectEvent={onSelectEvent}
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
