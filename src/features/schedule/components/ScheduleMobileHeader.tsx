import { Share2 } from 'lucide-react';
import { getMonthName, getDayName, isToday } from '@/lib/dateUtils';
import { translations } from '@/lib/i18n';

interface ScheduleMobileHeaderProps {
  lang: 'id' | 'en';
  currentDate: Date;
  mondayDate?: Date;
  viewMode: 'today' | 'week';
  setViewMode: (mode: 'today' | 'week') => void;
  prevPeriod: () => void;
  nextPeriod: () => void;
  goToToday: () => void;
  onOpenAddClass: () => void;
  onOpenShare: () => void;
}

export function ScheduleMobileHeader({
  lang,
  currentDate,
  mondayDate,
  viewMode,
  setViewMode,
  prevPeriod,
  nextPeriod,
  goToToday,
  onOpenAddClass,
  onOpenShare,
}: ScheduleMobileHeaderProps) {
  const t = translations[lang];
  const isId = lang === 'id';

  return (
    <div className="show-mobile schedule-mobile-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
          <button
            type="button"
            className="btn-ghost min-touch-target"
            onClick={prevPeriod}
            aria-label={viewMode === 'today' ? 'Previous day' : 'Previous week'}
            style={{ width: 30, height: 30, padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span
            className="tabular-nums"
            style={{ fontSize: '0.875rem', fontWeight: 700, padding: '0 0.125rem', whiteSpace: 'nowrap', color: 'var(--on-surface)' }}
          >
            {viewMode === 'today'
              ? `${currentDate.getDate()} ${getMonthName(currentDate.getMonth(), true)}`
              : (mondayDate ? `${mondayDate.getDate()} ${getMonthName(mondayDate.getMonth(), true)}` : '')}
          </span>
          <button
            type="button"
            className="btn-ghost min-touch-target"
            onClick={nextPeriod}
            aria-label={viewMode === 'today' ? 'Next day' : 'Next week'}
            style={{ width: 30, height: 30, padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          {!isToday(currentDate) && (
            <button
              type="button"
              className="chip"
              onClick={goToToday}
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', marginLeft: '0.125rem', height: 'auto', flexShrink: 0 }}
            >
              {t.common.today}
            </button>
          )}
          <div style={{ marginLeft: '0.375rem', minWidth: 0 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {viewMode === 'today' ? getDayName(currentDate) : (isId ? 'Mingguan' : 'Weekly')}
            </div>
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
          onClick={onOpenAddClass}
          style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', padding: '0.45rem 0.5rem', minHeight: 36, borderRadius: 10 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {isId ? 'Tambah kelas' : 'Add class'}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => window.dispatchEvent(new CustomEvent('open-quick-add', { detail: 'event' }))}
          style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', padding: '0.45rem 0.5rem', minHeight: 36, borderRadius: 10 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {isId ? 'Tambah acara' : 'Add event'}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={onOpenShare}
          aria-label="Share schedule"
          style={{ padding: '0.45rem 0.625rem', minHeight: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Share2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
