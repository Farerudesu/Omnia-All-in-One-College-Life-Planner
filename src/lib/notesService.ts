import { supabase } from './supabase';
import type { Note, NoteInput, NoteFilter } from '@/types';
import { translations, getLanguage } from './i18n';

let cachedNotes: Note[] = [];
const listeners = new Set<(notes: Note[]) => void>();

function notify() {
  const current = [...cachedNotes];
  listeners.forEach((listener) => listener(current));
}

export function subscribeNotes(listener: (notes: Note[]) => void): () => void {
  listeners.add(listener);
  listener([...cachedNotes]);
  return () => {
    listeners.delete(listener);
  };
}

export function getCachedNotes(): Note[] {
  return [...cachedNotes];
}

export function clearNotesCache(): void {
  cachedNotes = [];
  notify();
}

function getClient() {
  if (!supabase) {
    throw new Error(
      getLanguage() === 'id'
        ? 'Supabase belum terkonfigurasi. Periksa file .env Anda.'
        : 'Supabase is not configured. Please check your .env file.'
    );
  }
  return supabase;
}

function mapRowToNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title || ''),
    content: String(row.content || ''),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    color: row.color ? String(row.color) : null,
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived),
    courseId: row.course_id ? String(row.course_id) : null,
    assignmentId: row.assignment_id ? String(row.assignment_id) : null,
    eventId: row.event_id ? String(row.event_id) : null,
    source: row.source === 'omni' ? 'omni' : 'manual',
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function getErrorMessage(error: unknown, fallbackKey: 'saveError' | 'loadError'): string {
  const lang = getLanguage();
  const defaultMsg = translations[lang].notes[fallbackKey];
  if (error instanceof Error && error.message) {
    return `${defaultMsg} (${error.message})`;
  }
  return defaultMsg;
}

export async function listNotes(filter?: NoteFilter): Promise<Note[]> {
  const client = getClient();
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  let query = client
    .from('notes')
    .select('*')
    .eq('user_id', userId);

  if (filter?.isArchived !== undefined) {
    query = query.eq('is_archived', filter.isArchived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (filter?.isPinned !== undefined) {
    query = query.eq('is_pinned', filter.isPinned);
  }

  if (filter?.courseId) {
    query = query.eq('course_id', filter.courseId);
  }

  if (filter?.tag) {
    query = query.contains('tags', [filter.tag]);
  }

  query = query
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  try {
    const { data, error } = await query;
    if (error) throw error;
    const notes = ((data || []) as Record<string, unknown>[]).map(mapRowToNote);
    cachedNotes = notes;
    notify();
    return notes;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, 'loadError'));
  }
}

export async function getNote(id: string): Promise<Note | null> {
  const client = getClient();
  try {
    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapRowToNote(data as Record<string, unknown>);
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, 'loadError'));
  }
}

export async function createNote(input: NoteInput): Promise<Note> {
  const client = getClient();
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error(
      getLanguage() === 'id' ? 'Masuk terlebih dahulu untuk membuat catatan.' : 'Sign in to create a note.'
    );
  }

  const payload = {
    user_id: userId,
    title: input.title.trim().slice(0, 200),
    content: input.content.slice(0, 50000),
    tags: (input.tags || []).slice(0, 10).map((t) => t.trim().slice(0, 30)),
    color: input.color || null,
    is_pinned: input.isPinned ?? false,
    is_archived: input.isArchived ?? false,
    course_id: input.courseId || null,
    assignment_id: input.assignmentId || null,
    event_id: input.eventId || null,
    source: input.source || 'manual',
  };

  try {
    const { data, error } = await client
      .from('notes')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    const note = mapRowToNote(data as Record<string, unknown>);
    cachedNotes = [note, ...cachedNotes];
    notify();
    return note;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, 'saveError'));
  }
}

