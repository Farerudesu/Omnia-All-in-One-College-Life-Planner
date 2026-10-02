import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className="modal-content"
        style={{ ...(maxWidth ? { maxWidth } : {}), overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem 0.75rem',
          borderBottom: '1px solid var(--outline-variant)',
        }}>
          <h3 id="modal-title" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 40, height: 40, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, color: 'var(--on-surface-variant)',
            }}
            className="btn-ghost"
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
