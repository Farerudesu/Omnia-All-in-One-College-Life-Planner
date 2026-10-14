import type {
  Course,
  ClassSession,
  SessionException,
  CalendarEvent,
  Assignment,
  Transaction,
  UserSettings,
  UserProfile,
} from '../types';
import { supabase } from './supabase.js';
import { getCurrencyScale, normalizeCurrency } from './currency';
import { normalizeTransactionCategory } from './categories';
import { localDateString, formatDetailedCountdown } from './dateUtils';

// simple id generator
let _counter = Date.now();
export const genId = () => `id-${_counter++}`;

// ─── User-scoped stores populated from Supabase ───
let activeUserId: string | null = null;
let courses: Course[] = [];
let classSessions: ClassSession[] = [];
let sessionExceptions: SessionException[] = [];
let events: CalendarEvent[] = [];
let assignments: Assignment[] = [];
let transactions: Transaction[] = [];
let profile: UserProfile | null = null;
let settings: UserSettings = {
  semesterStart: '',
  semesterEnd: '',
  breakWeeks: [],
  monthlyBudget: 2500000,
  currency: 'IDR',
  theme: 'light',
  language: (localStorage.getItem('omnia_language') as 'en' | 'id') || 'id',
};

export type DataTable = 'transactions' | 'classes' | 'events' | 'assignments' | 'profiles' | 'user_settings';
export interface TableStatus { loading: boolean; error: string | null }

const DATA_TABLES: DataTable[] = ['transactions', 'classes', 'events', 'assignments', 'profiles', 'user_settings'];
function exceptionFromRow(row: DbRow): SessionException {
  return {
    id: rowText(row, 'id'),
    classSessionId: rowText(row, 'class_session_id'),
    date: rowText(row, 'date'),
    type: rowText(row, 'type') as SessionException['type'],
    types: Array.isArray(row.types) ? row.types as SessionException['type'][] : undefined,
    isOnline: typeof row.is_online === 'boolean' ? row.is_online : undefined,
    newStartTime: rowText(row, 'new_start_time') || undefined,
    newEndTime: rowText(row, 'new_end_time') || undefined,
    newRoom: rowText(row, 'new_room') || undefined,
    note: rowText(row, 'note') || undefined,
  };
}

function exceptionRow(exception: SessionException) {
  return {
    id: exception.id,
    user_id: activeUserId,
    class_session_id: exception.classSessionId,
    date: exception.date,
    type: exception.type,
    types: exception.types || null,
    is_online: exception.isOnline ?? null,
    new_start_time: exception.newStartTime || null,
    new_end_time: exception.newEndTime || null,
    new_room: exception.newRoom || null,
    note: exception.note || null,
  };
}

async function refreshSessionExceptions() {
  if (!activeUserId) return;
  const { data, error } = await getClient().from('session_exceptions').select('*').eq('user_id', activeUserId);
  if (error) throw error;
  sessionExceptions = ((data || []) as DbRow[]).map(exceptionFromRow);
}

async function persistSessionException(exception: SessionException) {
  const { error } = await getClient().from('session_exceptions').upsert(exceptionRow(exception), { onConflict: 'user_id,class_session_id,date' });
  if (error) throw error;
}
const emptyTableStatus = (loading = false): Record<DataTable, TableStatus> => Object.fromEntries(
  DATA_TABLES.map((table) => [table, { loading, error: null }])
) as Record<DataTable, TableStatus>;
let tableStatus = emptyTableStatus(true);

type DbRow = Record<string, unknown>;

function getClient() {
  if (!supabase) throw new Error('Add VITE_SUPABASE_ANON_KEY to your .env file to connect to Supabase.');
  return supabase;
}

function rowText(row: DbRow, key: string, fallback = ''): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

function rowNumber(row: DbRow, key: string, fallback = 0): number {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : fallback;
}

function setTableStatus(table: DataTable, next: TableStatus) {
  tableStatus = { ...tableStatus, [table]: next };
  notify();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load data. Try again.';
}

const dayNumbers: Record<string, number> = {
  senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 7,
};

