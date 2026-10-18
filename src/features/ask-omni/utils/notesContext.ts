import { getCachedNotes } from '@/lib/notesService';
import type { Note } from '@/types';

export interface NoteContextItem {
  id: string;
  title: string;
  snippet: string;
  tags: string[];
  updatedAt: string;
  courseId?: string;
}

/**
 * Builds privacy-compliant notes context for Omni requests from a given list of notes.
 * - If omniNotesAccess is FALSE: never sends notes unless explicitly asked about a specific noteId.
 * - If omniNotesAccess is TRUE: sends up to 15 relevant non-archived notes (max 300 chars per snippet, max ~4000 total chars).
 */
export function buildNotesContextFromList(
  notes: Note[],
  options: {
    userMessage?: string;
    omniNotesAccess?: boolean;
    activeNoteId?: string;
  }
): NoteContextItem[] {
  const { userMessage = '', omniNotesAccess, activeNoteId } = options;

  if (!omniNotesAccess) {
    if (!activeNoteId) return [];
    const note = notes.find((n) => n.id === activeNoteId);
    if (!note) return [];
    return [
      {
        id: note.id,
        title: note.title.trim() || 'Catatan',
        snippet: note.content.slice(0, 2000),
        tags: note.tags,
        updatedAt: note.updatedAt,
        courseId: note.courseId || undefined,
      },
    ];
  }

  const results: NoteContextItem[] = [];
  const seenIds = new Set<string>();
  let totalLength = 0;
  const MAX_NOTES = 15;
  const MAX_TOTAL_CHARS = 4000;

  // Active note first if present
  if (activeNoteId) {
    const active = notes.find((n) => n.id === activeNoteId);
    if (active && !active.isArchived) {
      const noteTitle = active.title.trim() || 'Catatan';
      const snippet = active.content.slice(0, 300);
      results.push({
        id: active.id,
        title: noteTitle,
        snippet,
        tags: active.tags,
        updatedAt: active.updatedAt,
        courseId: active.courseId || undefined,
      });
      seenIds.add(active.id);
      totalLength += noteTitle.length + snippet.length;
    }
  }

  const lowerQuery = userMessage.toLowerCase().trim();
  const candidates = notes.filter((n) => !n.isArchived && !seenIds.has(n.id));

  // Search matches
  if (lowerQuery) {
    const matching = candidates.filter(
      (n) =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.content.toLowerCase().includes(lowerQuery) ||
        n.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );

    for (const note of matching) {
      if (seenIds.has(note.id)) continue;
      const noteTitle = note.title.trim() || 'Catatan';
      const snippet = note.content.slice(0, 300);
      const itemLen = noteTitle.length + snippet.length;
      if (totalLength + itemLen > MAX_TOTAL_CHARS || results.length >= MAX_NOTES) break;
      results.push({
        id: note.id,
        title: noteTitle,
        snippet,
        tags: note.tags,
        updatedAt: note.updatedAt,
        courseId: note.courseId || undefined,
      });
      seenIds.add(note.id);
      totalLength += itemLen;
    }
  }

  // Pinned notes
  const pinned = candidates.filter((n) => n.isPinned && !seenIds.has(n.id));
  for (const note of pinned) {
    if (seenIds.has(note.id)) continue;
    const noteTitle = note.title.trim() || 'Catatan';
    const snippet = note.content.slice(0, 300);
    const itemLen = noteTitle.length + snippet.length;
    if (totalLength + itemLen > MAX_TOTAL_CHARS || results.length >= MAX_NOTES) break;
    results.push({
      id: note.id,
      title: noteTitle,
      snippet,
      tags: note.tags,
      updatedAt: note.updatedAt,
      courseId: note.courseId || undefined,
    });
    seenIds.add(note.id);
    totalLength += itemLen;
  }

  return results;
}

export async function buildNotesContext(params: {
  userMessage: string;
  omniNotesAccess?: boolean;
  activeNoteId?: string;
}): Promise<NoteContextItem[] | undefined> {
  const cached = getCachedNotes();
  const items = buildNotesContextFromList(cached, params);
  return items.length > 0 ? items : undefined;
}
