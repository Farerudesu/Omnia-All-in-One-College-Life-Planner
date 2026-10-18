import type { Course, ClassSession, SessionException, CalendarEvent, CategoryShape } from '@/types';
import type { SelectedClassBlock } from '../types';
import { formatTime12 } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import { getClassBadges, scheduleItemHasPassed } from '../utils/scheduleUtils';
import * as ds from '@/lib/dataService';
import { NextClassHeroCard } from './NextClassHeroCard';
import { StudyGapCard } from './StudyGapCard';

export interface NextClassInfo {
  session: ClassSession;
  course: Course;
  date: Date;
  exception?: SessionException;
  startTime: string;
  endTime: string;
  room: string;
  minutesUntil: number;
}

export interface TodaySessionItem {
  session: ClassSession;
  exception?: SessionException;
}

export interface StudyGapInfo {
  hours: number;
  before: string;
  after: string;
}

export interface WeeklyLoadInfo {
  hours: number;
  pace: string;
}

interface ScheduleRightPanelProps {
  nextClass: NextClassInfo | null;
  todaySessions: TodaySessionItem[];
  todayEvents: CalendarEvent[];
  courseMap: Map<string, Course>;
  studyGap: StudyGapInfo | null;
  podReservation: ds.PodReservation | null;
  weeklyLoad: WeeklyLoadInfo;
  lang: 'en' | 'id';
  onSelectBlock: (block: SelectedClassBlock) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function ScheduleRightPanel({
  nextClass,
  todaySessions,
  todayEvents,
  courseMap,
  studyGap,
  podReservation,
  weeklyLoad,
  lang,
  onSelectBlock,
  onSelectEvent,
}: ScheduleRightPanelProps) {
  const isId = lang === 'id';

  return (
    <div
      style={{
        width: 320,
        borderLeft: '1px solid var(--outline-variant)',
        padding: '0',
        flexShrink: 0,
        overflowY: 'auto',
        maxHeight: 'calc(100dvh - 60px)',
      }}
      className="hidden-mobile"
    >
      {nextClass && (
        <NextClassHeroCard
          nextClass={nextClass}
          lang={lang}
          onSelectBlock={onSelectBlock}
        />
      )}

      {/* Today's Schedule */}
      <div style={{ display: 'none', padding: '0 1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface)" strokeWidth="2" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Jadwal hari ini</h3>
          </div>
          <span
            className="tabular-nums"
            style={{
              fontSize: '0.75rem',
              color: 'var(--on-surface-variant)',
            }}
          >
            {todaySessions.length} kelas
            {todayEvents.length > 0 ? ` · ${todayEvents.length} acara` : ''}
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
              onClick={() =>
                onSelectBlock({
                  session,
                  course,
                  date: new Date(),
                  exception,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBlock({
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
                  <span
                    className="badge"
                    style={{
                      background: `color-mix(in srgb, ${course.color} 15%, transparent)`,
                      color: course.color,
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                    }}
                  >
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
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--on-surface-variant)',
                  marginTop: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <span>{room}</span>
                {course.professor && <span>{course.professor}</span>}
              </div>
              {(() => {
                const badges = getClassBadges(session, course, exception, isId);
                if (badges.length === 0) return null;
                return (
                  <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {badges.map((b) => (
                      <span
                        key={b.key}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          color: b.color,
                          background: b.bg,
                          padding: '0.08rem 0.3rem',
                          borderRadius: 4,
                        }}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })}

        {todayEvents.map((ev) => {
          const shape: CategoryShape =
            ev.type === 'class' ? 'square' : ev.type === 'personal' ? 'circle' : ev.type === 'exam' ? 'diamond' : 'outline-square';
          const color =
            ev.color ||
            (ev.type === 'class'
              ? 'var(--classes)'
              : ev.type === 'personal'
                ? 'var(--personal)'
                : ev.type === 'exam'
                  ? 'var(--exams)'
                  : 'var(--deadlines)');
          const isPast = scheduleItemHasPassed(new Date(), ev.endTime || ev.startTime);

          return (
            <div
              key={ev.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectEvent(ev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectEvent(ev);
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
                  <span
                    className="badge"
                    style={{
                      background: `color-mix(in srgb, ${color} 15%, transparent)`,
                      color: color,
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                      textTransform: 'capitalize',
                    }}
                  >
                    {ev.type}
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                    {ev.title}
                  </span>
                </div>
                {ev.startTime && (
                  <span className="tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                    {formatTime12(ev.startTime)}
                    {ev.endTime ? ` – ${formatTime12(ev.endTime)}` : ''}
                  </span>
                )}
              </div>
              {ev.notes && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--on-surface-variant)',
                    marginTop: '0.25rem',
                  }}
                >
                  {ev.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {studyGap && <StudyGapCard studyGap={studyGap} podReservation={podReservation} />}

      {/* Weekly Load Overview */}
      <div className="card" style={{ margin: '0.75rem 1rem', padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--surface-container-high)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <h4 style={{ fontSize: '0.9375rem' }}>Ringkasan beban mingguan</h4>
            <p className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {weeklyLoad.hours.toFixed(1)} jam kuliah · {weeklyLoad.pace === 'Balanced pace' ? 'Beban seimbang' : 'Beban tinggi'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
