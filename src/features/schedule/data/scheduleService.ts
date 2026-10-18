import type { Course, ClassSession, SessionException, CalendarEvent } from '@/types';
import {
  courses,
  setCourses,
  classSessions,
  setClassSessions,
  sessionExceptions,
  setSessionExceptions,
  events,
  setEvents,
  settings,
  activeUserId,
  genId,
  notify,
  getClient,
  ownedRow,
  mutateTable,
  setTableStatus,
  errorMessage,
  eventRow,
  classRow,
  persistSessionException,
  refreshTable,
} from '@/lib/dataStore';

// ─── Courses ───
export function getCourses(): Course[] {
  return courses;
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function addCourse(course: Omit<Course, 'id'>): Course {
  const newCourse = { ...course, id: genId() };
  setCourses([...courses, newCourse]);
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

export async function deleteCourse(id: string): Promise<boolean> {
  const existingCourse = courses.find((c) => c.id === id);
  const existingSessions = classSessions.filter((s) => s.courseId === id || s.id === id);

  setCourses(courses.filter((c) => c.id !== id));
  setClassSessions(classSessions.filter((s) => s.courseId !== id && s.id !== id));
  notify();

  try {
    const res = await mutateTable('classes', () =>
      getClient().from('classes').delete().eq('id', id).eq('user_id', activeUserId)
    );
    if (!res.success) {
      if (existingCourse) setCourses([...courses, existingCourse]);
      setClassSessions([...classSessions, ...existingSessions]);
      notify();
      throw new Error(res.error || 'Gagal menghapus mata kuliah');
    }
    return true;
  } catch (err) {
    if (existingCourse && !courses.some((c) => c.id === id)) {
      setCourses([...courses, existingCourse]);
      setClassSessions([...classSessions, ...existingSessions]);
      notify();
    }
    throw err;
  }
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
    setSessionExceptions([
      ...sessionExceptions.slice(0, existingIndex),
      updated,
      ...sessionExceptions.slice(existingIndex + 1),
    ]);
    notify();
    return updated;
  }
  const newExc = { ...exc, id: genId() };
  await persistSessionException(newExc);
  setSessionExceptions([...sessionExceptions, newExc]);
  notify();
  return newExc;
}

export function updateSessionException(id: string, data: Partial<SessionException>): void {
  setSessionExceptions(
    sessionExceptions.map((e) => (e.id === id ? { ...e, ...data } : e))
  );
  const updated = sessionExceptions.find((e) => e.id === id);
  if (updated) persistSessionException(updated);
  notify();
}

export function deleteSessionException(id: string): void {
  setSessionExceptions(sessionExceptions.filter((e) => e.id !== id));
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

export async function deleteEvent(id: string): Promise<CalendarEvent | null> {
  const existing = events.find((e) => e.id === id);
  if (!existing) return null;

  setEvents(events.filter((e) => e.id !== id));
  unpinEvent(id);
  notify();

  try {
    const res = await mutateTable('events', () =>
      getClient().from('events').delete().eq('id', id).eq('user_id', activeUserId)
    );
    if (!res.success) {
      setEvents([...events, existing]);
      notify();
      throw new Error(res.error || 'Gagal menghapus kegiatan');
    }
    return existing;
  } catch (err) {
    if (!events.some((e) => e.id === id)) {
      setEvents([...events, existing]);
      notify();
    }
    throw err;
  }
}

export async function restoreEvent(event: CalendarEvent): Promise<CalendarEvent> {
  if (!events.some((e) => e.id === event.id)) {
    setEvents([...events, event]);
    notify();
  }
  const { error } = await getClient().from('events').insert(ownedRow(eventRow(event)));
  if (error) {
    setEvents(events.filter((e) => e.id !== event.id));
    notify();
    throw error;
  }
  await refreshTable('events');
  return event;
}

// ─── Pinned Events Management ───
let pinnedEventIds: string[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_pinned_events');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

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
