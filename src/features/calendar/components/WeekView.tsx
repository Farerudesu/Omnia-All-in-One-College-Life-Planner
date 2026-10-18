import { isToday, isSameDay, formatTime12 } from '@/lib/dateUtils';
import type { CalendarItem } from '../types';

interface WeekViewProps {
  lang: 'id' | 'en';
  weekDates: Date[];
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
  getItemsForDate: (d: Date) => CalendarItem[];
  handleItemClick: (item: CalendarItem) => void;
}

export function WeekView({
  lang,
  weekDates,
  selectedDate,
  setSelectedDate,
  getItemsForDate,
  handleItemClick,
}: WeekViewProps) {
  const isId = lang === 'id';
  const dayNames = isId
    ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div
      className="calendar-week-scroll"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.75rem',
      }}
    >
      {weekDates.map((dayDate, i) => {
        const today = isToday(dayDate);
        const selected = selectedDate && isSameDay(dayDate, selectedDate);
        const items = getItemsForDate(dayDate);

        return (
          <div
            key={i}
            className="calendar-week-card"
            onClick={() => setSelectedDate(dayDate)}
            style={{
              background: selected
                ? 'var(--surface-container-high)'
                : 'var(--surface-container-lowest)',
              border: today ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
              borderRadius: 10,
              padding: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              minHeight: 380,
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                {dayNames[i]}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: today ? 'var(--primary)' : 'var(--on-surface)',
                }}
              >
                {dayDate.getDate()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  style={{
                    padding: '0.5rem 0.625rem',
                    borderRadius: 6,
                    background: `color-mix(in srgb, ${item.color} 8%, var(--surface-container-low))`,
                    borderLeft: `3px solid ${item.color}`,
                    fontSize: '0.75rem',
                    filter: item.isPast ? 'grayscale(1)' : undefined,
                    opacity: item.isPast ? 0.58 : 1,
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.125rem' }}>
                    {item.title}
                  </div>
                  {item.time && (
                    <div className="tabular-nums" style={{ color: 'var(--on-surface-variant)', fontSize: '0.6875rem' }}>
                      {formatTime12(item.time)}
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: '2rem', textAlign: 'center' }}>
                  {isId ? 'Tidak ada kegiatan' : 'No events'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
