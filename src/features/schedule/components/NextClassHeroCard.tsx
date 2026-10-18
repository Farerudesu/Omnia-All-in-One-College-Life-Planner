import type { NextClassInfo } from './ScheduleRightPanel';
import type { SelectedClassBlock } from '../types';
import { formatTime12, durationMinutes } from '@/lib/dateUtils';
import { getUpcomingBadgeText, getClassBadges } from '../utils/scheduleUtils';

interface NextClassHeroCardProps {
  nextClass: NextClassInfo;
  lang: 'en' | 'id';
  onSelectBlock: (block: SelectedClassBlock) => void;
}

export function NextClassHeroCard({ nextClass, lang, onSelectBlock }: NextClassHeroCardProps) {
  const isId = lang === 'id';

  return (
    <div
      style={{
        margin: '1rem',
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--on-surface-variant)',
            letterSpacing: '0.01em',
          }}
        >
          {getUpcomingBadgeText(nextClass.date, nextClass.minutesUntil, lang)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: nextClass.course.color || 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            {nextClass.course.code}
          </span>
          {getClassBadges(nextClass.session, nextClass.course, nextClass.exception, isId).map(
            (b) => (
              <span
                key={b.key}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  color: b.color,
                  background: b.bg,
                  padding: '0.1rem 0.35rem',
                  borderRadius: 4,
                }}
              >
                {b.label}
              </span>
            )
          )}
        </div>
      </div>

      <h3
        style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: 'var(--on-surface)',
        }}
      >
        {nextClass.course.name}
      </h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <span
          className="tabular-nums"
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            color: 'var(--primary)',
          }}
        >
          {formatTime12(nextClass.startTime)}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
          – {formatTime12(nextClass.endTime)} (
          {durationMinutes(nextClass.startTime, nextClass.endTime)} min)
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          fontSize: '0.8125rem',
          color: 'var(--on-surface-variant)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
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
        onClick={() =>
          onSelectBlock({
            session: nextClass.session,
            course: nextClass.course,
            date: nextClass.date,
            exception: nextClass.exception,
          })
        }
        style={{
          marginTop: '1rem',
          width: '100%',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {isId ? 'Ubah kelas' : 'Change class'}
      </button>
    </div>
  );
}
