import { Modal } from '@/components/Modal';
import type { Language } from '@/lib/i18n';
import type { SharePreview } from '@/lib/dataService';

interface ImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  previewData: SharePreview | null;
  handleImportShareCode: () => void;
  isImportingShare: boolean;
}

export function ImportScheduleModal({
  isOpen,
  onClose,
  language,
  previewData,
  handleImportShareCode,
  isImportingShare,
}: ImportScheduleModalProps) {
  const isId = language === 'id';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isId ? 'Impor jadwal' : 'Import schedule'}>
      {previewData && (
        <div style={{ padding: '1.25rem' }}>
          <p
            style={{
              fontSize: '0.875rem',
              marginBottom: '1rem',
              color: 'var(--on-surface-variant)',
            }}
          >
            {isId
              ? 'Salin item ini ke jadwal Anda? Kelas dan tugas yang diimpor akan berdiri sendiri dari aslinya.'
              : 'Copy these items into your schedule? Imported classes and assignments will be independent of the original.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                flex: 1,
                padding: '1rem',
                background: 'var(--surface-container-low)',
                borderRadius: 8,
              }}
            >
              <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {previewData.classes}
              </div>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
                {isId ? 'kelas' : previewData.classes === 1 ? 'class' : 'classes'}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                padding: '1rem',
                background: 'var(--surface-container-low)',
                borderRadius: 8,
              }}
            >
              <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {previewData.assignments}
              </div>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
                {isId ? 'tugas' : previewData.assignments === 1 ? 'assignment' : 'assignments'}
              </div>
            </div>
          </div>
          <div className="modal-actions-sticky">
            <button type="button" className="btn-ghost" onClick={onClose}>
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="button"
              className="btn-primary tabular-nums"
              onClick={handleImportShareCode}
              disabled={isImportingShare}
            >
              {isImportingShare
                ? isId
                  ? 'Menyalin…'
                  : 'Copying…'
                : isId
                  ? 'Salin ke jadwal saya'
                  : 'Copy to my schedule'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
