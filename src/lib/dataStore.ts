import type {
  Course,
  ClassSession,
  SessionException,
  CalendarEvent,
  Assignment,
  Transaction,
  UserSettings,
  UserProfile,
  ChatMessage,
} from '../types';
import { supabase } from './supabase';
import { getCurrencyScale, normalizeCurrency } from './currency';
import { normalizeTransactionCategory } from './categories';
import { toast } from '../components/Toast';

// simple id generator
let _counter = Date.now();
export const genId = () => `id-${_counter++}`;

// ─── User-scoped stores populated from Supabase ───
export let activeUserId: string | null = null;
export let courses: Course[] = [];
export let classSessions: ClassSession[] = [];
export let sessionExceptions: SessionException[] = [];
export let events: CalendarEvent[] = [];
export let assignments: Assignment[] = [];
export let transactions: Transaction[] = [];
export let profile: UserProfile | null = null;
export let settings: UserSettings = {
  semesterStart: '',
  semesterEnd: '',
  breakWeeks: [],
  monthlyBudget: 2500000,
  currency: 'IDR',
  theme: 'light',
  language:
    (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('omnia_language') as 'en' | 'id')
      : null) || 'id',
  timeZone:
    (typeof localStorage !== 'undefined' ? localStorage.getItem('omnia_timezone') : null) ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Asia/Jakarta'),
  initialBalance: Number(
    (typeof localStorage !== 'undefined' ? localStorage.getItem('omnia_initial_balance') : null) || 0
  ),
};

export function setCourses(next: Course[]) {
  courses = next;
}
export function setClassSessions(next: ClassSession[]) {
  classSessions = next;
}
export function setSessionExceptions(next: SessionException[]) {
  sessionExceptions = next;
}
export function setEvents(next: CalendarEvent[]) {
  events = next;
}
export function setAssignments(next: Assignment[]) {
  assignments = next;
}
export function setTransactions(next: Transaction[]) {
  transactions = next;
}
export function setProfile(next: UserProfile | null) {
  profile = next;
}
export function setSettings(next: UserSettings) {
  settings = next;
}

export type DataTable =
  'transactions' | 'classes' | 'events' | 'assignments' | 'profiles' | 'user_settings';
export interface TableStatus {
  loading: boolean;
  error: string | null;
}

const DATA_TABLES: DataTable[] = [
  'transactions',
  'classes',
  'events',
  'assignments',
  'profiles',
  'user_settings',
];

export type DbRow = Record<string, unknown>;

export function exceptionFromRow(row: DbRow): SessionException {
  return {
    id: rowText(row, 'id'),
    classSessionId: rowText(row, 'class_session_id'),
    date: rowText(row, 'date'),
    type: rowText(row, 'type') as SessionException['type'],
    types: Array.isArray(row.types) ? (row.types as SessionException['type'][]) : undefined,
    isOnline: typeof row.is_online === 'boolean' ? row.is_online : undefined,
    newStartTime: rowText(row, 'new_start_time') || undefined,
    newEndTime: rowText(row, 'new_end_time') || undefined,
    newRoom: rowText(row, 'new_room') || undefined,
    note: rowText(row, 'note') || undefined,
  };
}

