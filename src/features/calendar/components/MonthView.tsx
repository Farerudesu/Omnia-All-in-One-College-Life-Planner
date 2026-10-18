import React from 'react';
import { isToday, isSameDay, formatDateLong } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import type { CalendarItem, QuickActionMenuState } from '../types';

interface MonthViewProps {
  lang: 'id' | 'en';
  month: number;
  monthGrid: Date[];
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
  setViewMode: (v: 'Day' | 'Week' | 'Month' | 'Agenda') => void;
  searchQuery: string;
  getItemsForDate: (d: Date) => CalendarItem[];
  handleItemClick: (item: CalendarItem) => void;
  detailPanelRef: React.RefObject<HTMLDivElement | null>;
  quickActionMenu: QuickActionMenuState | null;
  setQuickActionMenu: React.Dispatch<React.SetStateAction<QuickActionMenuState | null>>;
  closeQuickActionMenu: () => void;
}

export function MonthView({
  lang,
  month,
  monthGrid,
  selectedDate,
  setSelectedDate,
  setViewMode,
  searchQuery,
  getItemsForDate,
  handleItemClick,
  detailPanelRef,
  quickActionMenu,
  setQuickActionMenu,
  closeQuickActionMenu,
}: MonthViewProps) {
  const isId = lang === 'id';
  const dayNames = isId
    ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {dayNames.map((d) => (
        <div
          key={d}
          style={{
            padding: '0.625rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--on-surface-variant)',
            textAlign: 'center',
            background: 'var(--surface-container-low)',
            borderBottom: '1px solid var(--outline-variant)',
          }}
        >
          {d}
        </div>
      ))}

      {monthGrid.map((date, i) => {
        const isCurrentMonth = date.getMonth() === month;
        const today = isToday(date);
        const selected = selectedDate && isSameDay(date, selectedDate);
        const items = getItemsForDate(date);
        const isMatchingSearch =
          searchQuery.trim() &&
          items.some(
            (it) =>
              it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              it.notes?.toLowerCase().includes(searchQuery.toLowerCase())
          );

        return (
          <div
            key={i}
            className="calendar-month-cell"
            role="button"
            tabIndex={0}
            aria-label={`View ${formatDateLong(date)}`}
            onClick={() => {
              setSelectedDate(date);
              if (typeof window !== 'undefined' && window.innerWidth <= 819) {
                setTimeout(() => {
                  detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSelectedDate(date);
                if (typeof window !== 'undefined' && window.innerWidth <= 819) {
                  setTimeout(() => {
                    detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 60);
                }
              }
            }}
            style={{
              minHeight: 92,
              padding: '0.375rem 0.5rem',
              borderBottom: i < 35 ? '1px solid var(--outline-variant)' : undefined,
              borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--outline-variant)' : undefined,
              background: selected
                ? 'var(--surface-container-high)'
                : isMatchingSearch
                  ? 'color-mix(in srgb, var(--primary) 12%, var(--surface-container-lowest))'
                  : today
                    ? 'color-mix(in srgb, var(--primary) 6%, var(--surface-container-lowest))'
                    : 'var(--surface-container-lowest)',
              outline: selected ? '2px solid var(--primary)' : undefined,
              outlineOffset: -2,
              cursor: 'pointer',
              transition: 'background 0.15s, outline 0.15s',
              opacity: isCurrentMonth ? 1 : 0.45,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                marginBottom: '0.25rem',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: today ? 24 : 'auto',
                  height: today ? 24 : 'auto',
                  borderRadius: today ? '50%' : 0,
                  background: today ? 'var(--primary)' : 'transparent',
                  color: today ? 'var(--on-primary)' : 'var(--on-surface)',
                  fontSize: '0.8125rem',
                  fontWeight: today ? 700 : 500,
                }}
              >
                {date.getDate()}
              </span>
              {today && (
                <span
                  className="calendar-month-today"
                  style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  {isId ? 'Hari Ini' : 'Today'}
                </span>
              )}
            </div>

            <div
              className="calendar-month-cell-items"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}
            >
              {items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="group relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (quickActionMenu?.id === item.id) {
                      closeQuickActionMenu();
                    } else {
                      setQuickActionMenu({
                        id: item.id,
                        originX: e.clientX,
                        originY: e.clientY,
                        item,
                        date,
                        isExiting: false,
                      });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.25rem',
                    fontSize: '0.6875rem',
                    lineHeight: 1.2,
                    padding: '0.1rem 0.2rem',
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      filter: !selected && item.isPast ? 'grayscale(1)' : undefined,
                      opacity: !selected && item.isPast ? 0.58 : 1,
                    }}
                  >
                    <CategoryIndicator shape={item.shape} color={item.color} size={7} />
                    <span
                      className="calendar-month-event-label"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: 'var(--on-surface)',
                      }}
                    >
                      {item.title}
                    </span>
                  </div>

                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all min-touch-target"
                    style={{
                      flexShrink: 0,
                      color: 'var(--on-surface-variant)',
                      background: 'transparent',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (quickActionMenu?.id === item.id) {
                        closeQuickActionMenu();
                      } else {
                        const target = e.currentTarget.getBoundingClientRect();
                        setQuickActionMenu({
                          id: item.id,
                          originX: target.right,
                          originY: target.top,
                          item,
                          date,
                          isExiting: false,
                        });
                      }
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                </div>
              ))}
              {items.length > 3 && (
                <button
                  type="button"
                  className="calendar-month-overflow min-touch-target"
                  onClick={() => {
                    setSelectedDate(date);
                    setViewMode('Agenda');
                  }}
                  style={{
                    fontSize: '0.625rem',
                    color: 'var(--on-surface-variant)',
                    fontWeight: 600,
                    padding: '0.5rem',
                    background: 'none',
                    border: 0,
                    textAlign: 'left',
                  }}
                >
                  +{items.length - 3} {isId ? 'lainnya' : 'more'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
