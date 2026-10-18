import type { UserSettings, UserProfile, ChatMessage } from '@/types';
import {
  settings,
  setSettings,
  profile,
  activeUserId,
  notify,
  getClient,
  ownedRow,
  mutateTable,
  setTableStatus,
  errorMessage,
  refreshTable,
  classSessions,
  courses,
  assignments,
  events,
} from '@/lib/dataStore';
import { normalizeCurrency } from '@/lib/currency';
import { localDateString, formatDetailedCountdown } from '@/lib/dateUtils';

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
  setSettings({ ...settings, ...data });
  if (settings.theme === 'dark' || settings.theme === 'light') {
    localStorage.setItem('omnia_theme', settings.theme);
  }
  if (settings.timeZone) {
    localStorage.setItem('omnia_timezone', settings.timeZone);
  }
  if (settings.initialBalance !== undefined) {
    localStorage.setItem('omnia_initial_balance', String(settings.initialBalance));
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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
let chatSyncTimeout: ReturnType<typeof setTimeout> | null = null;

export function getSavedChatHistory(): ChatMessage[] {
  if (settings.chatHistory && settings.chatHistory.length > 0) {
    return settings.chatHistory.slice(-50);
  }
  try {
    const saved = localStorage.getItem('omnia_omni_chat_session');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return (parsed as ChatMessage[]).slice(-50);
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.messages)) {
      if (typeof parsed.updatedAt === 'number' && Date.now() - parsed.updatedAt > SEVEN_DAYS_MS) {
        localStorage.removeItem('omnia_omni_chat_session');
        return [];
      }
      return (parsed.messages as ChatMessage[]).slice(-50);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveChatHistory(history: ChatMessage[]): void {
  const trimmed = history.slice(-50);
  setSettings({ ...settings, chatHistory: trimmed });
  try {
    localStorage.setItem(
      'omnia_omni_chat_session',
      JSON.stringify({ messages: trimmed, updatedAt: Date.now() })
    );
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