async function refreshTable(table: DataTable, attempt = 0) {
  if (!activeUserId) return;
  setTableStatus(table, { loading: true, error: null });

  try {
    const client = getClient();
    if (table === 'transactions') {
      const { data, error } = await client.from('transactions').select('*').eq('user_id', activeUserId).order('tanggal', { ascending: false });
      if (error) throw error;
      transactions = ((data || []) as DbRow[]).map((row) => {
        const type = rowText(row, 'tipe') === 'pemasukan' ? 'income' : 'expense';
        return {
          id: rowText(row, 'id'),
          date: rowText(row, 'tanggal'),
          type,
          amount: rowNumber(row, 'jumlah') / getCurrencyScale(settings.currency),
          category: normalizeTransactionCategory(rowText(row, 'kategori'), type),
          merchant: rowText(row, 'merchant'),
          paymentMethod: rowText(row, 'payment_method') || undefined,
          notes: rowText(row, 'catatan') || undefined,
        };
      });
    } else if (table === 'classes') {
      const { data, error } = await client.from('classes').select('*').eq('user_id', activeUserId).order('hari').order('jam_mulai');
      if (error) throw error;
      const rows = (data || []) as DbRow[];
      courses = rows.map((row) => ({
        id: rowText(row, 'id'),
        name: rowText(row, 'nama_kelas'),
        code: rowText(row, 'kode'),
        professor: rowText(row, 'instructor'),
        room: rowText(row, 'ruangan'),
        color: rowText(row, 'warna', '#1b4332'),
        credits: 0,
        semesterId: settings.termName || 'current',
      }));
      classSessions = rows.map((row) => ({
        id: rowText(row, 'id'),
        courseId: rowText(row, 'id'),
        daysOfWeek: dayNumbers[rowText(row, 'hari').toLowerCase()] ? [dayNumbers[rowText(row, 'hari').toLowerCase()]] : [],
        startTime: rowText(row, 'jam_mulai'),
        endTime: rowText(row, 'jam_selesai'),
        room: rowText(row, 'ruangan'),
        type: (['lecture', 'lab', 'tutorial', 'seminar'].includes(rowText(row, 'tipe')) ? rowText(row, 'tipe') : 'lecture') as ClassSession['type'],
      }));
    } else if (table === 'events') {
      const { data, error } = await client.from('events').select('*').eq('user_id', activeUserId).order('tanggal');
      if (error) throw error;
      events = ((data || []) as DbRow[]).map((row) => ({
        id: rowText(row, 'id'),
        title: rowText(row, 'judul'),
        date: rowText(row, 'tanggal'),
        startTime: rowText(row, 'jam_mulai') || undefined,
        endTime: rowText(row, 'jam_selesai') || undefined,
        type: (['class', 'exam', 'deadline', 'personal'].includes(rowText(row, 'kategori')) ? rowText(row, 'kategori') : 'personal') as CalendarEvent['type'],
        courseId: rowText(row, 'class_id') || undefined,
        course: rowText(row, 'course') || undefined,
        location: rowText(row, 'lokasi') || undefined,
        notes: rowText(row, 'catatan') || undefined,
        color: rowText(row, 'warna') || undefined,
      }));
    } else if (table === 'assignments') {
      const { data, error } = await client.from('assignments').select('*').eq('user_id', activeUserId).order('due_date');
      if (error) throw error;
      assignments = ((data || []) as DbRow[]).map((row) => ({
        id: rowText(row, 'id'),
        courseId: rowText(row, 'class_id') || undefined,
        category: rowText(row, 'class_id') ? 'classes' : 'personal',
        title: rowText(row, 'judul'),
        dueDate: `${rowText(row, 'due_date')}T${rowText(row, 'due_time', '23:59')}`,
        priority: (['low', 'medium', 'high'].includes(rowText(row, 'priority')) ? rowText(row, 'priority') : 'medium') as Assignment['priority'],
        status: rowText(row, 'status') === 'done' ? 'done' : rowText(row, 'status') === 'in_progress' ? 'in-progress' : 'not-started',
        notes: rowText(row, 'catatan') || undefined,
      }));
    } else if (table === 'profiles') {
      const query = activeUserId
        ? client.from('profiles').select('full_name, university_email, avatar_url').eq('id', activeUserId)
        : client.from('profiles').select('full_name, university_email, avatar_url');
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      const row = data as DbRow | null;
      profile = row ? {
        fullName: rowText(row, 'full_name'),
        universityEmail: rowText(row, 'university_email'),
        avatarUrl: rowText(row, 'avatar_url') || undefined,
      } : null;
    } else {
      const { data, error } = await client.from('user_settings').select('*').maybeSingle();
      if (error) throw error;
      const row = data as DbRow | null;
      settings = {
        ...settings,
        semesterStart: row ? rowText(row, 'term_start_date') : '',
        semesterEnd: row ? rowText(row, 'term_end_date') : '',
        monthlyBudget: row ? rowNumber(row, 'monthly_budget', settings.monthlyBudget) : settings.monthlyBudget,
        termName: row ? rowText(row, 'term_name') : '',
        firstDayOfWeek: row ? rowText(row, 'first_day_of_week', 'monday') : 'monday',
        notifEnabled: row ? row.notif_enabled !== false : true,
        currency: normalizeCurrency(row ? rowText(row, 'currency', 'IDR') : 'IDR'),
        theme: rowText(row || {}, 'theme', 'light') === 'dark' ? 'dark' : 'light',
        language: (localStorage.getItem('omnia_language') as 'en' | 'id') || 'id',
        paymentMethods: row && Array.isArray(row.payment_methods) && row.payment_methods.length > 0 ? (row.payment_methods as string[]) : getPaymentMethods(),
        chatHistory: row && Array.isArray(row.chat_history) ? (row.chat_history as any[]) : undefined,
      };
      if (settings.chatHistory && settings.chatHistory.length > 0) {
        try {
          const localStr = localStorage.getItem('omnia_omni_chat_session');
          const localArr = localStr ? JSON.parse(localStr) : [];
          if (!Array.isArray(localArr) || localArr.length === 0) {
            localStorage.setItem('omnia_omni_chat_session', JSON.stringify(settings.chatHistory));
          }
        } catch {
          // ignore localStorage sync error
        }
      }
    }
    setTableStatus(table, { loading: false, error: null });
    notify();
  } catch (error) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      return refreshTable(table, attempt + 1);
    }
    setTableStatus(table, { loading: false, error: errorMessage(error) });
  }
}

