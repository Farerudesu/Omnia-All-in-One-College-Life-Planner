import { RefreshCw } from 'lucide-react';
import { getMonthName, formatDateLong } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import { VIEW_MODES } from '../types';
import type { ViewMode, CalendarSearchResult, CalendarItem } from '../types';

interface CalendarToolbarProps {
  lang: 'id' | 'en';
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  year: number;
  month: number;
  prevPeriod: () => void;
  nextPeriod: () => void;
  goToToday: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: CalendarSearchResult[];
  isGcalSyncing: boolean;
  isGcalConnected: boolean;
  handleGoogleCalendarSync: () => void;
  handleItemClick: (item: CalendarItem) => void;
}

export function CalendarToolbar({
  lang,
  viewMode,
  setViewMode,
  selectedDate,
  setSelectedDate,
  currentDate: _currentDate,
  setCurrentDate,
  year,
  month,
  prevPeriod,
  nextPeriod,
  goToToday,
  searchQuery,
  setSearchQuery,
  searchResults,
  isGcalSyncing,
  isGcalConnected,
  handleGoogleCalendarSync,
  handleItemClick,
}: CalendarToolbarProps) {
  return (
    <div
      className="calendar-toolbar"
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
        <button
          className="btn-ghost min-touch-target"
          onClick={prevPeriod}
          aria-label={lang === 'id' ? 'Periode sebelumnya' : 'Previous period'}
          style={{ width: 34, height: 34, padding: 0 }}
        >
          ‹
        </button>
        <button
          className="btn-ghost"
          onClick={goToToday}
          style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0.25rem 0.5rem' }}
        >
          {lang === 'id' ? 'Hari Ini' : 'Today'}
        </button>
        <button
          className="btn-ghost min-touch-target"
          onClick={nextPeriod}
          aria-label={lang === 'id' ? 'Periode berikutnya' : 'Next period'}
          style={{ width: 34, height: 34, padding: 0 }}
        >
          ›
        </button>

        <span
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.125rem',
            fontWeight: 700,
            marginLeft: '0.25rem',
          }}
        >
          {viewMode === 'Day' && selectedDate
            ? formatDateLong(selectedDate)
            : `${getMonthName(month)} ${year}`}
        </span>
      </div>

      {/* Search Bar with auto-suggest dropdown & View Mode Switcher */}
      <div
        className="calendar-toolbar-controls"
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <div
          className="calendar-view-modes"
          style={{
            display: 'flex',
            background: 'var(--surface-container)',
            borderRadius: 8,
            overflow: 'hidden',
            marginRight: '0.5rem',
          }}
        >
          {VIEW_MODES.map((v) => {
            const label =
              lang === 'id'
                ? v === 'Day'
                  ? 'Hari'
                  : v === 'Week'
                    ? 'Minggu'
                    : v === 'Month'
                      ? 'Bulan'
                      : 'Agenda'
                : v;
            return (
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
                {label}
              </button>
            );
          })}
        </div>

        <div className="calendar-search" style={{ position: 'relative' }}>
          <input
            id="calendar-search"
            className="calendar-search-input"
            type="text"
            placeholder={
              lang === 'id' ? 'Cari kegiatan, ujian, matkul…' : 'Search events, exams, courses…'
            }
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
          type="button"
          className="btn-outline calendar-gcal-sync"
          onClick={handleGoogleCalendarSync}
          disabled={isGcalSyncing}
          title={
            isGcalConnected
              ? lang === 'id'
                ? 'Sinkronkan dengan Google Calendar'
                : 'Sync with Google Calendar'
              : lang === 'id'
                ? 'Hubungkan Google Calendar'
                : 'Connect Google Calendar'
          }
          style={{
            padding: '0.45rem 0.75rem',
            fontSize: '0.8125rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            borderRadius: 'var(--radius-sm)',
            borderColor: isGcalConnected ? 'var(--primary)' : 'var(--outline-variant)',
            color: isGcalConnected ? 'var(--primary)' : 'var(--on-surface-variant)',
            cursor: isGcalSyncing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw
            size={13}
            style={{
              animation: isGcalSyncing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isGcalSyncing ? (lang === 'id' ? 'Sinkron…' : 'Syncing…') : 'Google Cal'}</span>
        </button>

        <button
          className="btn-primary calendar-add-event"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('open-quick-add', { detail: 'event' }))
          }
          style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem' }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {lang === 'id' ? 'Tambah acara' : 'Add event'}
        </button>

        {/* Search Results Dropdown */}
        {searchQuery.trim() && (
          <div
            className="calendar-search-results"
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
              className="calendar-month-grid"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--on-surface-variant)',
                padding: '0.375rem 0.5rem',
                letterSpacing: '0.04em',
              }}
            >
              {searchResults.length}{' '}
              {lang === 'id'
                ? 'hasil ditemukan'
                : `Match${searchResults.length !== 1 ? 'es' : ''} found`}
            </div>
            {searchResults.length === 0 ? (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontSize: '0.8125rem',
                  color: 'var(--on-surface-variant)',
                }}
              >
                {lang === 'id'
                  ? `Tidak ada acara atau mata kuliah sesuai "${searchQuery}"`
                  : `No events or courses matching “${searchQuery}”`}
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
                    handleItemClick(item);
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
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        color: 'var(--on-surface)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
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
  );
}
