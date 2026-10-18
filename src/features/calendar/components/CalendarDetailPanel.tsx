import React from 'react';
import { formatDateLong, formatTime12 } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import type { CalendarItem } from '../types';

interface CalendarDetailPanelProps {
  lang: 'id' | 'en';
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
  selectedItems: CalendarItem[];
  detailPanelRef: React.RefObject<HTMLDivElement | null>;
  handleItemClick: (item: CalendarItem) => void;
}

export function CalendarDetailPanel({
  lang,
  selectedDate,
  setSelectedDate,
  selectedItems,
  detailPanelRef,
  handleItemClick,
}: CalendarDetailPanelProps) {
  if (!selectedDate) return null;
  const isId = lang === 'id';

  return (
    <div
      ref={detailPanelRef}
      className="calendar-side-panel"
      style={{
        width: 320,
        borderLeft: '1px solid var(--outline-variant)',
        padding: '1.5rem 1rem',
        overflowY: 'auto',
        maxHeight: 'calc(100dvh - 60px)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.0625rem' }}>{formatDateLong(selectedDate)}</h3>
        <button
          onClick={() => setSelectedDate(null)}
          className="btn-ghost min-touch-target"
          style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}
          aria-label={isId ? 'Tutup detail tanggal' : 'Close date details'}
        >
          ✕
        </button>
      </div>

      {selectedItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            border: '1px dashed var(--outline-variant)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-container-low)',
            marginTop: '1rem',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--outline)" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
              {isId ? 'Hari bebas!' : 'A free day!'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              {isId ? 'Tidak ada kegiatan untuk tanggal ini.' : 'Nothing scheduled for this date.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {selectedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              style={{
                padding: '0.875rem 1rem',
                background: `color-mix(in srgb, ${item.color} 5%, var(--surface-container-lowest))`,
                border: `1px solid color-mix(in srgb, ${item.color} 18%, var(--outline-variant))`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                boxShadow: 'var(--shadow-xs)',
                cursor: item.rawEvent ? 'pointer' : 'default',
                filter: item.isPast ? 'grayscale(1)' : undefined,
                opacity: item.isPast ? 0.58 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <CategoryIndicator shape={item.shape} color={item.color} size={8} />
                {item.type !== 'classes' && item.type !== 'class' && (
                  <span
                    className="badge"
                    style={{
                      background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
                      color: item.color,
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                    }}
                  >
                    {item.type === 'exam'
                      ? (isId ? 'Ujian' : 'Exam')
                      : item.type === 'deadline'
                        ? (isId ? 'Tenggat' : 'Deadline')
                        : item.type === 'personal'
                          ? (isId ? 'Pribadi' : 'Personal')
                          : item.type === 'lab'
                            ? (isId ? 'Praktikum' : 'Lab')
                            : item.type}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>{item.title}</div>
              {item.time && (
                <div className="tabular-nums" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', marginTop: '0.375rem' }}>
                  {formatTime12(item.time)}
                  {item.endTime ? ` – ${formatTime12(item.endTime)}` : ''}
                </div>
              )}
              {item.notes && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