export async function loadUserData(userId: string) {
  activeUserId = userId;
  await refreshSessionExceptions();
  settings = { ...settings, currency: 'IDR' };
  await refreshTable('user_settings');
  await Promise.all(DATA_TABLES.filter((table) => table !== 'user_settings').map((table) => refreshTable(table)));
}

export function clearUserData() {
  activeUserId = null;
  courses = [];
  classSessions = [];
  sessionExceptions = [];
  events = [];
  assignments = [];
  transactions = [];
  profile = null;
  settings = { semesterStart: '', semesterEnd: '', breakWeeks: [], monthlyBudget: 2500000, currency: 'IDR', theme: 'light' };
  cachedPaymentMethods = null;
  cachedNotifications = null;
  tableStatus = emptyTableStatus(true);
  notify();
}

export function refreshUserData() {
  return activeUserId ? loadUserData(activeUserId) : Promise.resolve();
}

export function getDataStatus() {
  return tableStatus;
}

function ownedRow(values: Record<string, unknown>) {
  if (!activeUserId) throw new Error('Sign in before saving data.');
  return { ...values, user_id: activeUserId };
}

async function mutateTable(table: DataTable, request: () => PromiseLike<{ error: { message: string } | null }>) {
  setTableStatus(table, { loading: true, error: null });
  try {
    const { error } = await request();
    if (error) throw error;
    await refreshTable(table);
  } catch (error) {
    setTableStatus(table, { loading: false, error: errorMessage(error) });
  }
}

function transactionRow(transaction: Omit<Transaction, 'id'> | Partial<Transaction>) {
  const row: Record<string, unknown> = {};
  const txType = transaction.type || ('amount' in transaction && transaction.amount && transaction.amount > 0 ? 'expense' : undefined);
  if ('date' in transaction) row.tanggal = transaction.date;
  if ('type' in transaction) row.tipe = transaction.type === 'income' ? 'pemasukan' : 'pengeluaran';
  if ('amount' in transaction) row.jumlah = Math.round((transaction.amount || 0) * getCurrencyScale(settings.currency));
  if ('category' in transaction) row.kategori = normalizeTransactionCategory(transaction.category, txType || 'expense');
  if ('merchant' in transaction) row.merchant = transaction.merchant;
  if ('paymentMethod' in transaction) row.payment_method = transaction.paymentMethod ?? null;
  if ('notes' in transaction) row.catatan = transaction.notes ?? null;
  return row;
}

function eventRow(event: Partial<CalendarEvent>) {
  const row: Record<string, unknown> = {};
  if ('courseId' in event) row.class_id = event.courseId ?? null;
  if ('title' in event) row.judul = event.title;
  if ('type' in event) row.kategori = event.type === 'other' ? 'personal' : event.type;
  if ('date' in event) row.tanggal = event.date;
  if ('startTime' in event) row.jam_mulai = event.startTime ?? null;
  if ('endTime' in event) row.jam_selesai = event.endTime ?? null;
  if ('course' in event) row.course = event.course ?? null;
  if ('location' in event) row.lokasi = event.location ?? null;
  if ('notes' in event) row.catatan = event.notes ?? null;
  if ('color' in event) row.warna = event.color ?? null;
  return row;
}

function assignmentRow(assignment: Partial<Assignment>) {
  const row: Record<string, unknown> = {};
  if ('courseId' in assignment) row.class_id = assignment.courseId ?? null;
  if ('title' in assignment) row.judul = assignment.title;
  if ('dueDate' in assignment) {
    const [date, time] = (assignment.dueDate || '').split('T');
    row.due_date = date;
    row.due_time = time || '23:59';
  }
  if ('status' in assignment) row.status = assignment.status === 'done' ? 'done' : assignment.status === 'in-progress' ? 'in_progress' : 'todo';
  if ('priority' in assignment) row.priority = assignment.priority;
  if ('notes' in assignment) row.catatan = assignment.notes ?? null;
  return row;
}

function classRow(course: Course, session: Pick<ClassSession, 'startTime' | 'endTime' | 'room' | 'type'>, day: number) {
  return {
    nama_kelas: course.name,
    kode: course.code,
    instructor: course.professor || null,
    ruangan: session.room || course.room || null,
    hari: ['', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'][day],
    jam_mulai: session.startTime,
    jam_selesai: session.endTime,
    tipe: session.type,
    warna: course.color,
  };
}

// Listeners
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  cachedNotifications = null;
  listeners.forEach((fn) => fn());
}

