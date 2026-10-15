import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <div
      className="empty-state-card"
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        color: 'var(--on-surface-variant)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.875rem',
        background: 'var(--surface-container-low)',
        borderRadius: 14,
        border: '1px dashed var(--outline-variant)',
        marginBlock: '0.5rem',
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            color: 'var(--outline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.25rem',
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ maxWidth: 360 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '1rem',
            color: 'var(--on-surface)',
            marginBottom: '0.25rem',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {title}
        </div>
        {description && (
          <div style={{ fontSize: '0.8125rem', lineHeight: 1.45, color: 'var(--on-surface-variant)' }}>
            {description}
          </div>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn-primary min-touch-target"
          onClick={onAction}
          style={{ marginTop: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
