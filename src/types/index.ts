// ─── Course ───
export interface Course {
  id: string;
  name: string;
  code: string;
  professor: string;
  color: string;
  room: string;
  credits: number;
  semesterId: string;
}

// ─── Class Sessions (recurring pattern) ───
export interface ClassSession {
  id: string;
  courseId: string;
  daysOfWeek: number[]; // 1=Mon … 7=Sun
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  room: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'seminar';
}

// ─── Session Exceptions (one-off changes) ───
export type ExceptionType =
  'cancelled' | 'moved' | 'room-changed' | 'online' | 'extra' | 'attended' | 'no-class';

export interface SessionException {
  id: string;
  classSessionId: string;
  date: string; // "YYYY-MM-DD"
  type: ExceptionType;
  types?: ExceptionType[];
  isOnline?: boolean;
  newStartTime?: string;
  newEndTime?: string;
  newRoom?: string;
  note?: string;
}

// ─── Events ───
export type EventType = 'class' | 'exam' | 'deadline' | 'personal' | 'lab' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:mm"
  endTime?: string; // "HH:mm"
  type: EventType;
  courseId?: string;
  course?: string;
  location?: string;
  color?: string;
  notes?: string;
  reminderMinutesBefore?: number;
  googleEventId?: string;
  isGoogleEvent?: boolean;
  htmlLink?: string;
}

// ─── Assignments ───
export type Priority = 'low' | 'medium' | 'high';
export type AssignmentStatus = 'not-started' | 'in-progress' | 'done';

export interface Assignment {
  id: string;
  courseId?: string;
  category?: 'classes' | 'exam' | 'deadline' | 'personal' | 'other';
  title: string;
  dueDate: string; // ISO datetime "YYYY-MM-DDTHH:mm"
  priority: Priority;
  status: AssignmentStatus;
  notes?: string;
  googleEventId?: string;
}

// ─── Transactions ───
export type TransactionType = 'expense' | 'income';
export { EXPENSE_CATEGORIES, ALL_TRANSACTION_CATEGORIES } from '../lib/categories';
export type { ExpenseCategory, TransactionCategory } from '../lib/categories';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  date: string; // "YYYY-MM-DD"
  type: TransactionType;
  paymentMethod?: string;
  notes?: string;
}

export interface UserProfile {
  fullName: string;
  universityEmail: string;
  avatarUrl?: string;
  omniNotesAccess?: boolean;
}

// ─── Settings ───
export interface BreakWeek {
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
}

export interface PrefilledData {
  type: 'event' | 'task' | 'expense' | 'note';
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  eventType?: EventType;
  // For tasks
  courseId?: string;
  dueTime?: string;
  priority?: Priority;
  // For expenses
  amount?: number;
  paymentMethod?: string;
  category?: string;
  // For notes
  content?: string;
  tags?: string[];
  assignmentId?: string;
  noteId?: string;
  mode?: 'create' | 'append';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentUrl?: string | null;
  prefilledData?: PrefilledData;
  noteSource?: { id: string; title: string };
  actionStatus?: 'saved' | 'cancelled' | 'replaced';
  actionError?: string;
}

export interface UserSettings {
  semesterStart: string;
  semesterEnd: string;
  breakWeeks: BreakWeek[];
  monthlyBudget: number;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  termName?: string;
  firstDayOfWeek?: string;
  notifEnabled?: boolean;
  language?: 'en' | 'id';
  paymentMethods?: string[];
  chatHistory?: ChatMessage[];
  timeZone?: string;
  initialBalance?: number;
  // Google Calendar Sync
  googleCalendarSyncEnabled?: boolean;
  googleCalendarId?: string;
  googleCalendarName?: string;
  googleAccountEmail?: string;
  googleSyncClasses?: boolean;
  googleSyncAssignments?: boolean;
  googleSyncEvents?: boolean;
  googleImportPersonal?: boolean;
  googleLastSynced?: string;
  googleCalendarTarget?: 'primary' | 'secondary';
}

// ─── Category Shape mapping (accessibility) ───
export type CategoryShape = 'square' | 'diamond' | 'outline-square' | 'circle';

export const CATEGORY_SHAPES: Record<string, CategoryShape> = {
  classes: 'square',
  exams: 'diamond',
  deadlines: 'outline-square',
  personal: 'circle',
};

export const CATEGORY_COLORS: Record<string, string> = {
  classes: 'var(--classes)',
  exams: 'var(--exams)',
  deadlines: 'var(--deadlines)',
  personal: 'var(--personal)',
};

// ─── Notes ───
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  color?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  courseId?: string | null;
  assignmentId?: string | null;
  eventId?: string | null;
  source: 'manual' | 'omni';
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content: string;
  tags?: string[];
  color?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  courseId?: string | null;
  assignmentId?: string | null;
  eventId?: string | null;
  source?: 'manual' | 'omni';
}

export interface NoteFilter {
  search?: string;
  tag?: string;
  courseId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

