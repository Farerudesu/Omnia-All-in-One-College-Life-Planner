import type { CalendarEvent, Course } from '../types';
import * as ds from './dataService';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '662779762345-s1vc2c67ls6po36ebht8dlgj989lshje.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar';
const CALENDAR_NAME = 'Omnia College Life';

interface StoredAuth {
  accessToken: string;
  expiresAt: number;
  email?: string;
  calendarId?: string;
}

let authState: StoredAuth | null = (() => {
  try {
    const raw = localStorage.getItem('omnia_gcal_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.accessToken === 'string') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
})();

let tokenClient: any = null;
let importedGoogleEvents: CalendarEvent[] = (() => {
  try {
    const raw = localStorage.getItem('omnia_gcal_imported_events');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Error in google calendar listener:', e);
    }
  });
}

export function subscribeGoogleCalendar(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getImportedGoogleEvents(): CalendarEvent[] {
  return importedGoogleEvents;
}

function saveImportedGoogleEvents(events: CalendarEvent[]) {
  importedGoogleEvents = events;
  try {
    localStorage.setItem('omnia_gcal_imported_events', JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save imported google events:', err);
  }
  notifyListeners();
}

function saveAuthState(state: StoredAuth | null) {
  authState = state;
  if (!state) {
    localStorage.removeItem('omnia_gcal_auth');
  } else {
    try {
      localStorage.setItem('omnia_gcal_auth', JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save auth state:', err);
    }
  }
  notifyListeners();
}

/**
 * Ensures Google Identity Services (GIS) client library is loaded.
 */
export async function ensureGisLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(Boolean(window.google?.accounts?.oauth2));
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve(Boolean(window.google?.accounts?.oauth2));
    };
    script.onerror = () => {
      console.error('Failed to load Google Identity Services');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Check if the user is currently connected to Google Calendar and token hasn't expired.
 */
export function isGoogleCalendarConnected(): boolean {
  if (!authState?.accessToken) return false;
  return Date.now() < authState.expiresAt - 60000;
}

export function getConnectedGoogleEmail(): string | undefined {
  return authState?.email;
}

/**
 * Obtains a valid access token. Prompts consent if expired.
 */
export async function getValidAccessToken(forceConsent = false): Promise<string> {
  if (!forceConsent && authState?.accessToken && Date.now() < authState.expiresAt - 60000) {
    return authState.accessToken;
  }

  const loaded = await ensureGisLoaded();
  if (!loaded || !window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services could not be loaded.');
  }

  return new Promise((resolve, reject) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error || 'Google authorization failed'));
            return;
          }

          const token = resp.access_token;
          const expiresIn = Number(resp.expires_in) || 3600;
          const expiresAt = Date.now() + expiresIn * 1000;

          // Fetch user email
          let email = authState?.email;
          try {
            const userinfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json());
            if (userinfo?.email) email = userinfo.email;
          } catch {
            // non-fatal
          }

          saveAuthState({
            accessToken: token,
            expiresAt,
            email,
            calendarId: authState?.calendarId || 'primary',
          });

          resolve(token);
        },
      });

      tokenClient.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Connect to Google Calendar. Defaults to 'primary' for maximum visibility on all devices.
 */
export async function connectGoogleCalendar(): Promise<{ email: string; calendarId: string }> {
  const token = await getValidAccessToken(true);

  // Fetch user email
  let email = 'Google User';
  try {
    const userinfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    if (userinfo?.email) email = userinfo.email;
  } catch (e) {
    console.warn('Could not fetch Google user info:', e);
  }

  // Use primary by default so events appear directly on user's main calendar
  const calendarId = 'primary';

  saveAuthState({
    accessToken: token,
    expiresAt: authState?.expiresAt || Date.now() + 3600 * 1000,
    email,
    calendarId,
  });

  // Save settings in dataService
  try {
    await ds.updateSettings({
      googleCalendarSyncEnabled: true,
      googleCalendarId: calendarId,
      googleCalendarName: 'Primary Calendar',
      googleAccountEmail: email,
      googleSyncClasses: true,
      googleSyncAssignments: true,
      googleSyncEvents: true,
      googleImportPersonal: true,
      googleCalendarTarget: 'primary',
    });
  } catch (err) {
    console.warn('Could not update user settings with Google Calendar info:', err);
  }

  return { email, calendarId };
}

/**
 * Disconnect Google Calendar and clear local sync caches.
 */
