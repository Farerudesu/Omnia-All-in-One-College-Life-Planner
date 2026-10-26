import { formatDateLong, formatTime12, isToday } from '@/lib/dateUtils';
import { safeMixWithSurface, safeAlphaColor } from '@/lib/colorMix';
import type { CalendarItem } from '../types';

interface AgendaViewProps {
  lang: 'id' | 'en';
  agendaDates: Array<{ date: Date; dateStr: string; items: CalendarItem[] }>;
  handleItemClick: (item: CalendarItem) => void;
}

export function AgendaView({ lang, agendaDates, handleItemClick }: AgendaViewProps) {
  const isId = lang === 'id';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {agendaDates.map(({ date, dateStr, items }) => (
        <div
          key={dateStr}
          className="card calendar-agenda-card"
          style={{
            background: 'var(--surface-container-lowest)',
            borderRadius: 14,
            border: '1px solid var(--outline-variant)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--outline-variant)',
              paddingBottom: '0.625rem',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: isToday(date) ? 'var(--primary)' : 'var(--on-surface)',
                }}
              >
                {formatDateLong(date)}
              </span>
              {isToday(date) && (
                <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                  {isId ? 'Hari Ini' : 'Today'}
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {items.length} {isId ? 'kegiatan' : `item${items.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {items.map((item) => (
              <div
                key={item.id}
                className="calendar-agenda-item"
                onClick={() => handleItemClick(item)}
                style={{
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-container-low)',
                  background: safeMixWithSurface(item.color, 8, 'var(--surface-container-low)'),
                  borderLeft: `4px solid ${item.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: item.rawEvent ? 'pointer' : 'default',
                  filter: item.isPast ? 'grayscale(1)' : undefined,
                  opacity: item.isPast ? 0.58 : 1,
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface)' }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--on-surface-variant)',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      {item.time ? formatTime12(item.time) : isId ? 'Sepanjang hari' : 'All day'}
                    </span>
                    {item.room && (
                      <span
                        style={{
                          background: 'var(--surface-container)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        {item.room}
                      </span>
                    )}
                    {item.notes && <span>{item.notes}</span>}
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
                      fontSize: '0.6875rem',
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
        </div>
      ))}
    </div>
  );
}
