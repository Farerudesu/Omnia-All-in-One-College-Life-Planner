import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import type { NoteInput, NoteFilter } from '@/types';
import * as notesService from './notesService';
import { toast } from '@/components/Toast';
import { getLanguage, translations } from './i18n';

export function useNotes(initialFilter?: NoteFilter) {
  const [filter, setFilter] = useState<NoteFilter | undefined>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback((callback: () => void) => {
    return notesService.subscribeNotes(callback);
  }, []);

  const getSnapshot = useCallback(() => {
    return notesService.getCachedNotes();
  }, []);

  const allCached = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const fetchNotes = useCallback(async (currentFilter?: NoteFilter) => {
    setLoading(true);
    setError(null);
    try {
      await notesService.listNotes(currentFilter);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotes(filter);
  }, [fetchNotes, filter]);

  const create = useCallback(async (input: NoteInput) => {
    try {
      const created = await notesService.createNote(input);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create note';
      toast({ message: msg, type: 'error' });
      throw err;
    }
  }, []);

  const update = useCallback(async (id: string, patch: Partial<NoteInput>) => {
    try {
      const updated = await notesService.updateNote(id, patch);
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update note';
      toast({ message: msg, type: 'error' });
      throw err;
    }
  }, []);

  // Optimistic toggle pin with rollback
  const togglePin = useCallback(
    async (id: string) => {
      const previous = notesService.getCachedNotes();
      const target = previous.find((n) => n.id === id);
      if (!target) return;

      try {
        await notesService.togglePin(id);
      } catch (err: unknown) {
        // Rollback on failure
        notesService.clearNotesCache();
        void fetchNotes(filter);
        const lang = getLanguage();
        toast({ message: translations[lang].notes.saveError, type: 'error' });
        throw err;
      }
    },
    [fetchNotes, filter]
  );

  // Optimistic toggle archive with rollback
  const toggleArchive = useCallback(
    async (id: string) => {
      const previous = notesService.getCachedNotes();
      const target = previous.find((n) => n.id === id);
      if (!target) return;

      try {
        await notesService.toggleArchive(id);
      } catch (err: unknown) {
        notesService.clearNotesCache();
        void fetchNotes(filter);
        const lang = getLanguage();
        toast({ message: translations[lang].notes.saveError, type: 'error' });
        throw err;
      }
    },
    [fetchNotes, filter]
  );

  // Optimistic delete with rollback
  const remove = useCallback(
    async (id: string) => {
      try {
        await notesService.deleteNote(id);
      } catch (err: unknown) {
        void fetchNotes(filter);
        const lang = getLanguage();
        toast({ message: translations[lang].notes.saveError, type: 'error' });
        throw err;
      }
    },
    [fetchNotes, filter]
  );

  return {
    notes: allCached,
    loading,
    error,
    filter,
    setFilter,
    refresh: fetchNotes,
    create,
    update,
    remove,
    togglePin,
    toggleArchive,
  };
}