export async function disconnectGoogleCalendar(): Promise<void> {
  if (authState?.accessToken && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(authState.accessToken, () => {});
    } catch {
      // ignore
    }
  }

  saveAuthState(null);
  saveImportedGoogleEvents([]);

  try {
    await ds.updateSettings({
      googleCalendarSyncEnabled: false,
      googleCalendarId: undefined,
      googleAccountEmail: undefined,
      googleLastSynced: undefined,
    });
  } catch (err) {
    console.warn('Could not update settings on disconnect:', err);
  }
}

/**
 * Locate existing "Omnia College Life" secondary calendar or create a new one.
 */
export async function getOrCreateOmniaCalendar(token: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn('Failed to list Google Calendars, falling back to primary:', errText);
    return 'primary';
  }

  const data = await res.json();
  const existing = (data.items || []).find((c: any) => c.summary === CALENDAR_NAME && !c.deleted);

  if (existing) {
    return existing.id;
  }

  // Create new secondary calendar
  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'Asia/Jakarta';

  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: CALENDAR_NAME,
      description: 'Classes, assignments, exams, and schedule synced from Omnia College Life Planner',
      timeZone,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.warn('Failed to create secondary calendar, falling back to primary:', errText);
    return 'primary';
  }

  const newCal = await createRes.json();
  return newCal.id;
}

const DAY_MAP_RFC: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

function getNextOccurrenceOf(dayOfWeek: number, baseDate = new Date()): Date {
  const result = new Date(baseDate);
  const currentDay = result.getDay() === 0 ? 7 : result.getDay();
  let diff = dayOfWeek - currentDay;
  if (diff < 0) diff += 7;
  result.setDate(result.getDate() + diff);
  return result;
}

