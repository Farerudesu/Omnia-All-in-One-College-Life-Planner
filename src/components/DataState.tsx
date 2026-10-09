import { RefreshCw } from 'lucide-react';
import { refreshUserData } from '../lib/dataService';
import { useDataStatus } from '../lib/useData';

const tableLabels: Record<string, string> = {
  transactions: 'transactions',
  classes: 'classes',
  events: 'events',
  assignments: 'assignments',
  profiles: 'profile',
  user_settings: 'settings',
};

export function DataState() {
  const status = useDataStatus();
  const loadingTables = Object.entries(status).filter(([, state]) => state.loading).map(([table]) => tableLabels[table]);
  const failedTables = Object.entries(status).filter(([, state]) => state.error).map(([table, state]) => ({
    table: tableLabels[table],
    error: state.error,
  }));

  if (loadingTables.length > 0) {
    const skeletonBar = (width: string) => (
      <div aria-hidden="true" style={{ height: 14, width, borderRadius: 7, background: 'var(--surface-container-high)', animation: 'omnia-skeleton 1.4s ease-in-out infinite' }} />
    );
    return (
      <div role="status" aria-live="polite" aria-label="Memuat data" style={{ minHeight: 'calc(100vh - 5rem)', width: '100%', boxSizing: 'border-box', padding: 'clamp(1.5rem, 5vw, 3rem)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {skeletonBar('32%')}
        <div style={{ height: 56, borderRadius: 10, background: 'var(--surface-container)', animation: 'omnia-skeleton 1.4s ease-in-out infinite' }} aria-hidden="true" />
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} style={{ height: index === 0 ? 56 : 42, width: index % 3 === 0 ? '96%' : index % 3 === 1 ? '82%' : '68%', borderRadius: 8, background: 'var(--surface-container)', animation: 'omnia-skeleton 1.4s ease-in-out infinite', animationDelay: `${index * 60}ms` }} aria-hidden="true" />
        ))}
        <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
          Memuat {loadingTables.join(', ')}…
        </span>
      </div>
    );
  }

  if (failedTables.length > 0) {
    return (
      <div role="alert" style={{ margin: '0.75rem 1.5rem', padding: '0.75rem 1rem', border: '1px solid var(--error-container)', borderRadius: 'var(--radius-sm)', color: 'var(--on-error-container)', background: 'var(--error-container)', fontSize: '0.8125rem' }}>
        <div>{failedTables.map(({ table, error }) => `${table}: ${error}`).join(' · ')}</div>
        <button type="button" className="btn-ghost" onClick={() => void refreshUserData()} style={{ marginTop: '0.75rem', color: 'inherit', gap: '0.375rem' }}>
          <RefreshCw size={14} aria-hidden="true" /> Coba lagi
        </button>
      </div>
    );
  }

  return null;
}