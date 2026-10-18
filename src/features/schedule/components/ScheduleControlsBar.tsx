import { Share2 } from 'lucide-react';
import { getMonthName, formatDateShort } from '@/lib/dateUtils';
import { translations } from '@/lib/i18n';

interface ScheduleControlsBarProps {
  lang: 'id' | 'en';
  currentDate: Date;
  mondayDate?: Date;
  viewMode: 'today' | 'week';
  setViewMode: (mode: 'today' | 'week') => void;
  scrollToCurrentTime: () => void;
  onOpenAddClass: () => void;
  onOpenAddEvent: () => void;
  onOpenShare: () => void;
}

export function ScheduleControlsBar({
  lang,
  currentDate,
  mondayDate,
  viewMode,
  setViewMode,
  scrollToCurrentTime,
  onOpenAddClass,
  onOpenAddEvent,
  onOpenShare,
}: ScheduleControlsBarProps) {
  const t = translations[lang];
  const isId = lang === 'id';

  return (
    <div
      className="schedule-controls hidden-mobile"
      style={{
        padding: '1rem 2rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 className="schedule-title tabular-nums" style={{ fontSize: '1.375rem', margin: 0 }}>
          {viewMode === 'today'
            ? (isId ? `Jadwal Hari Ini – ${formatDateShort(currentDate)}` : `Today's Schedule – ${formatDateShort(currentDate)}`)
            : (isId ? `Minggu ${formatDateShort(mondayDate || currentDate)}` : `Week of ${mondayDate ? getMonthName(mondayDate.getMonth(), true) : ''} ${mondayDate ? mondayDate.getDate() : ''}, ${mondayDate ? mondayDate.getFullYear() : ''}`)}
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
          <button
            type="button"
            className="btn-ghost"
            onClick={scrollToCurrentTime}
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              color: 'var(--primary)',
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-low)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title={isId ? 'Gulir ke garis waktu saat ini' : 'Scroll to current time indicator'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {isId ? 'Ke sekarang' : 'To now'}
          </button>
        </div>
      </div>

      <div className="schedule-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn-outline"
          onClick={onOpenShare}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <Share2 size={15} aria-hidden="true" />
          {isId ? 'Bagikan' : 'Share'}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={onOpenAddEvent}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {isId ? 'Tambah acara' : 'Add event'}
        </button>
        <button type="button" className="btn-primary" onClick={onOpenAddClass}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {isId ? 'Tambah kelas' : 'Add class'}
        </button>
      </div>
    </div>
  );
}
