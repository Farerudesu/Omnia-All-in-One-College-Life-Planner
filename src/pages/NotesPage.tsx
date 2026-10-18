import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, StickyNote, RefreshCw, AlertCircle } from 'lucide-react';
import { useNotes } from '@/lib/useNotes';
import { useData } from '@/lib/useData';
import * as ds from '@/lib/dataService';
import type { Note, NoteFilter, Course } from '@/types';
import { NotesList } from '@/features/notes/components/NotesList';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import { NoteFilters } from '@/features/notes/components/NoteFilters';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useLanguage } from '@/lib/useLanguage';
import { translations } from '@/lib/i18n';

export function NotesPage() {
  const lang = useLanguage();
  const t = translations[lang].notes;
  const [searchParams, setSearchParams] = useSearchParams();
  const openIdParam = searchParams.get('open');

  const {
    notes,
    loading,
    error,
    filter,
    setFilter,
    create,
    update,
    remove,
    togglePin,
    toggleArchive,
    refresh,
  } = useNotes();

  const courses = useData(ds.getCourses);
  const assignments = useData(ds.getAssignments);
  const events = useData(ds.getEvents);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(openIdParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize courses map for fast lookup
  const coursesMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  // Extract all unique tags across notes for filtering
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      n.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Handle open query param
  useEffect(() => {
    if (openIdParam) {
      setSelectedNoteId(openIdParam);
    }
  }, [openIdParam]);

  // Filter notes client-side based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const lower = searchQuery.trim().toLowerCase();
    return notes.filter((n) => {
      return (
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower) ||
        n.tags.some((tag) => tag.toLowerCase().includes(lower))
      );
    });
  }, [notes, searchQuery]);

  const activeNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const handleSelectNote = useCallback(
    (note: Note) => {
      setSelectedNoteId(note.id);
      setSearchParams({ open: note.id });
    },
    [setSearchParams]
  );

  const handleCreateNewNote = async () => {
    try {
      const newNote = await create({
        title: '',
        content: '',
        tags: [],
        courseId: filter?.courseId || null,
      });
      setSelectedNoteId(newNote.id);
      setSearchParams({ open: newNote.id });
    } catch {
      // handled in hook
    }
  };

  const handleBackToList = () => {
    setSelectedNoteId(null);
    setSearchParams({});
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidateId) return;
    setIsDeleting(true);
    try {
      await remove(deleteCandidateId);
      if (selectedNoteId === deleteCandidateId) {
        setSelectedNoteId(null);
        setSearchParams({});
      }
      setDeleteCandidateId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAskOmni = (note: Note, promptAction?: 'summarize' | 'quiz' | 'checklist') => {
    // If mobile bubble exists or user prefers full screen:
    // We can dispatch open-omni event or navigate to /ask-omni with context
    const promptText =
      promptAction === 'summarize'
        ? `Ringkas catatan ini: "${note.title}"`
        : promptAction === 'quiz'
          ? `Buat quiz singkat 3 soal pilihan ganda berdasarkan catatan ini: "${note.title}"`
          : promptAction === 'checklist'
            ? `Ubah poin-poin dari catatan ini menjadi checklist tugas: "${note.title}"`
            : `Tolong jelaskan catatan ini: "${note.title}"`;

    // Dispatch custom event for Omni bubble if on mobile, or navigate to ask-omni
    window.dispatchEvent(
      new CustomEvent('omnia-ask-omni-note', {
        detail: {
          noteId: note.id,
          title: note.title,
          content: note.content,
          prompt: promptText,
        },
      })
    );
  };

  const handleFilterPatch = (patch: Partial<NoteFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilter(undefined);
  };

  return (
    <div
      className="notes-page-container"
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 'calc(100vh - 4rem)',
        background: 'var(--surface)',
      }}
    >
      {/* Left Panel: List & Filters (Hidden on mobile if a note is currently open) */}
      <div
        className={`notes-list-pane ${activeNote ? 'notes-list-pane--mobile-hidden' : ''}`}
        style={{
          width: '100%',
          maxWidth: 380,
          borderRight: '1px solid var(--outline-variant)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-container-lowest)',
          height: '100%',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderBottom: '1px solid var(--outline-variant)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StickyNote size={20} color="var(--primary)" aria-hidden="true" />
            <h1
              style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--on-surface)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              {t.title}
            </h1>
          </div>

          <button
            type="button"
            className="btn-primary min-touch-target"
            onClick={handleCreateNewNote}
            aria-label={t.newNote}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.8125rem',
              gap: '0.25rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Plus size={16} />
            <span>{t.newNote}</span>
          </button>
        </div>

        {/* Filters */}
        <NoteFilters
          filter={filter}
          availableTags={availableTags}
          courses={courses}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterChange={handleFilterPatch}
          onClearFilters={handleClearFilters}
        />

        {/* Loading skeleton */}
        {loading && notes.length === 0 && (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  borderRadius: 8,
                  background: 'var(--surface-container)',
                  animation: 'omnia-skeleton 1.4s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              margin: '1rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={16} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void refresh(filter)}
              style={{ padding: '0.25rem', height: 'auto', color: 'inherit' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* Notes List */}
        {!loading && (
          <NotesList
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            coursesMap={coursesMap}
            onSelectNote={handleSelectNote}
            onTogglePin={(id, e) => {
              e.stopPropagation();
              void togglePin(id);
            }}
          />
        )}
      </div>

      {/* Right Panel: Note Editor (Full width on mobile when a note is active) */}
      <div
        className={`notes-editor-pane ${!activeNote ? 'notes-editor-pane--mobile-hidden' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          background: 'var(--surface-container-lowest)',
        }}
      >
        {activeNote ? (
          <NoteEditor
            note={activeNote}
            courses={courses}
            assignments={assignments}
            events={events}
            onSave={async (id, patch) => {
              await update(id, patch);
            }}
            onDelete={(id) => setDeleteCandidateId(id)}
            onTogglePin={togglePin}
            onToggleArchive={toggleArchive}
            onBack={handleBackToList}
            onAskOmni={handleAskOmni}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--on-surface-variant)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--surface-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: 'var(--primary)',
              }}
            >
              <StickyNote size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--on-surface)', fontSize: '1.125rem' }}>
              {t.emptyTitle}
            </h3>
            <p style={{ margin: '0 0 1.25rem', maxWidth: 360, fontSize: '0.875rem', lineHeight: 1.5 }}>
              {t.emptyDesc}
            </p>
            <button
              type="button"
              className="btn-primary min-touch-target"
              onClick={handleCreateNewNote}
              style={{ gap: '0.375rem' }}
            >
              <Plus size={16} />
              <span>{t.newNote}</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteCandidateId)}
        title={lang === 'id' ? 'Hapus Catatan' : 'Delete Note'}
        message={t.deleteConfirm}
        confirmText={translations[lang].common.delete}
        cancelText={translations[lang].common.cancel}
        danger={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidateId(null)}
      />
    </div>
  );
}