export function exceptionRow(exception: SessionException) {
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

export async function refreshSessionExceptions() {
  if (!activeUserId) return;
  const { data, error } = await getClient()
    .from('session_exceptions')
    .select('*')
    .eq('user_id', activeUserId);
  if (error) throw error;
  sessionExceptions = ((data || []) as DbRow[]).map(exceptionFromRow);
}

export async function persistSessionException(exception: SessionException) {
  const { error } = await getClient()
    .from('session_exceptions')
    .upsert(exceptionRow(exception), { onConflict: 'user_id,class_session_id,date' });
  if (error) throw error;
}

const emptyTableStatus = (loading = false): Record<DataTable, TableStatus> =>
  Object.fromEntries(DATA_TABLES.map((table) => [table, { loading, error: null }])) as Record<
    DataTable,
    TableStatus
  >;

let tableStatus = emptyTableStatus(true);

export function getClient() {
  if (!supabase)
    throw new Error('Add VITE_SUPABASE_ANON_KEY to your .env file to connect to Supabase.');
  return supabase;
}

export function rowText(row: DbRow, key: string, fallback = ''): string {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

export function rowNumber(row: DbRow, key: string, fallback = 0): number {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function setTableStatus(table: DataTable, next: TableStatus) {
  tableStatus = { ...tableStatus, [table]: next };
  notify();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load data. Try again.';
}

const dayNumbers: Record<string, number> = {
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
  minggu: 7,
};

export async function refreshTable(table: DataTable, attempt = 0): Promise<void> {
  if (!activeUserId) return;
  setTableStatus(table, { loading: true, error: null });

  try {
    const client = getClient();
    if (table === 'transactions') {
      const { data, error } = await client
        .from('transactions')
        .select('*')
        .eq('user_id', activeUserId)
        .order('tanggal', { ascending: false });
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
      const { data, error } = await client
        .from('classes')
        .select('*')
        .eq('user_id', activeUserId)
        .order('hari')
        .order('jam_mulai');
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
        daysOfWeek: dayNumbers[rowText(row, 'hari').toLowerCase()]
          ? [dayNumbers[rowText(row, 'hari').toLowerCase()]]
          : [],
        startTime: rowText(row, 'jam_mulai'),
        endTime: rowText(row, 'jam_selesai'),
        room: rowText(row, 'ruangan'),
        type: (['lecture', 'lab', 'tutorial', 'seminar'].includes(rowText(row, 'tipe'))
          ? rowText(row, 'tipe')
          : 'lecture') as ClassSession['type'],
      }));
    } else if (table === 'events') {
      const { data, error } = await client
        .from('events')
        .select('*')
        .eq('user_id', activeUserId)
        .order('tanggal');
      if (error) throw error;
      events = ((data || []) as DbRow[]).map((row) => ({
        id: rowText(row, 'id'),
        title: rowText(row, 'judul'),
        date: rowText(row, 'tanggal'),
        startTime: rowText(row, 'jam_mulai') || undefined,
        endTime: rowText(row, 'jam_selesai') || undefined,
        type: (['class', 'exam', 'deadline', 'personal'].includes(rowText(row, 'kategori'))
          ? rowText(row, 'kategori')
          : 'personal') as CalendarEvent['type'],
        courseId: rowText(row, 'class_id') || undefined,
        course: rowText(row, 'course') || undefined,
        location: rowText(row, 'lokasi') || undefined,
        notes: rowText(row, 'catatan') || undefined,
        color: rowText(row, 'warna') || undefined,
      }));
    } else if (table === 'assignments') {
      const { data, error } = await client
        .from('assignments')
        .select('*')
        .eq('user_id', activeUserId)
        .order('due_date');
      if (error) throw error;
      assignments = ((data || []) as DbRow[]).map((row) => ({
        id: rowText(row, 'id'),
        courseId: rowText(row, 'class_id') || undefined,
        category: rowText(row, 'class_id') ? 'classes' : 'personal',
        title: rowText(row, 'judul'),
        dueDate: `${rowText(row, 'due_date')}T${rowText(row, 'due_time', '23:59')}`,
        priority: (['low', 'medium', 'high'].includes(rowText(row, 'priority'))
          ? rowText(row, 'priority')
          : 'medium') as Assignment['priority'],
        status:
          rowText(row, 'status') === 'done'
            ? 'done'
            : rowText(row, 'status') === 'in_progress'
              ? 'in-progress'
              : 'not-started',
        notes: rowText(row, 'catatan') || undefined,
      }));
    } else if (table === 'profiles') {
      const query = activeUserId
        ? client
            .from('profiles')
            .select('full_name, university_email, avatar_url, omni_notes_access')
            .eq('id', activeUserId)
        : client.from('profiles').select('full_name, university_email, avatar_url, omni_notes_access');
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      const row = data as DbRow | null;
      profile = row
        ? {
            fullName: rowText(row, 'full_name'),
            universityEmail: rowText(row, 'university_email'),
            avatarUrl: rowText(row, 'avatar_url') || undefined,
            omniNotesAccess: Boolean(row.omni_notes_access),
          }
        : null;
    } else {
      const { data, error } = await client.from('user_settings').select('*').maybeSingle();
      if (error) throw error;
      const row = data as DbRow | null;
      settings = {
        ...settings,
        semesterStart: row ? rowText(row, 'term_start_date') : '',
        semesterEnd: row ? rowText(row, 'term_end_date') : '',
        monthlyBudget: row
          ? rowNumber(row, 'monthly_budget', settings.monthlyBudget)
          : settings.monthlyBudget,
        termName: row ? rowText(row, 'term_name') : '',
        firstDayOfWeek: row ? rowText(row, 'first_day_of_week', 'monday') : 'monday',
        notifEnabled: row ? row.notif_enabled !== false : true,
        currency: normalizeCurrency(row ? rowText(row, 'currency', 'IDR') : 'IDR'),
        theme: rowText(row || {}, 'theme', 'light') === 'dark' ? 'dark' : 'light',
        language: (localStorage.getItem('omnia_language') as 'en' | 'id') || 'id',
        paymentMethods:
          row && Array.isArray(row.payment_methods) && row.payment_methods.length > 0
            ? (row.payment_methods as string[])
            : undefined,
        chatHistory:
          row && Array.isArray(row.chat_history) ? (row.chat_history as ChatMessage[]) : undefined,
      };
      if (settings.chatHistory && settings.chatHistory.length > 0) {
        try {
          const trimmed = settings.chatHistory.slice(-50);
          localStorage.setItem(
            'omnia_omni_chat_session',
            JSON.stringify({ messages: trimmed, updatedAt: Date.now() })
          );
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
  await Promise.all(
    DATA_TABLES.filter((table) => table !== 'user_settings').map((table) => refreshTable(table))
  );
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
  settings = {
    semesterStart: '',
    semesterEnd: '',
    breakWeeks: [],
    monthlyBudget: 2500000,
    currency: 'IDR',
    theme: 'light',
  };
  tableStatus = emptyTableStatus(true);
  notify();
}

export function refreshUserData() {
  return activeUserId ? loadUserData(activeUserId) : Promise.resolve();
}

export function getDataStatus() {
  return tableStatus;
}

export function ownedRow(values: Record<string, unknown>) {
  if (!activeUserId) throw new Error('Sign in before saving data.');
  return { ...values, user_id: activeUserId };
}

const MUTATION_TIMEOUT_MS = 15000;

export async function mutateTable(
  table: DataTable,
  request: () => PromiseLike<{ error: { message: string } | null }>
): Promise<{ success: boolean; error?: string }> {
  setTableStatus(table, { loading: true, error: null });
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<{ error: { message: string } }>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error('Permintaan melebihi batas waktu (15 detik). Periksa koneksi internet Anda.')
      );
    }, MUTATION_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([request(), timeoutPromise]);
    clearTimeout(timeoutHandle!);
    if (result && 'error' in result && result.error) {
      throw result.error;
    }
    await refreshTable(table);
    return { success: true };
  } catch (error: unknown) {
    clearTimeout(timeoutHandle!);
    const msg = errorMessage(error);
    setTableStatus(table, { loading: false, error: msg });
    toast({
      message: `Gagal menyimpan ${table}: ${msg}`,
      type: 'error',
      duration: 5000,
    });
    return { success: false, error: msg };
  }
}

// Row builders
export function transactionRow(transaction: Omit<Transaction, 'id'> | Partial<Transaction>) {
  const row: Record<string, unknown> = {};
  const txType =
    transaction.type ||
    ('amount' in transaction && transaction.amount && transaction.amount > 0
      ? 'expense'
      : undefined);
  if ('date' in transaction) row.tanggal = transaction.date;
  if ('type' in transaction) row.tipe = transaction.type === 'income' ? 'pemasukan' : 'pengeluaran';
  if ('amount' in transaction)
    row.jumlah = Math.round((transaction.amount || 0) * getCurrencyScale(settings.currency));
  if ('category' in transaction)
    row.kategori = normalizeTransactionCategory(transaction.category, txType || 'expense');
  if ('merchant' in transaction) row.merchant = transaction.merchant;
  if ('paymentMethod' in transaction) row.payment_method = transaction.paymentMethod ?? null;
  if ('notes' in transaction) row.catatan = transaction.notes ?? null;
  return row;
}

export function eventRow(event: Partial<CalendarEvent>) {
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

export function assignmentRow(assignment: Partial<Assignment>) {
  const row: Record<string, unknown> = {};
  if ('courseId' in assignment) row.class_id = assignment.courseId ?? null;
  if ('title' in assignment) row.judul = assignment.title;
  if ('dueDate' in assignment) {
    const [date, time] = (assignment.dueDate || '').split('T');
    row.due_date = date;
    row.due_time = time || '23:59';
  }
  if ('status' in assignment)
    row.status =
      assignment.status === 'done'
        ? 'done'
        : assignment.status === 'in-progress'
          ? 'in_progress'
          : 'todo';
  if ('priority' in assignment) row.priority = assignment.priority;
  if ('notes' in assignment) row.catatan = assignment.notes ?? null;
  return row;
}

export function classRow(
  course: Course,
  session: Pick<ClassSession, 'startTime' | 'endTime' | 'room' | 'type'>,
  day: number
) {
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

// Reactive store listeners
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  listeners.forEach((fn) => fn());
}