// ─── Courses ───
export function getCourses(): Course[] {
  return courses;
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function addCourse(course: Omit<Course, 'id'>): Course {
  const newCourse = { ...course, id: genId() };
  courses = [...courses, newCourse];
  notify();
  return newCourse;
}

export function updateCourse(id: string, data: Partial<Course>): void {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.nama_kelas = data.name;
  if (data.code !== undefined) row.kode = data.code;
  if (data.professor !== undefined) row.instructor = data.professor;
  if (data.room !== undefined) row.ruangan = data.room;
  if (data.color !== undefined) row.warna = data.color;
  void mutateTable('classes', () => getClient().from('classes').update(row).eq('id', id).eq('user_id', activeUserId));
}

export function deleteCourse(id: string): void {
  void mutateTable('classes', () => getClient().from('classes').delete().eq('id', id).eq('user_id', activeUserId));
}

// ─── Class Sessions ───
export function getClassSessions(): ClassSession[] {
  return classSessions;
}

export function getClassSessionById(id: string): ClassSession | undefined {
  return classSessions.find((s) => s.id === id);
}

export function addClassSession(
  session: Omit<ClassSession, 'id'>,
  courseDetails?: Pick<Course, 'name' | 'code' | 'professor' | 'room' | 'color'>
): ClassSession {
  const course = courseDetails
    ? { ...courseDetails, id: 'new-class', credits: 0, semesterId: settings.termName || 'current' }
    : courses.find((item) => item.id === session.courseId);
  if (!course) {
    setTableStatus('classes', { loading: false, error: 'Choose a class before adding a meeting.' });
    return { ...session, id: genId() };
  }
  void mutateTable('classes', () => getClient().from('classes').insert(session.daysOfWeek.map((day) => ownedRow(classRow(course, session, day)))));
  return { ...session, id: genId() };
}

export function updateClassSession(id: string, data: Partial<ClassSession>): void {
  const row: Record<string, unknown> = {};
  if (data.room !== undefined) row.ruangan = data.room;
  if (data.startTime !== undefined) row.jam_mulai = data.startTime;
  if (data.endTime !== undefined) row.jam_selesai = data.endTime;
  if (data.type !== undefined) row.tipe = data.type;
  if (data.daysOfWeek?.length) row.hari = ['', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'][data.daysOfWeek[0]];
  void mutateTable('classes', () => getClient().from('classes').update(row).eq('id', id).eq('user_id', activeUserId));
}

export function deleteClassSession(id: string): void {
  void mutateTable('classes', () => getClient().from('classes').delete().eq('id', id).eq('user_id', activeUserId));
}

// ─── Session Exceptions ───
export function getSessionExceptions(): SessionException[] {
  return sessionExceptions;
}

export function getExceptionsForSession(sessionId: string): SessionException[] {
  return sessionExceptions.filter((e) => e.classSessionId === sessionId);
}

export function getExceptionForDate(sessionId: string, date: string): SessionException | undefined {
  return sessionExceptions.find(
    (e) => e.classSessionId === sessionId && e.date === date
  );
}

export async function addSessionException(exc: Omit<SessionException, 'id'>): Promise<SessionException> {
  const existingIndex = sessionExceptions.findIndex(
    (e) => e.classSessionId === exc.classSessionId && e.date === exc.date
  );
  if (existingIndex >= 0) {
    const updated: SessionException = { ...sessionExceptions[existingIndex], ...exc };
    await persistSessionException(updated);
    sessionExceptions = [
      ...sessionExceptions.slice(0, existingIndex),
      updated,
      ...sessionExceptions.slice(existingIndex + 1),
    ];
    notify();
    return updated;
  }
  const newExc = { ...exc, id: genId() };
  await persistSessionException(newExc);
  sessionExceptions = [...sessionExceptions, newExc];
  notify();
  return newExc;
}

export function updateSessionException(id: string, data: Partial<SessionException>): void {
  sessionExceptions = sessionExceptions.map((e) =>
    e.id === id ? { ...e, ...data } : e
  );
  const updated = sessionExceptions.find((e) => e.id === id);
  if (updated) persistSessionException(updated);
  notify();
}

export function deleteSessionException(id: string): void {
  sessionExceptions = sessionExceptions.filter((e) => e.id !== id);
  void getClient().from('session_exceptions').delete().eq('id', id).eq('user_id', activeUserId);
  notify();
}

// ─── Events ───
export function getEvents(): CalendarEvent[] {
  return events;
}

export async function addEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const newEvent = { ...event, id: genId() };
  const { error } = await getClient().from('events').insert(ownedRow(eventRow(event)));
  if (error) throw error;
  await refreshTable('events');
  return newEvent;
}

export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  setTableStatus('events', { loading: true, error: null });
  try {
    const { error } = await getClient().from('events').insert(ownedRow(eventRow(event)));
    if (error) throw error;
    await refreshTable('events');
    return { ...event, id: genId() };
  } catch (error) {
    setTableStatus('events', { loading: false, error: errorMessage(error) });
    throw new Error(errorMessage(error));
  }
}

export function updateEvent(id: string, data: Partial<CalendarEvent>): void {
  void mutateTable('events', () => getClient().from('events').update(eventRow(data)).eq('id', id).eq('user_id', activeUserId));
}

export function deleteEvent(id: string): void {
  void mutateTable('events', () => getClient().from('events').delete().eq('id', id).eq('user_id', activeUserId));
}

// ─── Assignments ───
export function getAssignments(): Assignment[] {
  return assignments;
}

export async function addAssignment(assignment: Omit<Assignment, 'id'>): Promise<Assignment> {
  const newAssignment = { ...assignment, id: genId() };
  const { error } = await getClient().from('assignments').insert(ownedRow(assignmentRow(assignment)));
  if (error) throw error;
  await refreshTable('assignments');
  return newAssignment;
}

