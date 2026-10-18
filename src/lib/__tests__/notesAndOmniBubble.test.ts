import { describe, it, expect } from 'vitest';
import { validateNoteInput, filterNotesInMemory } from '../notesService';
import { buildNotesContextFromList } from '@/features/ask-omni/utils/notesContext';
import { validateProposal } from '@/features/ask-omni/proposalValidator';
import { parseBubblePreference } from '@/lib/bubblePreferences';
import type { Note, PrefilledData } from '@/types';

describe('Notes and Omni Bubble Unit Tests', () => {
  // ─── 1. validateNoteInput ───
  describe('1. validateNoteInput', () => {
    it('accepts valid NoteInput', () => {
      const result = validateNoteInput({
        title: 'Algoritma Pemrograman',
        content: 'Catatan kuliah struktur data dan kompleksitas.',
        tags: ['kuliah', 'cs'],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty title', () => {
      const result = validateNoteInput({
        title: '   ',
        content: 'Konten tanpa judul',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('rejects title longer than 200 characters', () => {
      const longTitle = 'A'.repeat(201);
      const result = validateNoteInput({
        title: longTitle,
        content: 'Valid content',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be at most 200 characters');
    });

    it('rejects content longer than 50,000 characters', () => {
      const longContent = 'C'.repeat(50001);
      const result = validateNoteInput({
        title: 'Valid Title',
        content: longContent,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content must be at most 50,000 characters');
    });

    it('rejects more than 10 tags', () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const result = validateNoteInput({
        title: 'Valid Title',
        tags,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tags cannot exceed 10 items');
    });

    it('rejects individual tag longer than 30 characters', () => {
      const longTag = 'T'.repeat(31);
      const result = validateNoteInput({
        title: 'Valid Title',
        tags: [longTag],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds 30 characters');
    });
  });

  // ─── 2. Pemotongan notesContext ───
  describe('2. buildNotesContext (Privacy & Truncation)', () => {
    const mockNotes: Note[] = [
      {
        id: 'note-1',
        userId: 'u1',
        title: 'Catatan Basis Data',
        content: 'Penjelasan tentang normalisasi 1NF, 2NF, dan 3NF.'.repeat(10),
        tags: ['db', 'kuliah'],
        color: null,
        isPinned: true,
        isArchived: false,
        courseId: 'CS101',
        assignmentId: null,
        eventId: null,
        source: 'manual',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z',
      },
      {
        id: 'note-2',
        userId: 'u1',
        title: 'Catatan Arsip Lama',
        content: 'Catatan ini diarsipkan.',
        tags: ['old'],
        color: null,
        isPinned: false,
        isArchived: true,
        courseId: null,
        assignmentId: null,
        eventId: null,
        source: 'manual',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ];

    it('returns empty array when user has NOT opted in', () => {
      const ctx = buildNotesContextFromList(mockNotes, {
        userMessage: 'basis data',
        omniNotesAccess: false,
      });
      expect(ctx).toHaveLength(0);
    });

    it('excludes archived notes when opt-in is active', () => {
      const ctx = buildNotesContextFromList(mockNotes, {
        userMessage: 'catatan',
        omniNotesAccess: true,
      });
      expect(ctx.some((n) => n.id === 'note-2')).toBe(false);
    });

    it('limits snippet to maximum 300 characters', () => {
      const ctx = buildNotesContextFromList(mockNotes, {
        userMessage: 'basis data',
        omniNotesAccess: true,
      });
      expect(ctx.length).toBeGreaterThan(0);
      expect(ctx[0].snippet.length).toBeLessThanOrEqual(300);
    });

    it('caps total items at maximum 15 and budget at 4000 characters', () => {
      const manyNotes: Note[] = Array.from({ length: 30 }, (_, i) => ({
        id: `note-${i}`,
        userId: 'u1',
        title: `Catatan Kuliah Nomor ${i}`,
        content: `Konten panjang untuk catatan ke-${i}. `.repeat(20),
        tags: ['test'],
        color: null,
        isPinned: i < 5,
        isArchived: false,
        courseId: null,
        assignmentId: null,
        eventId: null,
        source: 'manual',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-18T00:00:00Z',
      }));

      const ctx = buildNotesContextFromList(manyNotes, {
        userMessage: 'catatan',
        omniNotesAccess: true,
      });
      expect(ctx.length).toBeLessThanOrEqual(15);

      const totalChars = ctx.reduce(
        (sum, item) => sum + item.title.length + item.snippet.length,
        0
      );
      expect(totalChars).toBeLessThanOrEqual(4000);
    });
  });

  // ─── 3. validateProposal for note type ───
  describe('3. validateProposal for note proposals', () => {
    it('validates a correct create note proposal', () => {
      const validNote: PrefilledData = {
        type: 'note',
        title: 'Rangkuman Materi AI',
        content: 'Rangkuman konsep LLM dan RAG.',
        tags: ['ai', 'summary'],
        mode: 'create',
      };
      expect(validateProposal(validNote).valid).toBe(true);
    });

    it('rejects note proposal with empty title', () => {
      const invalidNote: PrefilledData = {
        type: 'note',
        title: '   ',
        content: 'Ada isi tapi tanpa judul',
        mode: 'create',
      };
      expect(validateProposal(invalidNote).valid).toBe(false);
    });

    it('rejects note proposal with title > 200 chars', () => {
      const invalidNote: PrefilledData = {
        type: 'note',
        title: 'X'.repeat(201),
        content: 'Konten valid',
        mode: 'create',
      };
      expect(validateProposal(invalidNote).valid).toBe(false);
    });

    it('rejects note proposal with content > 20,000 chars', () => {
      const invalidNote: PrefilledData = {
        type: 'note',
        title: 'Judul Valid',
        content: 'Y'.repeat(20001),
        mode: 'create',
      };
      expect(validateProposal(invalidNote).valid).toBe(false);
    });

    it('rejects note proposal with > 10 tags', () => {
      const invalidNote: PrefilledData = {
        type: 'note',
        title: 'Judul Valid',
        content: 'Konten valid',
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
        mode: 'create',
      };
      expect(validateProposal(invalidNote).valid).toBe(false);
    });

    it('rejects append note proposal if noteId is missing', () => {
      const appendWithoutId: PrefilledData = {
        type: 'note',
        title: 'Judul Valid',
        content: 'Tambahan poin baru',
        mode: 'append',
      };
      expect(validateProposal(appendWithoutId).valid).toBe(false);
    });

    it('accepts append note proposal with valid noteId', () => {
      const appendWithId: PrefilledData = {
        type: 'note',
        title: 'Catatan Eksisting',
        content: 'Tambahan poin baru',
        mode: 'append',
        noteId: 'note-uuid-1234',
      };
      expect(validateProposal(appendWithId).valid).toBe(true);
    });
  });

  // ─── 4. filterNotesInMemory ───
  describe('4. filterNotesInMemory', () => {
    const sampleNotes: Note[] = [
      {
        id: '1',
        userId: 'u1',
        title: 'Kalkulus Lanjut',
        content: 'Integral lipat dan kalkulus vektor.',
        tags: ['matematika', 'kuliah'],
        color: null,
        isPinned: true,
        isArchived: false,
        courseId: 'MATH201',
        assignmentId: null,
        eventId: null,
        source: 'manual',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z',
      },
      {
        id: '2',
        userId: 'u1',
        title: 'Sistem Operasi',
        content: 'Manajemen memori dan penjadwalan CPU.',
        tags: ['cs', 'kuliah'],
        color: null,
        isPinned: false,
        isArchived: false,
        courseId: 'CS202',
        assignmentId: null,
        eventId: null,
        source: 'omni',
        createdAt: '2026-10-02T00:00:00Z',
        updatedAt: '2026-10-17T10:00:00Z',
      },
      {
        id: '3',
        userId: 'u1',
        title: 'Fisika Dasar',
        content: 'Termodinamika.',
        tags: ['fisika'],
        color: null,
        isPinned: false,
        isArchived: true,
        courseId: 'PHYS101',
        assignmentId: null,
        eventId: null,
        source: 'manual',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z',
      },
    ];

    it('filters active vs archived notes', () => {
      const active = filterNotesInMemory(sampleNotes, { isArchived: false });
      expect(active).toHaveLength(2);
      expect(active.every((n) => !n.isArchived)).toBe(true);

      const archived = filterNotesInMemory(sampleNotes, { isArchived: true });
      expect(archived).toHaveLength(1);
      expect(archived[0].id).toBe('3');
    });

    it('filters pinned notes', () => {
      const pinned = filterNotesInMemory(sampleNotes, { isPinned: true });
      expect(pinned).toHaveLength(1);
      expect(pinned[0].title).toBe('Kalkulus Lanjut');
    });

    it('filters by courseId', () => {
      const courseNotes = filterNotesInMemory(sampleNotes, { courseId: 'CS202' });
      expect(courseNotes).toHaveLength(1);
      expect(courseNotes[0].title).toBe('Sistem Operasi');
    });

    it('filters by tag', () => {
      const csNotes = filterNotesInMemory(sampleNotes, { tag: 'cs' });
      expect(csNotes).toHaveLength(1);
      expect(csNotes[0].id).toBe('2');
    });

    it('searches by keyword matching title or content', () => {
      const searchRes = filterNotesInMemory(sampleNotes, { search: 'integral' });
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0].title).toBe('Kalkulus Lanjut');

      const titleRes = filterNotesInMemory(sampleNotes, { search: 'operasi' });
      expect(titleRes).toHaveLength(1);
      expect(titleRes[0].title).toBe('Sistem Operasi');
    });
  });

  // ─── 5. parseBubblePreference ───
  describe('5. parseBubblePreference (UI Preferences in localStorage)', () => {
    it('returns default preference when raw is null or empty', () => {
      expect(parseBubblePreference(null)).toEqual({
        side: 'right',
        y: 120,
        collapsed: false,
      });
      expect(parseBubblePreference('')).toEqual({
        side: 'right',
        y: 120,
        collapsed: false,
      });
    });

    it('correctly parses valid preference JSON', () => {
      const json = JSON.stringify({ side: 'left', y: 250, collapsed: true });
      expect(parseBubblePreference(json)).toEqual({
        side: 'left',
        y: 250,
        collapsed: true,
      });
    });

    it('clamps y coordinate safely to minimum 70px', () => {
      const json = JSON.stringify({ side: 'right', y: 30, collapsed: false });
      expect(parseBubblePreference(json)).toEqual({
        side: 'right',
        y: 70,
        collapsed: false,
      });
    });

    it('handles corrupted or malformed JSON gracefully', () => {
      expect(parseBubblePreference('{ invalid json: true')).toEqual({
        side: 'right',
        y: 120,
        collapsed: false,
      });
    });
  });
});
