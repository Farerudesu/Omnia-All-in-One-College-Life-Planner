import { Bold, Italic, Heading2, List, CheckSquare, Eye, Edit3 } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';

interface NoteMarkdownToolbarProps {
  isPreview: boolean;
  onTogglePreview: () => void;
  onInsertFormat: (prefix: string, suffix?: string) => void;
}

export function NoteMarkdownToolbar({
  isPreview,
  onTogglePreview,
  onInsertFormat,
}: NoteMarkdownToolbarProps) {
  const lang = useLanguage();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--outline-variant)',
        borderBottom: '1px solid var(--outline-variant)',
        padding: '0.375rem 0',
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-sm)',
        gap: '0.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onInsertFormat('**', '**')}
          title="Bold"
          style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onInsertFormat('*', '*')}
          title="Italic"
          style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onInsertFormat('## ')}
          title="Heading 2"
          style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
        >
          <Heading2 size={14} />
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onInsertFormat('- ')}
          title="Bullet List"
          style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onInsertFormat('- [ ] ')}
          title="Task Checklist"
          style={{ padding: '0.25rem 0.5rem', height: 'auto' }}
        >
          <CheckSquare size={14} />
        </button>
      </div>

      <button
        type="button"
        className="btn-ghost"
        onClick={onTogglePreview}
        style={{
          padding: '0.25rem 0.625rem',
          height: 'auto',
          fontSize: '0.75rem',
          fontWeight: 600,
          gap: '0.25rem',
          color: isPreview ? 'var(--primary)' : 'var(--on-surface-variant)',
        }}
      >
        {isPreview ? <Edit3 size={13} /> : <Eye size={13} />}
        <span>{isPreview ? 'Edit' : lang === 'id' ? 'Pratinjau' : 'Preview'}</span>
      </button>
    </div>
  );
}
