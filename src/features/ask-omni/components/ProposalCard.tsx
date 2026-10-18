import { Sparkles, Calendar, Check, DollarSign, CheckSquare } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import type { ChatMessage, PrefilledData } from '@/types';
import { formatPrefilledSummary } from '../proposalValidator';

interface ProposalCardProps {
  message: ChatMessage;
  lang: Language;
  onOpenModal: (data: PrefilledData, messageId?: string) => void;
}

export function ProposalCard({ message, lang, onOpenModal }: ProposalCardProps) {
  const data = message.prefilledData;
  if (!data) return null;

  return (
    <div
      style={{
        width: 'min(90%, 460px)',
        marginTop: '0.625rem',
        padding: '0.875rem 1rem',
        borderRadius: 14,
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
        boxShadow: 'var(--shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {data.type === 'expense' ? (
            <DollarSign size={13} />
          ) : data.type === 'task' ? (
            <CheckSquare size={13} />
          ) : (
            <Calendar size={13} />
          )}
          {lang === 'id' ? 'Siap dikonfirmasi' : 'Ready to confirm'}{' '}
          {lang === 'id'
            ? data.type === 'expense'
              ? 'Pengeluaran'
              : data.type === 'task'
              ? 'Tugas'
              : 'Acara'
            : data.type === 'expense'
            ? 'Expense'
            : data.type === 'task'
            ? 'Assignment'
            : 'Schedule Event'}
        </span>
        {message.actionStatus === 'saved' ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--primary)',
              background: 'var(--primary-container)',
              padding: '0.2rem 0.5rem',
              borderRadius: 6,
            }}
          >
            <Check size={12} /> {lang === 'id' ? 'Tersimpan di' : 'Saved to'}{' '}
            {lang === 'id'
              ? data.type === 'expense'
                ? 'Keuangan'
                : data.type === 'task'
                ? 'Tugas'
                : 'Jadwal'
              : data.type === 'expense'
              ? 'Finance'
              : data.type === 'task'
              ? 'Tasks'
              : 'Schedule'}
          </span>
        ) : (
          <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
            {lang === 'id' ? 'Siap dikonfirmasi' : 'Ready to confirm'}
          </span>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
        {data.title}
      </div>

      <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
        {formatPrefilledSummary(data)}
      </div>

      {message.actionStatus !== 'saved' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
          <button
            type="button"
            onClick={() => onOpenModal(data, message.id)}
            className="btn-primary"
            style={{
              fontSize: '0.8125rem',
              padding: '0.45rem 0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <Sparkles size={14} />
            {lang === 'id' ? 'Buka Pop-up & Konfirmasi' : 'Open Pop-up & Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}
