import { useState } from 'react';
import { ArrowLeft, Sparkles, Pin, Archive, Trash2 } from 'lucide-react';
import type { Note } from '@/types';
import { useLanguage } from '@/lib/useLanguage';
import { translations } from '@/lib/i18n';

interface NoteEditorHeaderProps {
  note: Note;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onBack?: () => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onAskOmni?: (note: Note, promptAction?: 'summarize' | 'quiz' | 'checklist') => void;
}

export function NoteEditorHeader({
  note,
  saveStatus,
  onBack,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onAskOmni,
}: NoteEditorHeaderProps) {
  const lang = useLanguage();
  const t = translations[lang].notes;
  const [showOmniMenu, setShowOmniMenu] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 1rem',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-low)',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {onBack && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onBack}
            aria-label={lang === 'id' ? 'Kembali ke daftar' : 'Back to list'}
            style={{ padding: '0.375rem', height: 'auto' }}
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color:
              saveStatus === 'saving'
                ? 'var(--primary)'
                : saveStatus === 'saved'
                  ? 'var(--on-surface-variant)'
                  : 'var(--error)',
          }}
        >
          {saveStatus === 'saving' ? t.saving : saveStatus === 'saved' ? t.saved : 'Belum tersimpan'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {/* Ask Omni Button */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowOmniMenu((prev) => !prev)}
            style={{
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              gap: '0.25rem',
              padding: '0.375rem 0.625rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary-container)',
            }}
          >
            <Sparkles size={14} />
            <span>Omni</span>
          </button>

          {showOmniMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-modal)',
                zIndex: 20,
                width: 210,
                padding: '0.375rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                className="btn-ghost"
                style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                onClick={() => {
                  setShowOmniMenu(false);
                  onAskOmni?.(note, 'summarize');
                }}
              >
                📝 {t.summarize}
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                onClick={() => {
                  setShowOmniMenu(false);
                  onAskOmni?.(note, 'quiz');
                }}
              >
                🎯 {t.generateQuiz}
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ justifyContent: 'flex-start', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                onClick={() => {
                  setShowOmniMenu(false);
                  onAskOmni?.(note, 'checklist');
                }}
              >
                ☑️ {t.toChecklist}
              </button>
            </div>
          )}
        </div>

        {/* Toggle Pin */}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onTogglePin(note.id)}
          title={note.isPinned ? t.unpin : t.pin}
          aria-label={note.isPinned ? t.unpin : t.pin}
          style={{ padding: '0.375rem', height: 'auto', color: note.isPinned ? 'var(--primary)' : undefined }}
        >
          <Pin size={16} fill={note.isPinned ? 'currentColor' : 'none'} />
        </button>

        {/* Toggle Archive */}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onToggleArchive(note.id)}
          title={note.isArchived ? t.unarchive : t.archive}
          aria-label={note.isArchived ? t.unarchive : t.archive}
          style={{ padding: '0.375rem', height: 'auto', color: note.isArchived ? 'var(--primary)' : undefined }}
        >
          <Archive size={16} />
        </button>

        {/* Delete */}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onDelete(note.id)}
          title={translations[lang].common.delete}
          aria-label={translations[lang].common.delete}
          style={{ padding: '0.375rem', height: 'auto', color: 'var(--error)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
