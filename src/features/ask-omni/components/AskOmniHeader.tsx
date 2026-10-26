import { Sparkles, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language } from '@/lib/i18n';

interface AskOmniHeaderProps {
  lang: Language;
  hasMessages: boolean;
  onClearHistory: () => void;
}

export function AskOmniHeader({ lang, hasMessages, onClearHistory }: AskOmniHeaderProps) {
  return (
    <div
      className="ask-omni-header hidden-mobile"
      style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            background: 'var(--primary-container)',
            color: 'var(--primary)',
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <h1
            style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}
          >
            {lang === 'id' ? 'Tanya Omni' : 'Ask Omni'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            {lang === 'id'
              ? 'Ketik secara natural untuk mengatur jadwal, menambah tugas, atau mencatat pengeluaran.'
              : 'Type naturally to schedule classes, add tasks, or log expenses with pre-filled pop-ups.'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {import.meta.env.DEV && (
          <Link
            to="/debug"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container)',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
            title="Buka Omnia API Debug Console"
          >
            <Bug size={14} />
            Debug API
          </Link>
        )}
        {hasMessages && (
          <button
            type="button"
            onClick={onClearHistory}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 8,
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container)',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {lang === 'id' ? 'Hapus Riwayat' : 'Clear History'}
          </button>
        )}
      </div>
    </div>
  );
}
