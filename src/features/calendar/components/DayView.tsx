import { formatDateLong, formatTime12 } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import { safeMixWithSurface, safeAlphaColor } from '@/lib/colorMix';
import type { CalendarItem } from '../types';

interface DayViewProps {
  lang: 'id' | 'en';
  selectedDate: Date | null;
  selectedItems: CalendarItem[];
  onOpenAddEvent: () => void;
  handleItemClick: (item: CalendarItem) => void;
}

export function DayView({
  lang,
  selectedDate,
  selectedItems,
  onOpenAddEvent,
  handleItemClick,
}: DayViewProps) {
  const isId = lang === 'id';

  return (
    <div
      style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: 12,
        border: '1px solid var(--outline-variant)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {selectedDate ? formatDateLong(selectedDate) : isId ? 'Hari Ini' : 'Today'}
          </h2>
          <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            {selectedItems.length}{' '}
            {isId ? 'kegiatan terjadwal' : `item${selectedItems.length !== 1 ? 's' : ''} scheduled`}
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={onOpenAddEvent}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {isId ? 'Tambah acara untuk hari ini' : 'Add event for this day'}
        </button>
      </div>

      {selectedItems.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--on-surface-variant)' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☕</div>
          <div style={{ fontWeight: 600 }}>
            {isId ? 'Hari bebas tanpa jadwal' : 'Completely free day'}
          </div>
          <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {isId ? 'Tidak ada kegiatan untuk tanggal ini.' : 'Nothing scheduled for this date.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {selectedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 8,
                backgroundColor: 'var(--surface-container-low)',
                background: safeMixWithSurface(item.color, 8, 'var(--surface-container-low)'),
                border: `1px solid ${safeAlphaColor(item.color, 0.22, 'var(--outline-variant)')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: item.rawEvent ? 'pointer' : 'default',
                filter: item.isPast ? 'grayscale(1)' : undefined,
                opacity: item.isPast ? 0.58 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CategoryIndicator shape={item.shape} color={item.color} size={10} />
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--on-surface-variant)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {item.time && (
                      <span className="tabular-nums">
                        {formatTime12(item.time)}
                        {item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
                      </span>
                    )}
                    {item.room && <span>{item.room}</span>}
                    {item.notes && <span>{item.notes}</span>}
                  </div>
                </div>
              </div>

              {item.type !== 'classes' && item.type !== 'class' && (
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--surface-container-high)',
                    background: safeAlphaColor(item.color, 0.15, 'var(--primary-container)'),
                    color: item.color,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.type === 'exam'
                    ? isId
                      ? 'Ujian'
                      : 'Exam'
                    : item.type === 'deadline'
                      ? isId
                        ? 'Tenggat'
                        : 'Deadline'
                      : item.type === 'personal'
                        ? isId
                          ? 'Pribadi'
                          : 'Personal'
                        : item.type === 'lab'
                          ? isId
                            ? 'Praktikum'
                            : 'Lab'
                          : item.type}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