export function updateAssignment(id: string, data: Partial<Assignment>): void {
  assignments = assignments.map((a) => {
    if (a.id !== id) return a;
    const updated = { ...a, ...data };
    if ('courseId' in data) {
      if (data.courseId) {
        if (!data.category || data.category === 'personal' || data.category === 'other') {
          updated.category = 'classes';
        }
      } else {
        if (!data.category || data.category === 'classes') {
          updated.category = 'personal';
        }
      }
    }
    return updated;
  });
  notify();
  void mutateTable('assignments', () => getClient().from('assignments').update(assignmentRow(data)).eq('id', id).eq('user_id', activeUserId));
}

export function deleteAssignment(id: string): void {
  void mutateTable('assignments', () => getClient().from('assignments').delete().eq('id', id).eq('user_id', activeUserId));
}

// ─── Pinned Items Management ───
let pinnedAssignmentIds: string[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_pinned_assignments');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

let pinnedEventIds: string[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_pinned_events');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

let dismissedAutoPins: string[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_dismissed_auto_pins');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

export function getPinnedAssignmentIds(): string[] {
  return pinnedAssignmentIds;
}

export function isAssignmentPinned(id: string): boolean {
  return pinnedAssignmentIds.includes(id);
}

export function pinAssignment(id: string): void {
  if (!pinnedAssignmentIds.includes(id)) {
    pinnedAssignmentIds = [...pinnedAssignmentIds, id];
    localStorage.setItem('omnia_pinned_assignments', JSON.stringify(pinnedAssignmentIds));
    dismissedAutoPins = dismissedAutoPins.filter((dId) => dId !== id);
    localStorage.setItem('omnia_dismissed_auto_pins', JSON.stringify(dismissedAutoPins));
    notify();
  }
}

export function unpinAssignment(id: string): void {
  pinnedAssignmentIds = pinnedAssignmentIds.filter((item) => item !== id);
  localStorage.setItem('omnia_pinned_assignments', JSON.stringify(pinnedAssignmentIds));
  if (!dismissedAutoPins.includes(id)) {
    dismissedAutoPins = [...dismissedAutoPins, id];
    localStorage.setItem('omnia_dismissed_auto_pins', JSON.stringify(dismissedAutoPins));
  }
  notify();
}

export function togglePinAssignment(id: string): boolean {
  if (isAssignmentPinned(id)) {
    unpinAssignment(id);
    return false;
  } else {
    pinAssignment(id);
    return true;
  }
}

export function getDismissedAutoPins(): string[] {
  return dismissedAutoPins;
}

export function resetDismissedAutoPins(): void {
  dismissedAutoPins = [];
  localStorage.removeItem('omnia_dismissed_auto_pins');
  notify();
}

export function getPinnedAssignments(): { assignment: Assignment; isManual: boolean }[] {
  const manualIds = pinnedAssignmentIds;
  const activeAssignments = assignments.filter((a) => a.status !== 'done');
  
  if (manualIds.length > 0) {
    const manualList = manualIds
      .map((id) => activeAssignments.find((a) => a.id === id))
      .filter((a): a is Assignment => !!a)
      .map((a) => ({ assignment: a, isManual: true }));
    if (manualList.length > 0) return manualList;
  }
  
  const dismissed = dismissedAutoPins;
  const sorted = [...activeAssignments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const autoCandidate = sorted.find((a) => !dismissed.includes(a.id));
  
  if (autoCandidate) {
    return [{ assignment: autoCandidate, isManual: false }];
  }
  return [];
}

// ─── Pinned Events Management ───
export function getPinnedEventIds(): string[] {
  return pinnedEventIds;
}

export function isEventPinned(id: string): boolean {
  return pinnedEventIds.includes(id);
}

export function pinEvent(id: string): void {
  if (!pinnedEventIds.includes(id)) {
    pinnedEventIds = [...pinnedEventIds, id];
    localStorage.setItem('omnia_pinned_events', JSON.stringify(pinnedEventIds));
    notify();
  }
}

export function unpinEvent(id: string): void {
  pinnedEventIds = pinnedEventIds.filter((item) => item !== id);
  localStorage.setItem('omnia_pinned_events', JSON.stringify(pinnedEventIds));
  notify();
}

export function togglePinEvent(id: string): boolean {
  if (isEventPinned(id)) {
    unpinEvent(id);
    return false;
  } else {
    pinEvent(id);
    return true;
  }
}

export function getPinnedEvents(): CalendarEvent[] {
  if (pinnedEventIds.length === 0) return [];
  return events.filter((ev) => pinnedEventIds.includes(ev.id));
}

// ─── Transactions ───
export function getTransactions(): Transaction[] {
  return transactions;
}

export function addTransaction(txn: Omit<Transaction, 'id'>): Transaction {
  const newTxn = { ...txn, id: genId() };
  void mutateTable('transactions', () => getClient().from('transactions').insert(ownedRow(transactionRow(txn))));
  return newTxn;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  void mutateTable('transactions', () => getClient().from('transactions').update(transactionRow(data)).eq('id', id).eq('user_id', activeUserId));
}

export function deleteTransaction(id: string): void {
  void mutateTable('transactions', () => getClient().from('transactions').delete().eq('id', id).eq('user_id', activeUserId));
}

// ─── Payment Methods ───
export const DEFAULT_PAYMENT_METHODS = ['QRIS', 'Debit', 'Cash', 'Transfer'];
let cachedPaymentMethods: string[] | null = null;

export function getPaymentMethods(): string[] {
  if (cachedPaymentMethods) return cachedPaymentMethods;
  const stored = localStorage.getItem('omnia_payment_methods');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedPaymentMethods = parsed;
        return cachedPaymentMethods;
      }
    } catch {}
  }
  cachedPaymentMethods = settings.paymentMethods && settings.paymentMethods.length > 0
    ? settings.paymentMethods
    : DEFAULT_PAYMENT_METHODS;
  return cachedPaymentMethods;
}

export function savePaymentMethods(methods: string[]): void {
  const filtered = Array.from(new Set(methods.map((m) => m.trim()).filter(Boolean)));
  cachedPaymentMethods = filtered;
  localStorage.setItem('omnia_payment_methods', JSON.stringify(filtered));
  settings = { ...settings, paymentMethods: filtered };
  notify();
  void mutateTable('user_settings', async () => {
    const client = getClient();
    return client.from('user_settings').update({ payment_methods: filtered }).eq('user_id', activeUserId);
  });
}

export function addPaymentMethod(method: string): string[] {
  const trimmed = method.trim();
  if (!trimmed) return getPaymentMethods();
  const current = getPaymentMethods();
  if (!current.includes(trimmed)) {
    const next = [...current, trimmed];
    savePaymentMethods(next);
    return next;
  }
  return current;
}

export function deletePaymentMethod(method: string): string[] {
  const current = getPaymentMethods();
  const next = current.filter((m) => m !== method);
  savePaymentMethods(next.length > 0 ? next : DEFAULT_PAYMENT_METHODS);
  return next.length > 0 ? next : DEFAULT_PAYMENT_METHODS;
}

// ─── Settings ───
export function getSettings(): UserSettings {
  return settings;
}

export function getProfile(): UserProfile | null {
  return profile;
}

export async function updateProfile(data: UserProfile) {
  if (!activeUserId) throw new Error('Sign in before saving profile.');
  setTableStatus('profiles', { loading: true, error: null });
  try {
    const { error } = await getClient().from('profiles').upsert({
      id: activeUserId,
      full_name: data.fullName,
      university_email: data.universityEmail,
      avatar_url: data.avatarUrl || null,
    }, { onConflict: 'id' });
    if (error) throw error;
    await refreshTable('profiles');
  } catch (error) {
    setTableStatus('profiles', { loading: false, error: errorMessage(error) });
    throw error;
  }
}

function resolveAvatarMimeAndExt(file: File): { extension: string; contentType: string } {
  const mimeMap: Record<string, { ext: string; mime: string }> = {
    'image/png': { ext: 'png', mime: 'image/png' },
    'image/jpeg': { ext: 'jpg', mime: 'image/jpeg' },
    'image/jpg': { ext: 'jpg', mime: 'image/jpeg' },
    'image/pjpeg': { ext: 'jpg', mime: 'image/jpeg' },
    'image/webp': { ext: 'webp', mime: 'image/webp' },
    'image/gif': { ext: 'gif', mime: 'image/gif' },
    'image/avif': { ext: 'avif', mime: 'image/avif' },
  };
  const extMap: Record<string, { ext: string; mime: string }> = {
    png: { ext: 'png', mime: 'image/png' },
    jpg: { ext: 'jpg', mime: 'image/jpeg' },
    jpeg: { ext: 'jpg', mime: 'image/jpeg' },
    webp: { ext: 'webp', mime: 'image/webp' },
    gif: { ext: 'gif', mime: 'image/gif' },
    avif: { ext: 'avif', mime: 'image/avif' },
  };

  const rawMime = (file.type || '').toLowerCase().trim();
  if (rawMime && mimeMap[rawMime]) {
    return { extension: mimeMap[rawMime].ext, contentType: mimeMap[rawMime].mime };
  }

  const nameParts = file.name.split('.');
  const rawExt = nameParts.length > 1 ? nameParts.pop()?.toLowerCase().trim() : '';
  if (rawExt && extMap[rawExt]) {
    return { extension: extMap[rawExt].ext, contentType: extMap[rawExt].mime };
  }

  throw new Error('Choose a PNG, JPG, WebP, GIF, or AVIF image.');
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  if (!activeUserId) throw new Error('Sign in before uploading a profile image.');
  const { extension, contentType } = resolveAvatarMimeAndExt(file);
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');

  const path = `${activeUserId}/${crypto.randomUUID()}.${extension}`;
  const storage = getClient().storage.from('profile-avatars');
  const { data, error } = await storage.upload(path, file, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return storage.getPublicUrl(data.path).data.publicUrl;
}

export function updateSettings(data: Partial<UserSettings>): void {
  settings = { ...settings, ...data };
  if (settings.theme === 'dark' || settings.theme === 'light') {
    localStorage.setItem('omnia_theme', settings.theme);
  }
  notify();
  const row = {
    term_name: settings.termName ?? null,
    term_start_date: settings.semesterStart || null,
    term_end_date: settings.semesterEnd || null,
    currency: normalizeCurrency(settings.currency),
    theme: settings.theme === 'dark' ? 'dark' : 'light',
    first_day_of_week: settings.firstDayOfWeek ?? 'monday',
    notif_enabled: settings.notifEnabled ?? true,
    monthly_budget: Math.max(0, Math.round(settings.monthlyBudget || 0)),
  };
  void mutateTable('user_settings', async () => {
    const client = getClient();
    const { data: existing, error } = await client.from('user_settings').select('user_id').maybeSingle();
    if (error) return { error };
    return existing
      ? client.from('user_settings').update(row).eq('user_id', activeUserId)
      : client.from('user_settings').insert(ownedRow(row));
  });
}

let chatSyncTimeout: ReturnType<typeof setTimeout> | null = null;

export function getSavedChatHistory(): any[] {
  if (settings.chatHistory && settings.chatHistory.length > 0) {
    return settings.chatHistory;
  }
  try {
    const saved = localStorage.getItem('omnia_omni_chat_session');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(history: any[]): void {
  const trimmed = history.slice(-50);
  settings.chatHistory = trimmed;
  try {
    localStorage.setItem('omnia_omni_chat_session', JSON.stringify(trimmed));
  } catch {
    // ignore quota error
  }
  if (!activeUserId) return;

  if (chatSyncTimeout) clearTimeout(chatSyncTimeout);
  chatSyncTimeout = setTimeout(() => {
    const client = getClient();
    client.from('user_settings').update({ chat_history: trimmed }).eq('user_id', activeUserId).then(() => {});
  }, 1000);
}

// ─── Private schedule sharing RPCs ───

export interface SharePreview {
  classes: number;
  assignments: number;
}

function shareCodeError(error: { message: string }): Error {
  if (/invalid|expired|uses? remaining/i.test(error.message)) {
    return new Error('Invalid or expired code.');
  }
  return new Error(error.message || 'Unable to process this share code.');
}

export async function createShareCode(): Promise<string> {
  const { data, error } = await getClient().rpc('create_share_code', {
    p_includes_classes: true,
    p_includes_assignments: true,
  });
  if (error) throw shareCodeError(error);
  if (typeof data !== 'string') throw new Error('The share code could not be created.');
  return data;
}

export async function previewShareCode(code: string): Promise<SharePreview> {
  const { data, error } = await getClient().rpc('preview_share_code', { p_code: code.trim().toUpperCase() });
  if (error) throw shareCodeError(error);
  if (!data || typeof data !== 'object') throw new Error('Invalid or expired code.');
  const preview = data as SharePreview;
  if (!Number.isInteger(preview.classes) || !Number.isInteger(preview.assignments)) {
    throw new Error('Unable to preview this share code.');
  }
  return preview;
}

export async function redeemShareCode(code: string): Promise<SharePreview> {
  const { data, error } = await getClient().rpc('redeem_share_code', { p_code: code.trim().toUpperCase() });
  if (error) throw shareCodeError(error);
  if (!data || typeof data !== 'object') throw new Error('Unable to import this schedule.');
  const imported = data as SharePreview;
  await Promise.all([refreshTable('classes'), refreshTable('assignments')]);
  return imported;
}

// ─── Category Filter Visibility ───
export type CategoryKey = 'classes' | 'exams' | 'deadlines' | 'personal';

let categoryVisibility: Record<CategoryKey, boolean> = {
  classes: true,
  exams: true,
  deadlines: true,
  personal: true,
};

export function getCategoryVisibility(): Record<CategoryKey, boolean> {
  return categoryVisibility;
}

export function toggleCategoryVisibility(key: CategoryKey) {
  categoryVisibility = {
    ...categoryVisibility,
    [key]: !categoryVisibility[key],
  };
  notify();
}

export function setCategoryVisibility(key: CategoryKey, visible: boolean) {
  categoryVisibility = {
    ...categoryVisibility,
    [key]: visible,
  };
  notify();
}

// ─── Notifications & Reminders ───
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'academic' | 'alert' | 'finance' | 'deadline';
  link?: string;
}

export interface UserReminder {
  id: string;
  itemId: string;
  itemType: 'assignment' | 'event';
  title: string;
  remindAt: string; // ISO string
  minutesBefore: number;
  link: string;
}

function getStoredReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem('omnia_read_notifications');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveStoredReadNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem('omnia_read_notifications', JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getUserReminders(): UserReminder[] {
  try {
    const raw = localStorage.getItem('omnia_reminders');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setUserReminder(reminder: UserReminder): void {
  const current = getUserReminders().filter((r) => r.itemId !== reminder.itemId);
  current.push(reminder);
  localStorage.setItem('omnia_reminders', JSON.stringify(current));
  notify();
}

export function deleteUserReminder(itemId: string): void {
  const current = getUserReminders().filter((r) => r.itemId !== itemId);
  localStorage.setItem('omnia_reminders', JSON.stringify(current));
  notify();
}

let extraNotifications: AppNotification[] = [];
let cachedNotifications: AppNotification[] | null = null;

export function getNotifications(): AppNotification[] {
  if (cachedNotifications) return cachedNotifications;
  const readIds = getStoredReadNotificationIds();
  const result: AppNotification[] = [];
  const now = new Date();
  const isId = (localStorage.getItem('omnia_language') || 'id') === 'id';

  // 1. Upcoming classes starting within 2 hours
  const todayDayNum = now.getDay() === 0 ? 7 : now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const session of classSessions) {
    if (session.daysOfWeek.includes(todayDayNum)) {
      const course = courses.find((c) => c.id === session.courseId);
      const [sh, sm] = (session.startTime || '').split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm)) {
        const sessionMinutes = sh * 60 + sm;
        const diff = sessionMinutes - currentMinutes;
        if (diff >= -30 && diff <= 120) {
          const id = `class-${session.id}-${localDateString(now)}`;
          result.push({
            id,
            title: isId
              ? `Kelas segera dimulai: ${course?.name || session.startTime}`
              : `Class starting soon: ${course?.name || session.startTime}`,
            message: `${course?.code || ''} · ${session.startTime}–${session.endTime} (${session.room || course?.room || 'TBA'})`,
            time: diff > 0 ? (isId ? `dalam ${diff} mnt` : `in ${diff} min`) : (isId ? 'sedang berlangsung' : 'now'),
            read: readIds.has(id),
            type: 'academic',
            link: '/schedule',
          });
        }
      }
    }
  }

  // 2. Assignments due within 48 hours
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  for (const a of assignments) {
    if (a.status !== 'done' && a.dueDate) {
      const due = new Date(a.dueDate);
      if (!isNaN(due.getTime()) && due >= new Date(now.getTime() - 24 * 60 * 60 * 1000) && due <= in48Hours) {
        const id = `assignment-${a.id}`;
        const cd = formatDetailedCountdown(a.dueDate, now, isId ? 'id' : 'en');
        result.push({
          id,
          title: isId ? `Tenggat tugas: ${a.title}` : `Deliverable due: ${a.title}`,
          message: isId ? `Batas waktu pengumpulan: ${a.dueDate.replace('T', ' ')}` : `Submission deadline: ${a.dueDate.replace('T', ' ')}`,
          time: cd.text,
          read: readIds.has(id),
          type: 'deadline',
          link: '/assignments',
        });
      }
    }
  }

  // 3. Events occurring today
  const todayStr = localDateString(now);
  for (const ev of events) {
    if (ev.date === todayStr) {
      const id = `event-${ev.id}`;
      result.push({
        id,
        title: isId ? `Acara hari ini: ${ev.title}` : `Event today: ${ev.title}`,
        message: `${ev.startTime ? ev.startTime + ' · ' : ''}${ev.location || (isId ? 'Kampus' : 'Campus')}`,
        time: ev.startTime || (isId ? 'Sepanjang hari' : 'All day'),
        read: readIds.has(id),
        type: 'alert',
        link: '/calendar',
      });
    }
  }

  // 4. User reminders that have reached trigger time
  for (const rem of getUserReminders()) {
    const remTime = new Date(rem.remindAt);
    if (!isNaN(remTime.getTime()) && remTime <= now) {
      const id = `rem-${rem.id}`;
      result.push({
        id,
        title: isId ? `Pengingat: ${rem.title}` : `Reminder: ${rem.title}`,
        message: isId ? `Pengingat terjadwal (${rem.minutesBefore} menit sebelum waktu acara)` : `Scheduled reminder (${rem.minutesBefore}m before)`,
        time: isId ? 'Waktunya tiba' : 'Triggered',
        read: readIds.has(id),
        type: rem.itemType === 'assignment' ? 'deadline' : 'alert',
        link: rem.link,
      });
    }
  }

  // Combine with any extra manually pushed notifications
  for (const n of extraNotifications) {
    result.push({ ...n, read: readIds.has(n.id) || n.read });
  }

  cachedNotifications = result;
  return cachedNotifications;
}

export function markNotificationRead(id: string) {
  const readIds = getStoredReadNotificationIds();
  readIds.add(id);
  saveStoredReadNotificationIds(readIds);
  notify();
}

export function markAllNotificationsRead() {
  const readIds = getStoredReadNotificationIds();
  for (const n of getNotifications()) {
    readIds.add(n.id);
  }
  saveStoredReadNotificationIds(readIds);
  notify();
}

export function clearNotifications() {
  const readIds = getStoredReadNotificationIds();
  for (const n of getNotifications()) {
    readIds.add(n.id);
  }
  saveStoredReadNotificationIds(readIds);
  extraNotifications = [];
  notify();
}

// ─── Study Pod Reservations ───
export interface PodReservation {
  podId: string;
  name: string;
  location: string;
  timeSlot: string;
  date: string;
  reservedAt: string;
}

let podReservation: PodReservation | null = null;

export function getPodReservation(): PodReservation | null {
  return podReservation;
}

export function reservePod(reservation: Omit<PodReservation, 'reservedAt'>): PodReservation {
  podReservation = {
    ...reservation,
    reservedAt: new Date().toISOString(),
  };
  notify();
  return podReservation;
}

export function cancelPodReservation(): void {
  podReservation = null;
  notify();
}

