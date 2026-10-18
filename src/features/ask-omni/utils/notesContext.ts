import { searchNotes, getCachedNotes, getNote } from '@/lib/notesService';

export interface NoteContextItem {
  id: string;
  title: string;
  snippet: string;
  tags: string[];
  updatedAt: string;
  courseId?: string;
}

/**
 * Builds privacy-compliant notes context for Omni requests.
 * - If omniNotesAccess is FALSE: never sends notes unless explicitly asked about a specific noteId.
 * - If omniNotesAccess is TRUE: sends up to 15 relevant non-archived notes (max 300 chars per snippet, max ~4000 total chars).
 */
export async function buildNotesContext(params: {
  userMessage: string;
  omniNotesAccess?: boolean;
  activeNoteId?: string;
}): Promise<NoteContextItem[] | undefined> {
  const { userMessage, omniNotesAccess, activeNoteId } = params;

  // Case 1: Opt-in is FALSE
  if (!omniNotesAccess) {
    if (!activeNoteId) {
      return undefined;
    }
    // Specific single note explicitly chosen by user
    const note = getCachedNotes().find((n) => n.id === activeNoteId) || (await getNote(activeNoteId));
    if (!note) return undefined;

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

  // Case 2: Opt-in is TRUE
  const results: NoteContextItem[] = [];
  const seenIds = new Set<string>();
  let totalLength = 0;
  const MAX_NOTES = 15;
  const MAX_TOTAL_CHARS = 4000;

  // If there's an active note, prioritize it first
  if (activeNoteId) {
    const active = getCachedNotes().find((n) => n.id === activeNoteId) || (await getNote(activeNoteId));
    if (active && !active.isArchived) {
      const snippet = active.content.slice(0, 300);
      results.push({
        id: active.id,
        title: active.title.trim() || 'Catatan',
        snippet,
        tags: active.tags,
        updatedAt: active.updatedAt,
        courseId: active.courseId || undefined,
      });
      seenIds.add(active.id);
      totalLength += snippet.length;
    }
  }

  // Search relevant notes
  try {
    const searched = await searchNotes(userMessage, 10);
    for (const note of searched) {
      if (seenIds.has(note.id) || note.isArchived) continue;
      const snippet = note.content.slice(0, 300);
      if (totalLength + snippet.length > MAX_TOTAL_CHARS || results.length >= MAX_NOTES) break;

      results.push({
        id: note.id,
        title: note.title.trim() || 'Catatan',
        snippet,
        tags: note.tags,
        updatedAt: note.updatedAt,
        courseId: note.courseId || undefined,
      });
      seenIds.add(note.id);
      totalLength += snippet.length;
    }
  } catch {
    // searchNotes fallback
  }

  // Add recent pinned notes
  const cached = getCachedNotes();
  const pinned = cached.filter((n) => n.isPinned && !n.isArchived);
  for (const note of pinned) {
    if (seenIds.has(note.id)) continue;
    const snippet = note.content.slice(0, 300);
    if (totalLength + snippet.length > MAX_TOTAL_CHARS || results.length >= MAX_NOTES) break;

    results.push({
      id: note.id,
      title: note.title.trim() || 'Catatan',
      snippet,
      tags: note.tags,
      updatedAt: note.updatedAt,
      courseId: note.courseId || undefined,
    });
    seenIds.add(note.id);
    totalLength += snippet.length;
  }

  return results.length > 0 ? results : undefined;
}
