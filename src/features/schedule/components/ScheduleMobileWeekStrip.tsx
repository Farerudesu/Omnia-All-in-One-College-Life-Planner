import { getISODay, toDateString, isToday } from '@/lib/dateUtils';

interface ScheduleMobileWeekStripProps {
  isId: boolean;
  weekDates: Date[];
  currentDate: Date;
  viewMode: 'today' | 'week';
  setCurrentDate: (date: Date) => void;
  scrollToDay: (dayIdx: number) => void;
}

export function ScheduleMobileWeekStrip({
  isId,
  weekDates,
  currentDate,
  viewMode,
  setCurrentDate,
  scrollToDay,
}: ScheduleMobileWeekStripProps) {
  return (
    <div
      className="show-mobile schedule-week-nav-bar"
      style={{
        padding: '0.45rem 0.5rem',
        background: 'var(--surface-container-lowest)',
        borderBottom: '1px solid var(--outline-variant)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {weekDates.map((date, idx) => {
          const dayNames = isId
            ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const dayIdx = getISODay(date) - 1;
          const isSelected = toDateString(date) === toDateString(currentDate);
          const isCurrentToday = isToday(date);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (viewMode === 'today') {
                  setCurrentDate(date);
                } else {
                  scrollToDay(idx);
                  setCurrentDate(date);
                }
              }}
              style={{
                width: '100%',
                minWidth: 0,
                padding: '0.4rem 0.1rem',
                borderRadius: 8,
                border: isSelected
                  ? '1.5px solid var(--primary)'
                  : '1px solid var(--outline-variant)',
                background: isSelected
                  ? 'var(--primary)'
                  : isCurrentToday
                    ? 'var(--surface-container-high)'
                    : 'var(--surface-container-low)',
                color: isSelected ? 'var(--on-primary)' : 'var(--on-surface)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', opacity: isSelected ? 0.95 : 0.7, letterSpacing: '-0.01em', lineHeight: 1 }}>
                {dayNames[dayIdx] || 'DAY'}
              </span>
              <span className="tabular-nums" style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.1, marginTop: '2px' }}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