function formatDateRFC5545(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export interface SyncPushResult {
  pushedCount: number;
  classesCount: number;
  assignmentsCount: number;
  eventsCount: number;
  errors: string[];
}

/**
 * Push Omnia classes, assignments, and events to Google Calendar.
 */
export async function pushOmniaToGoogleCalendar(options?: {
  syncClasses?: boolean;
  syncAssignments?: boolean;
  syncEvents?: boolean;
  targetCalendarId?: string;
}): Promise<SyncPushResult> {
  const token = await getValidAccessToken();
  const settings = ds.getSettings();

  // Use user's preferred calendar or 'primary'
  const calendarId =
    options?.targetCalendarId ||
    settings.googleCalendarId ||
    authState?.calendarId ||
    'primary';

  const courses = ds.getCourses();
  const sessions = ds.getClassSessions();
  const assignments = ds.getAssignments();
  const events = ds.getEvents();

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  const syncClasses = options?.syncClasses ?? settings.googleSyncClasses ?? true;
  const syncAssignments = options?.syncAssignments ?? settings.googleSyncAssignments ?? true;
  const syncEvents = options?.syncEvents ?? settings.googleSyncEvents ?? true;

  // Fetch existing events in the calendar to avoid duplicate additions
  const existingMap = new Map<string, string>(); // omniaId -> googleEventId
  try {
    const existingEventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=2500`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (existingEventsRes.ok) {
      const existingData = await existingEventsRes.json();
      for (const item of existingData.items || []) {
        const omniaId = item.extendedProperties?.private?.omniaId;
        if (omniaId) {
          existingMap.set(omniaId, item.id);
        }
      }
    }
  } catch (err) {
    console.warn('Could not list existing Google Calendar events:', err);
  }

  let classesCount = 0;
  let assignmentsCount = 0;
  let eventsCount = 0;
  const errors: string[] = [];

  const timeZone =
    settings.timeZone ||
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Jakarta');

  // Semester boundaries
  let untilDate = new Date();
  if (settings.semesterEnd) {
    const [y, m, d] = settings.semesterEnd.split('-').map(Number);
    untilDate = new Date(y, m - 1, d, 23, 59, 59);
  } else {
    untilDate.setDate(untilDate.getDate() + 16 * 7);
  }
  const untilRFC = formatDateRFC5545(untilDate);

  // 1. Sync Recurring Classes
  if (syncClasses) {
    for (const s of sessions) {
      if (!s.daysOfWeek || s.daysOfWeek.length === 0) continue;
      const course = courseMap.get(s.courseId);
      const title = course ? `${course.code ? `[${course.code}] ` : ''}${course.name}` : 'Class Session';
      const omniaId = `class-${s.id}`;

      const firstDay = s.daysOfWeek[0];
      const nextDate = getNextOccurrenceOf(firstDay);
      const [startH, startM] = (s.startTime || '08:00').split(':').map(Number);
      const [endH, endM] = (s.endTime || '10:00').split(':').map(Number);

      const startDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate(), startH, startM);
      let endDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate(), endH, endM);
      if (endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(startDate.getTime() + 90 * 60000);
      }

      const byDayStr = s.daysOfWeek.map((d) => DAY_MAP_RFC[d]).filter(Boolean).join(',');
      const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDayStr};UNTIL=${untilRFC}`;

      const payload = {
        summary: title,
        location: s.room ? `Room: ${s.room}` : undefined,
        description: `Professor: ${course?.professor || 'TBA'}\nType: ${s.type.toUpperCase()}\n[Omnia] Synced automatically`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone,
        },
        recurrence: [rrule],
        colorId: '2', // Sage / Green
        extendedProperties: {
          private: {
            omniaId,
            omniaType: 'class',
          },
        },
      };

      const existingId = existingMap.get(omniaId);
      const url = existingId
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingId}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

      const method = existingId ? 'PATCH' : 'POST';

      try {
        const resp = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          classesCount++;
        } else {
          const errText = await resp.text();
          console.error(`Google API class push failed (${resp.status}):`, errText);
          errors.push(`Class "${title}": ${resp.status}`);
        }
      } catch (e: any) {
        console.warn('Failed to push class to Google Calendar:', title, e);
        errors.push(`Class "${title}": ${e?.message || 'Error'}`);
      }
    }
  }

  // 2. Sync Assignments & Tasks
  if (syncAssignments) {
    for (const a of assignments) {
      if (!a.dueDate) continue;
      const omniaId = `assignment-${a.id}`;
      const course = a.courseId ? courseMap.get(a.courseId) : undefined;
      const title = `📝 [Task] ${a.title}`;

      let dueDateObj: Date;
      if (a.dueDate.includes('T')) {
        const [dPart, tPart] = a.dueDate.split('T');
        const [y, m, d] = dPart.split('-').map(Number);
        const [hh, mm] = (tPart || '23:59').slice(0, 5).split(':').map(Number);
        dueDateObj = new Date(y, m - 1, d, hh || 23, mm || 59, 0);
      } else {
        const [y, m, d] = a.dueDate.split('-').map(Number);
        dueDateObj = new Date(y, m - 1, d, 23, 59, 0);
      }

      if (isNaN(dueDateObj.getTime())) {
        dueDateObj = new Date();
      }

      const endIso = new Date(dueDateObj.getTime() + 30 * 60000).toISOString();

      const payload = {
        summary: title,
        description: `Course: ${course?.name || 'General'}\nPriority: ${a.priority.toUpperCase()}\nStatus: ${a.status}\nNotes: ${a.notes || 'None'}\n[Omnia] Synced task`,
        start: {
          dateTime: dueDateObj.toISOString(),
          timeZone,
        },
        end: {
          dateTime: endIso,
          timeZone,
        },
        colorId: a.priority === 'high' ? '11' : a.priority === 'medium' ? '5' : '8',
        extendedProperties: {
          private: {
            omniaId,
            omniaType: 'assignment',
          },
        },
      };

      const existingId = existingMap.get(omniaId);
      const url = existingId
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingId}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

      const method = existingId ? 'PATCH' : 'POST';

      try {
        const resp = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          assignmentsCount++;
        } else {
          const errText = await resp.text();
          console.error(`Google API task push failed (${resp.status}):`, errText);
          errors.push(`Task "${a.title}": ${resp.status}`);
        }
      } catch (e: any) {
        console.warn('Failed to push assignment to Google Calendar:', a.title, e);
        errors.push(`Task "${a.title}": ${e?.message || 'Error'}`);
      }
    }
  }

  // 3. Sync Calendar Events (Exams, Personal, Lab, e.g. "instalasi")
  if (syncEvents) {
    for (const ev of events) {
      if (ev.isGoogleEvent) continue; // Don't push back imported Google events!
      const omniaId = `event-${ev.id}`;
      const prefix = ev.type === 'exam' ? '🎯 [Exam] ' : ev.type === 'lab' ? '🔬 [Lab] ' : '';
      const title = `${prefix}${ev.title}`;

      let startPayload: any;
      let endPayload: any;

      if (!ev.startTime) {
        // All-day event in Google Calendar
        const [y, m, d] = ev.date.split('-').map(Number);
        const nextDayDate = new Date(y, m - 1, (d || 1) + 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        const nextDateStr = `${nextDayDate.getFullYear()}-${pad(nextDayDate.getMonth() + 1)}-${pad(nextDayDate.getDate())}`;

        startPayload = { date: ev.date };
        endPayload = { date: nextDateStr };
      } else {
        // Timed event
        const [y, m, d] = ev.date.split('-').map(Number);
        const [startH, startM] = ev.startTime.split(':').map(Number);
        const startObj = new Date(y, m - 1, d, startH || 0, startM || 0, 0);

        let endObj: Date;
        if (ev.endTime && ev.endTime !== ev.startTime) {
          const [endH, endM] = ev.endTime.split(':').map(Number);
          endObj = new Date(y, m - 1, d, endH || (startH + 1), endM || 0, 0);
          if (endObj.getTime() <= startObj.getTime()) {
            endObj = new Date(startObj.getTime() + 60 * 60000);
          }
        } else {
          endObj = new Date(startObj.getTime() + 60 * 60000); // 1 hour duration
        }

        startPayload = { dateTime: startObj.toISOString(), timeZone };
        endPayload = { dateTime: endObj.toISOString(), timeZone };
      }

      const payload = {
        summary: title,
        location: ev.location || undefined,
        description: ev.notes ? `${ev.notes}\n[Omnia] Synced event` : '[Omnia] Synced event',
        start: startPayload,
        end: endPayload,
        colorId: ev.type === 'exam' ? '11' : ev.type === 'lab' ? '9' : '7',
        extendedProperties: {
          private: {
            omniaId,
            omniaType: 'event',
          },
        },
      };

      const existingId = existingMap.get(omniaId);
      const url = existingId
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingId}`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

      const method = existingId ? 'PATCH' : 'POST';

      try {
        const resp = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          eventsCount++;
        } else {
          const errText = await resp.text();
          console.error(`Google API event push failed for "${title}" (${resp.status}):`, errText);
          errors.push(`Event "${title}": ${resp.status}`);
        }
      } catch (e: any) {
        console.warn('Failed to push event to Google Calendar:', ev.title, e);
        errors.push(`Event "${title}": ${e?.message || 'Error'}`);
      }
    }
  }

  const pushedCount = classesCount + assignmentsCount + eventsCount;
  return {
    pushedCount,
    classesCount,
    assignmentsCount,
    eventsCount,
    errors,
  };
}

/**
 * Pull events from the user's Primary Google Calendar into Omnia.
 * Filters out Omnia events to avoid duplicates.
 */
export async function pullGoogleCalendarEvents(
  rangeStart?: Date,
  rangeEnd?: Date
): Promise<CalendarEvent[]> {
  const token = await getValidAccessToken();

  const now = new Date();
  const timeMin = rangeStart || new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const timeMax = rangeEnd || new Date(now.getFullYear(), now.getMonth() + 4, 1);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin.toISOString()
  )}&timeMax=${encodeURIComponent(timeMax.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=500`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to pull Google Calendar events: ${errText}`);
  }

  const data = await resp.json();
  const items = data.items || [];

  const pulledEvents: CalendarEvent[] = [];

  for (const item of items) {
    // Skip events created by Omnia
    if (item.extendedProperties?.private?.omniaId) continue;
    if (
      item.summary?.includes('[Omnia]') ||
      item.description?.includes('[Omnia]') ||
      item.description?.includes('Omnia College Life Planner')
    ) {
      continue;
    }

    const start = item.start?.dateTime || item.start?.date;
    const end = item.end?.dateTime || item.end?.date;
    if (!start) continue;

    const startDate = new Date(start);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;

    let startTime: string | undefined;
    let endTime: string | undefined;

    if (item.start?.dateTime) {
      startTime = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
      if (end) {
        const endDate = new Date(end);
        endTime = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
      }
    }

    pulledEvents.push({
      id: `gcal-${item.id}`,
      title: item.summary || '(No title)',
      date: dateStr,
      startTime,
      endTime,
      type: 'personal',
      location: item.location || undefined,
      notes: item.description || undefined,
      googleEventId: item.id,
      isGoogleEvent: true,
      htmlLink: item.htmlLink,
      color: '#4285F4',
    });
  }

  saveImportedGoogleEvents(pulledEvents);
  return pulledEvents;
}

/**
 * Execute full two-way synchronization: Push Omnia -> Google, Pull Google -> Omnia.
 */
export async function syncTwoWay(): Promise<{
  pushedCount: number;
  classesCount: number;
  assignmentsCount: number;
  eventsCount: number;
  pulledCount: number;
  errors: string[];
  lastSynced: string;
}> {
  const pushRes = await pushOmniaToGoogleCalendar();
  const pulled = await pullGoogleCalendarEvents();
  const lastSynced = new Date().toISOString();

  try {
    await ds.updateSettings({
      googleLastSynced: lastSynced,
    });
  } catch (err) {
    console.warn('Could not save googleLastSynced to settings:', err);
  }

  return {
    pushedCount: pushRes.pushedCount,
    classesCount: pushRes.classesCount,
    assignmentsCount: pushRes.assignmentsCount,
    eventsCount: pushRes.eventsCount,
    pulledCount: pulled.length,
    errors: pushRes.errors,
    lastSynced,
  };
}
