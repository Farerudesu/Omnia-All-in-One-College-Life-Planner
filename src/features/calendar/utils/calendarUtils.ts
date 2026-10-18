import type { CategoryShape } from '@/types';
import type { CalendarItem } from '../types';
import { toDateString } from '@/lib/dateUtils';

export const LEGEND_ITEMS = [
  { key: 'classes', labelEn: 'Classes', labelId: 'Kelas', shape: 'square' as CategoryShape, color: 'var(--classes)' },
  { key: 'exam', labelEn: 'Exams', labelId: 'Ujian', shape: 'diamond' as CategoryShape, color: 'var(--exams)' },
  { key: 'deadline', labelEn: 'Deadlines', labelId: 'Tenggat', shape: 'outline-square' as CategoryShape, color: 'var(--deadlines)' },
  { key: 'personal', labelEn: 'Personal', labelId: 'Pribadi', shape: 'circle' as CategoryShape, color: 'var(--personal)' },
  { key: 'lab', labelEn: 'Lab', labelId: 'Praktikum', shape: 'diamond' as CategoryShape, color: 'var(--tertiary)' },
];

export const CATEGORY_MAP: Record<string, { shape: CategoryShape; color: string }> = {
  class: { shape: 'square', color: 'var(--classes)' },
  classes: { shape: 'square', color: 'var(--classes)' },
  exam: { shape: 'diamond', color: 'var(--exams)' },
  deadline: { shape: 'outline-square', color: 'var(--deadlines)' },
  personal: { shape: 'circle', color: 'var(--personal)' },
  lab: { shape: 'diamond', color: 'var(--tertiary)' },
  other: { shape: 'circle', color: 'var(--on-surface-variant)' },
};

export function exportItemToICS(item: CalendarItem, date: Date) {
  const dStr = toDateString(date);
  const dateClean = dStr.replace(/-/g, '');
  const startTimeClean = (item.time || '09:00').replace(/:/g, '') + '00';
  const endTimeClean = (item.endTime || '10:00').replace(/:/g, '') + '00';
  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@omnia.app`;

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Omnia//College Life Planner//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dateClean}T000000Z`,
    `DTSTART:${dateClean}T${startTimeClean}`,
    `DTEND:${dateClean}T${endTimeClean}`,
    `SUMMARY:${item.title.replace(/\n/g, ' ')}`,
    item.room ? `LOCATION:${item.room.replace(/\n/g, ' ')}` : '',
    item.notes ? `DESCRIPTION:${item.notes.replace(/\n/g, '\\n')}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
