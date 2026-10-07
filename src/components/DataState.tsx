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
    return <div role="status" aria-live="polite" style={{     minHeight: '12rem', padding: '3rem 1rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
      Loading {loadingTables.join(', ')}…
    </div>;
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