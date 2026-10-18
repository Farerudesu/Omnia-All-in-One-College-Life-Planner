import type { ReactNode } from 'react';
import type { ExceptionType } from '@/types';

interface ClassExceptionsPickerProps {
  excType: ExceptionType | '';
  isOnline: boolean;
  isId: boolean;
  onSelectException: (type: ExceptionType) => void;
  onToggleOnline: () => void;
}

export function ClassExceptionsPicker({
  excType,
  isOnline,
  isId,
  onSelectException,
  onToggleOnline,
}: ClassExceptionsPickerProps) {
  const excTypes: { type: ExceptionType; label: string; icon: ReactNode }[] = [
    { type: 'cancelled', label: isId ? 'Batal' : 'Cancel', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
    { type: 'moved', label: isId ? 'Pindah Jam' : 'Move', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { type: 'online', label: 'Online', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
    { type: 'extra', label: isId ? 'Kelas Tambahan' : 'Extra class', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { type: 'attended', label: isId ? 'Masuk' : 'Attended', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 12 10 17 19 7"/></svg> },
    { type: 'no-class', label: isId ? 'Libur Hari Ini' : 'No class today', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
      {excTypes.map((et) => {
        const isActive = excType === et.type;
        const isOnlineCard = et.type === 'online';
        const isHighlighted = isActive || (isOnlineCard && isOnline);

        return (
          <button
            key={et.type}
            type="button"
            className="card min-touch-target"
            onClick={() => {
              if (isOnlineCard) {
                onToggleOnline();
              } else {
                onSelectException(et.type);
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.75rem',
              cursor: 'pointer',
              border: isHighlighted ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
              background: isHighlighted ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{et.icon}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{et.label}</span>
          </button>
        );
      })}
    </div>
  );
}
