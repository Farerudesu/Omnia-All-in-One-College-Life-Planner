import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  message: string;
  type?: ToastType;
  action?: ToastAction;
  duration?: number; // ms, default 4000 (5000 if action)
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalShowToast: ((options: ToastOptions) => string) | null = null;

/** Standalone function to trigger toast anywhere without hook */
export function toast(options: ToastOptions | string): string {
  const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
  if (globalShowToast) {
    return globalShowToast(opts);
  }
  // Fallback: dispatch custom event
  const id = opts.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(new CustomEvent('omnia-show-toast', { detail: { ...opts, id } }));
  return id;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options.duration || (options.action ? 5000 : 4000);
    const newItem: ToastItem = {
      ...options,
      id,
      type: options.type || 'info',
      duration,
    };

    setToasts((prev) => {
      // Keep at most 3 toasts on screen
      const filtered = prev.filter((t) => t.id !== id);
      return [...filtered.slice(-2), newItem];
    });

    return id;
  }, []);

  useEffect(() => {
    globalShowToast = showToast;
    const handleCustomToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastOptions>).detail;
      if (detail) showToast(detail);
    };
    window.addEventListener('omnia-show-toast', handleCustomToast);
    return () => {
      globalShowToast = null;
      window.removeEventListener('omnia-show-toast', handleCustomToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className="toast-container"
            aria-live="polite"
            aria-atomic="true"
            style={{
              position: 'fixed',
              zIndex: 9999,
              pointerEvents: 'none',
              bottom: 'calc(70px + env(safe-area-inset-bottom, 16px))',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 2rem)',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {toasts.map((item) => (
              <ToastCard key={item.id} item={item} onDismiss={() => dismissToast(item.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: toast,
      dismissToast: () => {},
    };
  }
  return ctx;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    if (item.duration > 0) {
      const timer = setTimeout(onDismiss, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.duration, onDismiss]);

  const isError = item.type === 'error';
  const isSuccess = item.type === 'success';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 12,
        background: isError ? 'var(--error-container, #410002)' : 'var(--inverse-surface, #1e2022)',
        color: isError
          ? 'var(--on-error-container, #ffdad6)'
          : 'var(--inverse-on-surface, #f0f1f3)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.16)',
        backdropFilter: 'blur(12px)',
        border: isError ? '1px solid var(--error, #ffb4ab)' : '1px solid rgba(255, 255, 255, 0.12)',
        animation: 'toast-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, flex: 1 }}>
        {isSuccess && (
          <CheckCircle2 size={18} style={{ color: 'var(--tertiary, #a3e635)', flexShrink: 0 }} />
        )}
        {isError && (
          <AlertCircle size={18} style={{ color: 'var(--error, #ffb4ab)', flexShrink: 0 }} />
        )}
        {!isSuccess && !isError && (
          <Info size={18} style={{ color: 'var(--primary-fixed, #8be28a)', flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.35,
            fontWeight: 500,
            overflowWrap: 'break-word',
          }}
        >
          {item.message}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isError ? '#ffdad6' : 'var(--tertiary-container, #a3e635)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: 6,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {item.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            opacity: 0.65,
            cursor: 'pointer',
            padding: 4,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
