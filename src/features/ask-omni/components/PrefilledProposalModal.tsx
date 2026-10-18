import {
  Sparkles,
  Calendar,
  Check,
  DollarSign,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { Language } from '@/lib/i18n';
import type { Course, PrefilledData } from '@/types';
import { ProposalFields } from './ProposalFields';

interface PrefilledProposalModalProps {
  prefilledModal: { data: PrefilledData; messageId?: string } | null;
  receiptSavedAmounts: number[];
  receiptQueue: PrefilledData[];
  prefilledError: string;
  isSavingPrefilled: boolean;
  courses: Course[];
  paymentMethods: string[];
  lang: Language;
  onClose: () => void;
  onConfirm: () => void;
  onChangeData: (updater: (prev: PrefilledData) => PrefilledData) => void;
}

export function PrefilledProposalModal({
  prefilledModal,
  receiptSavedAmounts,
  receiptQueue,
  prefilledError,
  isSavingPrefilled,
  courses,
  paymentMethods,
  lang,
  onClose,
  onConfirm,
  onChangeData,
}: PrefilledProposalModalProps) {
  if (!prefilledModal) return null;

  const titleText = (() => {
    const base =
      prefilledModal.data.type === 'expense'
        ? 'Catat pengeluaran kampus'
        : prefilledModal.data.type === 'task'
        ? 'Tambah tugas kuliah'
        : 'Tambah acara ke jadwal';
    const total = receiptSavedAmounts.length + receiptQueue.length + 1;
    if (total > 1) {
      const current = receiptSavedAmounts.length + 1;
      return `${base} (${current}/${total})`;
    }
    return base;
  })();

  const data = prefilledModal.data;

  return (
    <Modal isOpen={!!prefilledModal} onClose={onClose} title={titleText} maxWidth="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* AI Notice Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 0.875rem',
            borderRadius: 8,
            background: 'var(--primary-container)',
            color: 'var(--on-primary-container)',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
        >
          <Sparkles size={16} style={{ flexShrink: 0, color: 'var(--primary)' }} />
          <span>
            Omni prefilled these details from your message. You can adjust any fields and click{' '}
            <strong>Okay</strong> to confirm.
          </span>
        </div>

        {/* Type Switcher Tabs */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--on-surface-variant)',
              marginBottom: '0.375rem',
            }}
          >
            Category Type
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.375rem',
              background: 'var(--surface-container)',
              padding: '0.25rem',
              borderRadius: 8,
            }}
          >
            {[
              { id: 'event' as const, label: 'Schedule Event', icon: <Calendar size={14} /> },
              { id: 'task' as const, label: 'Task / HW', icon: <CheckSquare size={14} /> },
              { id: 'expense' as const, label: 'Expense', icon: <DollarSign size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeData((prev) => ({ ...prev, type: tab.id }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  padding: '0.45rem 0.5rem',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: data.type === tab.id ? 'var(--surface-container-lowest)' : 'transparent',
                  color: data.type === tab.id ? 'var(--primary)' : 'var(--on-surface-variant)',
                  boxShadow: data.type === tab.id ? 'var(--shadow-xs)' : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <ProposalFields
          data={data}
          courses={courses}
          paymentMethods={paymentMethods}
          lang={lang}
          onChangeData={onChangeData}
        />

        {/* Error Message */}
        {prefilledError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: 'var(--error)',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={15} />
            <span>{prefilledError}</span>
          </div>
        )}

        {/* Action Buttons: Cancel and Okay */}
        <div className="modal-actions-sticky">
          <button
            type="button"
            className="btn-outline"
            onClick={onClose}
            disabled={isSavingPrefilled}
            style={{ padding: '0.5rem 1rem', minHeight: 40 }}
          >
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={isSavingPrefilled}
            style={{
              padding: '0.5rem 1.25rem',
              minHeight: 40,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
            }}
          >
            <Check size={16} aria-hidden="true" />
            {isSavingPrefilled ? (lang === 'id' ? 'Menyimpan…' : 'Saving…') : lang === 'id' ? 'Simpan' : 'Okay'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