export async function updateNote(id: string, patch: Partial<NoteInput>): Promise<Note> {
  const client = getClient();

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim().slice(0, 200);
  if (patch.content !== undefined) payload.content = patch.content.slice(0, 50000);
  if (patch.tags !== undefined)
    payload.tags = patch.tags.slice(0, 10).map((t) => t.trim().slice(0, 30));
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.isPinned !== undefined) payload.is_pinned = patch.isPinned;
  if (patch.isArchived !== undefined) payload.is_archived = patch.isArchived;
  if (patch.courseId !== undefined) payload.course_id = patch.courseId;
  if (patch.assignmentId !== undefined) payload.assignment_id = patch.assignmentId;
  if (patch.eventId !== undefined) payload.event_id = patch.eventId;
  if (patch.source !== undefined) payload.source = patch.source;

  try {
    const { data, error } = await client
      .from('notes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    const updated = mapRowToNote(data as Record<string, unknown>);
    cachedNotes = cachedNotes.map((n) => (n.id === id ? updated : n));
    notify();
    return updated;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, 'saveError'));
  }
}

export async function deleteNote(id: string): Promise<void> {
  const client = getClient();
  try {
    const { error } = await client.from('notes').delete().eq('id', id);
    if (error) throw error;
    cachedNotes = cachedNotes.filter((n) => n.id !== id);
    notify();
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, 'saveError'));
  }
}

export async function togglePin(id: string): Promise<Note> {
  const current = cachedNotes.find((n) => n.id === id);
  const nextPinned = current ? !current.isPinned : true;
  return updateNote(id, { isPinned: nextPinned });
}

export async function toggleArchive(id: string): Promise<Note> {
  const current = cachedNotes.find((n) => n.id === id);
  const nextArchived = current ? !current.isArchived : true;
  return updateNote(id, { isArchived: nextArchived });
}

export async function searchNotes(q: string, limit = 20): Promise<Note[]> {
  const client = getClient();
  const trimmed = q.trim();

  try {
    const { data, error } = await client.rpc('search_notes', {
      q: trimmed,
      limit_n: limit,
    });
    if (error) {
      // Fallback to client-side search if RPC is not deployed yet in development
      const lower = trimmed.toLowerCase();
      return cachedNotes.filter((note) => {
        if (note.isArchived) return false;
        if (!lower) return true;
        return (
          note.title.toLowerCase().includes(lower) ||
          note.content.toLowerCase().includes(lower) ||
          note.tags.some((t) => t.toLowerCase().includes(lower))
        );
      });
    }
    return ((data || []) as Record<string, unknown>[]).map(mapRowToNote);
  } catch {
    const lower = trimmed.toLowerCase();
    return cachedNotes.filter((note) => {
      if (note.isArchived) return false;
      if (!lower) return true;
      return (
        note.title.toLowerCase().includes(lower) ||
        note.content.toLowerCase().includes(lower) ||
        note.tags.some((t) => t.toLowerCase().includes(lower))
      );
    });
  }
}

export function validateNoteInput(input: Partial<NoteInput>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (input.title.length > 200) {
      errors.push('Title must be at most 200 characters');
    }
  }
  if (input.content !== undefined && input.content.length > 50000) {
    errors.push('Content must be at most 50,000 characters');
  }
  if (input.tags !== undefined) {
    if (input.tags.length > 10) {
      errors.push('Tags cannot exceed 10 items');
    }
    for (const tag of input.tags) {
      if (tag.length > 30) {
        errors.push(`Tag "${tag}" exceeds 30 characters`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function filterNotesInMemory(notes: Note[], filter: NoteFilter): Note[] {
  return notes.filter((note) => {
    if (filter.isArchived !== undefined && note.isArchived !== filter.isArchived) {
      return false;
    }
    if (filter.isPinned !== undefined && note.isPinned !== filter.isPinned) {
      return false;
    }
    if (filter.courseId && note.courseId !== filter.courseId) {
      return false;
    }
    if (filter.tag && !note.tags.includes(filter.tag)) {
      return false;
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      const matchTag = note.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTag) {
        return false;
      }
    }
    return true;
  });
}
