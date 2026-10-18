import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tag as TagIcon, X } from 'lucide-react';
import type { Note, NoteInput, Course, Assignment, CalendarEvent } from '@/types';
import { NoteLinkPicker } from './NoteLinkPicker';
import { NoteMarkdownToolbar } from './NoteMarkdownToolbar';
import { NoteEditorHeader } from './NoteEditorHeader';
import { useLanguage } from '@/lib/useLanguage';
import { translations } from '@/lib/i18n';

interface NoteEditorProps {
  note: Note;
  courses: Course[];
  assignments: Assignment[];
  events: CalendarEvent[];
  onSave: (id: string, patch: Partial<NoteInput>) => Promise<void>;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onBack?: () => void;
  onAskOmni?: (note: Note, promptAction?: 'summarize' | 'quiz' | 'checklist') => void;
}

export function NoteEditor({
  note,
  courses,
  assignments,
  events,
  onSave,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onBack,
  onAskOmni,
}: NoteEditorProps) {
  const lang = useLanguage();
  const t = translations[lang].notes;

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [links, setLinks] = useState<{
    courseId: string | null;
    assignmentId: string | null;
    eventId: string | null;
  }>({
    courseId: note.courseId ?? null,
    assignmentId: note.assignmentId ?? null,
    eventId: note.eventId ?? null,
  });
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset editor form state when active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setLinks({
      courseId: note.courseId ?? null,
      assignmentId: note.assignmentId ?? null,
      eventId: note.eventId ?? null,
    });
    setSaveStatus('saved');
  }, [note.id]);

  // Autosave with ~800ms debounce
  const triggerAutosave = useCallback(
    (nextTitle: string, nextContent: string, nextTags: string[], nextLinks: typeof links) => {
      setSaveStatus('unsaved');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await onSave(note.id, {
            title: nextTitle.trim().slice(0, 200),
            content: nextContent.slice(0, 50000),
            tags: nextTags.slice(0, 10).map((tag) => tag.trim().slice(0, 30)),
            courseId: nextLinks.courseId,
            assignmentId: nextLinks.assignmentId,
            eventId: nextLinks.eventId,
          });
          setSaveStatus('saved');
        } catch {
          setSaveStatus('unsaved');
        }
      }, 800);
    },
    [note.id, onSave]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 200);
    setTitle(val);
    triggerAutosave(val, content, tags, links);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 50000);
    setContent(val);
    triggerAutosave(title, val, tags, links);
  };

  const handleLinksChange = (newLinks: typeof links) => {
    setLinks(newLinks);
    triggerAutosave(title, content, tags, newLinks);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').slice(0, 30);
    if (!trimmed || tags.includes(trimmed) || tags.length >= 10) return;
    const nextTags = [...tags, trimmed];
    setTags(nextTags);
    setTagInput('');
    triggerAutosave(title, content, nextTags, links);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    triggerAutosave(title, content, nextTags, links);
  };

  // Markdown formatting helpers
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = prefix + (selected || 'teks') + suffix;
    const nextContent = content.slice(0, start) + replacement + content.slice(end);

    setContent(nextContent);
    triggerAutosave(title, nextContent, tags, links);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 10);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface-container-lowest)',
        overflow: 'hidden',
      }}
    >
      {/* Top Action Bar */}
      <NoteEditorHeader
        note={note}
        saveStatus={saveStatus}
        onBack={onBack}
        onTogglePin={onTogglePin}
        onToggleArchive={onToggleArchive}
        onDelete={onDelete}
        onAskOmni={onAskOmni}
      />

      {/* Editor Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder={t.untitled}
          aria-label={t.untitled}
          maxLength={200}
          style={{
            width: '100%',
            fontSize: '1.375rem',
            fontWeight: 700,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--on-surface)',
            padding: '0.25rem 0',
            fontFamily: 'var(--font-heading)',
          }}
        />

        {/* Context Link Picker */}
        <NoteLinkPicker
          courseId={links.courseId}
          assignmentId={links.assignmentId}
          eventId={links.eventId}
          courses={courses}
          assignments={assignments}
          events={events}
          onChange={handleLinksChange}
        />

        {/* Tag input and pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <TagIcon size={14} color="var(--on-surface-variant)" aria-hidden="true" />
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'var(--surface-container-high)',
                color: 'var(--on-surface)',
                padding: '0.125rem 0.4375rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
              }}
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'inherit',
                  display: 'flex',
                }}
              >
                <X size={11} />
              </button>
            </span>
          ))}

          {tags.length < 10 && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={t.tagsPlaceholder}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.75rem',
                color: 'var(--on-surface)',
                minWidth: 140,
              }}
            />
          )}
        </div>

        {/* Markdown Toolbar */}
        <NoteMarkdownToolbar
          isPreview={isPreview}
          onTogglePreview={() => setIsPreview((prev) => !prev)}
          onInsertFormat={insertFormatting}
        />

        {/* Content Area: Raw Textarea or ReactMarkdown Preview */}
        {isPreview ? (
          <div
            className="markdown-body"
            style={{
              flex: 1,
              minHeight: 250,
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'var(--on-surface)',
              overflowY: 'auto',
              padding: '0.5rem',
            }}
          >
            <ReactMarkdown>{content || '*Tidak ada konten teks*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="Tulis catatan kuliah di sini... (mendukung format Markdown)"
            aria-label="Isi catatan"
            style={{
              flex: 1,
              minHeight: 300,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'var(--on-surface)',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        )}
      </div>
    </div>
  );
}
