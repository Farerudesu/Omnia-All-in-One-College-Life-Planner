import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  danger = true,
  variant,
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const isDanger = variant ? variant === 'danger' : danger;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
          {isDanger && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--error-container, #fee2e2)',
                color: 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} />
            </div>
          )}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: 'var(--on-surface-variant)',
            }}
          >
            {message}
          </div>
        </div>

        <div className="modal-actions-sticky" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleClose}
            disabled={isLoading}
            style={{ minHeight: 40, paddingInline: '1rem' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? 'btn-outline' : 'btn-primary'}
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              minHeight: 40,
              paddingInline: '1.25rem',
              color: isDanger ? 'var(--error)' : undefined,
              borderColor: isDanger ? 'var(--error)' : undefined,
              background: danger ? 'var(--error-container, #fee2e2)' : undefined,
            }}
          >
            {isLoading ? 'Memproses…' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
