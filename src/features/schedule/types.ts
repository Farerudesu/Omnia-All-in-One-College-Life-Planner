import type { ClassSession, Course, SessionException, CalendarEvent } from '@/types';

export interface DayScheduleBlock {
  id: string;
  kind: 'session' | 'event';
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
  colIndex: number;
  totalCols: number;
  session?: ClassSession;
  course?: Course;
  exception?: SessionException;
  room?: string;
  event?: CalendarEvent;
}

export interface SelectedClassBlock {
  session: ClassSession;
  course: Course;
  date: Date;
  exception?: SessionException;
}
