import { Pin, Sparkles, GraduationCap, Archive } from 'lucide-react';
import type { Note, Course } from '@/types';
import { useLanguage } from '@/lib/useLanguage';
import { translations } from '@/lib/i18n';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  coursesMap: Map<string, Course>;
  onSelectNote: (note: Note) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
}

function formatRelativeTime(dateString: string, lang: 'id' | 'en'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return lang === 'id' ? 'Baru saja' : 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return lang === 'id' ? `${diffMin}m lalu` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return lang === 'id' ? `${diffHours}j lalu` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return lang === 'id' ? 'Kemarin' : 'Yesterday';
  if (diffDays < 7) return lang === 'id' ? `${diffDays}h lalu` : `${diffDays}d ago`;

  return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}(.*?)\1/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim();
}

export function NotesList({
  notes,
  selectedNoteId,
  coursesMap,
  onSelectNote,
  onTogglePin,
}: NotesListProps) {
  const lang = useLanguage();
  const t = translations[lang].notes;

  if (notes.length === 0) {
    return (
      <div
        style={{
          padding: '2.5rem 1.25rem',
          textAlign: 'center',
          color: 'var(--on-surface-variant)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontSize: '1.75rem', opacity: 0.6 }}>📝</div>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
          {t.emptySearch}
        </div>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label={t.allNotes}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {notes.map((note) => {
        const isSelected = note.id === selectedNoteId;
        const course = note.courseId ? coursesMap.get(note.courseId) : null;
        const snippet = stripMarkdown(note.content).slice(0, 140);
        const relativeTime = formatRelativeTime(note.updatedAt, lang);

        return (
          <div
            key={note.id}
            role="listitem"
            tabIndex={0}
            onClick={() => onSelectNote(note)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectNote(note);
              }
            }}
            style={{
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--outline-variant)',
              cursor: 'pointer',
              background: isSelected
                ? 'var(--surface-container-high)'
                : note.isPinned
                  ? 'var(--surface-container-low)'
                  : 'transparent',
              transition: 'background-color 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              position: 'relative',
            }}
          >
            {/* Header: Title, Omni badge, Pin button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {note.source === 'omni' && (
                  <span
                    title={t.sourceOmni}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'var(--primary-container)',
                      padding: '0.125rem 0.375rem',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={11} />
                    <span>Omni</span>
                  </span>
                )}
                {note.isArchived && (
                  <span
                    title={t.archived}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '0.6875rem',
                      color: 'var(--on-surface-variant)',
                      background: 'var(--surface-container)',
                      padding: '0.125rem 0.375rem',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    <Archive size={11} />
                  </span>
                )}
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: 'var(--on-surface)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {note.title.trim() || t.untitled}
                </h4>
              </div>

              {/* Pin button */}
              <button
                type="button"
                onClick={(e) => onTogglePin(note.id, e)}
                title={note.isPinned ? t.unpin : t.pin}
                aria-label={note.isPinned ? t.unpin : t.pin}
                className="btn-ghost"
                style={{
                  padding: '0.25rem',
                  borderRadius: 4,
                  color: note.isPinned ? 'var(--primary)' : 'var(--outline)',
                  flexShrink: 0,
                  height: 'auto',
                }}
              >
                <Pin size={14} fill={note.isPinned ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Snippet (2 lines) */}
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                lineHeight: 1.4,
                color: 'var(--on-surface-variant)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {snippet || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Tidak ada konten teks</span>}
            </p>

            {/* Footer: Course, Tags, Relative time */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.125rem',
                fontSize: '0.6875rem',
                color: 'var(--on-surface-variant)',
                flexWrap: 'wrap',
              }}
            >
              {course && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                  }}
                >
                  <GraduationCap size={12} />
                  <span>{course.code}</span>
                </span>
              )}

              {note.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'var(--surface-container-high)',
                    padding: '0.0625rem 0.375rem',
                    borderRadius: 4,
                    fontSize: '0.6875rem',
                  }}
                >
                  #{tag}
                </span>
              ))}

              <span style={{ marginLeft: 'auto', opacity: 0.75 }}>{relativeTime}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
