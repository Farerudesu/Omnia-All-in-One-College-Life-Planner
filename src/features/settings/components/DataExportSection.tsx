import type { Language } from '@/lib/i18n';

interface DataExportSectionProps {
  language: Language;
  handleExportICS: () => void;
  handleExportCoursesCSV: () => void;
}

export function DataExportSection({
  language,
  handleExportICS,
  handleExportCoursesCSV,
}: DataExportSectionProps) {
  const isId = language === 'id';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface)" strokeWidth="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <h3 style={{ fontSize: '1.125rem' }}>{isId ? 'Data & Ekspor' : 'Data & export'}</h3>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
        {isId ? 'Ekspor portabel dan status sinkronisasi.' : 'Portable exports and sync status.'}
      </p>

      <div
        style={{
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-container)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {isId ? 'Sinkronisasi cloud aktif' : 'Cloud sync active'}
          </div>
          <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {isId ? 'Terakhir disinkronkan hari ini' : 'Last synced today'}
          </div>
        </div>
        <button type="button" className="btn-ghost" style={{ fontSize: '0.75rem' }}>
          {isId ? 'Sinkronkan sekarang' : 'Sync now'}
        </button>
      </div>

      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {isId ? 'Ekspor jadwal perkuliahan' : 'Export current timetable'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <button
          type="button"
          className="btn-outline"
          onClick={handleExportICS}
          title={isId ? 'Unduh file .ics standar untuk kalender' : 'Download standard .ics file for Apple Calendar or Google Calendar'}
          style={{ justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M8 2v4M16 2v4" />
            </svg>
            iCalendar (.ics file)
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={handleExportCoursesCSV}
          title={isId ? 'Unduh kurikulum sebagai file spreadsheet CSV' : 'Download curriculum timetable as a CSV spreadsheet'}
          style={{ justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Spreadsheet (CSV file)
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
