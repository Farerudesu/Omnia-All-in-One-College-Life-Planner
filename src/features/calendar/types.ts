import type { CategoryShape, CalendarEvent, Assignment, ClassSession, Course } from '@/types';

export const VIEW_MODES = ['Day', 'Week', 'Month', 'Agenda'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export interface CalendarItem {
  id: string;
  title: string;
  type: string;
  time?: string;
  endTime?: string;
  color: string;
  shape: CategoryShape;
  room?: string;
  notes?: string;
  isPast?: boolean;
  rawEvent?: CalendarEvent;
  rawAssignment?: Assignment;
  rawSession?: ClassSession;
  rawCourse?: Course;
}

export interface CalendarSearchResult {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time?: string;
  type: string;
  color: string;
  shape: CategoryShape;
  rawEvent?: CalendarEvent;
  rawAssignment?: Assignment;
  rawCourse?: Course;
}

export interface QuickActionMenuState {
  id: string;
  originX: number;
  originY: number;
  item: CalendarItem;
  date: Date;
  isExiting: boolean;
}

export interface RescheduleItemState {
  id: string;
  title: string;
  type: 'event' | 'assignment';
  date: string;
  time?: string;
  rawEvent?: CalendarEvent;
  rawAssignment?: Assignment;
}
