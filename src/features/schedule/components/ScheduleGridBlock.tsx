import React from 'react';
import type { CalendarEvent, CategoryShape } from '@/types';
import type { DayScheduleBlock, SelectedClassBlock } from '../types';
import { formatTime12 } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import { scheduleItemHasPassed, getClassBadges } from '../utils/scheduleUtils';

interface ScheduleGridBlockProps {
  block: DayScheduleBlock;
  blockIdx: number;
  date: Date;
  isId: boolean;
  searchQuery: string;
  hasDraggedRef: React.RefObject<boolean>;
  firstActivityRef: React.RefObject<HTMLDivElement | null>;
  onSelectBlock: (block: SelectedClassBlock) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function ScheduleGridBlock({
  block,
  blockIdx,
  date,
  isId,
  searchQuery,
  hasDraggedRef,
  firstActivityRef,
  onSelectBlock,
  onSelectEvent,
}: ScheduleGridBlockProps) {
  const isMultiCol = block.totalCols > 1;
  const isPast = scheduleItemHasPassed(date, block.endTime);
  const widthPct = 100 / block.totalCols;
  const leftStyle = isMultiCol ? `calc(${block.colIndex * widthPct}% + 1px)` : '2px';
  const widthStyle = isMultiCol ? `calc(${widthPct}% - 2px)` : 'calc(100% - 4px)';

  if (block.kind === 'session' && block.session && block.course) {
    const { session, course, exception, room } = block;
    const isMatch =
      !searchQuery.trim() ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.professor && course.professor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room && room.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div
        key={session.id}
        ref={blockIdx === 0 ? firstActivityRef : undefined}
        className="schedule-item-block"
        role="button"
        tabIndex={0}
        aria-label={`${course.code} ${course.name}, ${formatTime12(block.startTime)} to ${formatTime12(block.endTime)} in ${room}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (hasDraggedRef.current) return;
          onSelectBlock({ session, course, date, exception });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectBlock({ session, course, date, exception });
          }
        }}
        style={{
          position: 'absolute',
          top: `${block.top}%`,
          height: `${block.height}%`,
          left: leftStyle,
          width: widthStyle,
          background: `color-mix(in srgb, ${course.color} 8%, var(--surface-container-lowest))`,
          border: `1px solid color-mix(in srgb, ${course.color} 28%, var(--outline-variant))`,
          borderRadius: 6,
          padding: isMultiCol ? '0.25rem 0.375rem' : '0.375rem 0.5rem',
          cursor: 'pointer',
          overflow: 'hidden',
          fontSize: '0.75rem',
          opacity: (isMatch ? 1 : 0.28) * (isPast ? 0.58 : 1),
          filter: isPast ? 'grayscale(1)' : undefined,
          boxShadow: isMatch && searchQuery.trim() ? '0 0 0 2.5px var(--primary), var(--shadow-sm)' : 'var(--shadow-xs)',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, opacity 0.15s ease',
          zIndex: 5 + block.colIndex,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.zIndex = '30';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.zIndex = String(5 + block.colIndex);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
          <CategoryIndicator shape="square" color={course.color} size={6} />
          <span style={{ fontWeight: 700, fontSize: '0.6875rem', color: course.color, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {course.code}
          </span>
          <span className="tabular-nums" style={{ fontSize: '0.5625rem', color: 'var(--on-surface-variant)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {formatTime12(block.startTime).replace(' AM', '').replace(' PM', '')}–{formatTime12(block.endTime).replace(' AM', '').replace(' PM', '')}
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {course.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', color: 'var(--on-surface-variant)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: '0.625rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room}</span>
        </div>
        {(() => {
          const badges = getClassBadges(session, course, exception, isId);
          if (badges.length === 0) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
              {badges.map((b) => (
                <span
                  key={b.key}
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    color: b.color,
                    background: b.bg,
                    padding: '0.05rem 0.25rem',
                    borderRadius: 4,
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          );
        })()}
        {!isMultiCol && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', color: 'var(--on-surface-variant)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span style={{ fontSize: '0.625rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.professor}</span>
          </div>
        )}
      </div>
    );
  }

  if (block.kind === 'event' && block.event) {
    const ev = block.event;
    const shape: CategoryShape = ev.type === 'class' ? 'square' : ev.type === 'personal' ? 'circle' : ev.type === 'exam' ? 'diamond' : 'outline-square';
    const color = ev.color || (ev.type === 'class' ? 'var(--classes)' : ev.type === 'personal' ? 'var(--personal)' : ev.type === 'exam' ? 'var(--exams)' : 'var(--deadlines)');
    const isMatch =
      !searchQuery.trim() ||
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.notes && ev.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div
        key={ev.id}
        ref={blockIdx === 0 ? firstActivityRef : undefined}
        className="schedule-item-block"
        role="button"
        tabIndex={0}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          if (hasDraggedRef.current) return;
          onSelectEvent(ev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectEvent(ev);
          }
        }}
        style={{
          position: 'absolute',
          top: `${block.top}%`,
          height: `${block.height}%`,
          left: leftStyle,
          width: widthStyle,
          background: `color-mix(in srgb, ${color} 8%, var(--surface-container-lowest))`,
          border: `1px solid color-mix(in srgb, ${color} 28%, var(--outline-variant))`,
          borderRadius: 6,
          padding: isMultiCol ? '0.25rem 0.375rem' : '0.25rem 0.5rem',
          overflow: 'hidden',
          fontSize: '0.75rem',
          cursor: 'pointer',
          opacity: (isMatch ? 1 : 0.28) * (isPast ? 0.58 : 1),
          filter: isPast ? 'grayscale(1)' : undefined,
          boxShadow: isMatch && searchQuery.trim() ? '0 0 0 2.5px var(--primary), var(--shadow-sm)' : 'var(--shadow-xs)',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, opacity 0.15s ease',
          zIndex: 6 + block.colIndex,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.zIndex = '30';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.zIndex = String(6 + block.colIndex);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.125rem' }}>
          <CategoryIndicator shape={shape} color={color} size={6} />
          <span style={{ fontWeight: 700, fontSize: '0.6875rem', color, letterSpacing: '-0.01em', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {ev.type}
          </span>
          {block.startTime && (
            <span className="tabular-nums" style={{ fontSize: '0.5625rem', color: 'var(--on-surface-variant)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {formatTime12(block.startTime).replace(' AM', '').replace(' PM', '')}
              {block.endTime ? `–${formatTime12(block.endTime).replace(' AM', '').replace(' PM', '')}` : ''}
            </span>
          )}
        </div>
        <div style={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ev.title}
        </div>
        {ev.notes && (
          <div style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.notes}
          </div>
        )}
      </div>
    );
  }

  return null;
}
