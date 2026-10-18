import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]');
      (initialFocus || dialogRef.current)?.focus();
    });

    return () => {
      document.body.style.overflow = '';
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalElement = (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={dialogRef}
        className="modal-content"
        style={{ ...(maxWidth ? { maxWidth } : {}), overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '0.5px solid var(--outline-variant)',
            flexShrink: 0,
          }}
        >
          <h3
            id="modal-title"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.0625rem', fontWeight: 600 }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              color: 'var(--on-surface-variant)',
              background: 'var(--surface-container-high)',
              border: 'none',
              padding: 0,
            }}
            aria-label="Close dialog"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-scroll-body" style={{ padding: '1.25rem' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}
