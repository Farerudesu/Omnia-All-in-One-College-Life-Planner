import { useRef } from 'react';
import { Send, Paperclip, X, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Language } from '@/lib/i18n';
import type { ImageAttachment } from '../types';

interface AskOmniComposerProps {
  input: string;
  isTyping: boolean;
  attachment: ImageAttachment | null;
  requestError: string;
  retryText: string;
  lang: Language;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  onRetry: () => void;
}

export function AskOmniComposer({
  input,
  isTyping,
  attachment,
  requestError,
  retryText,
  lang,
  onInputChange,
  onSend,
  onFileChange,
  onRemoveAttachment,
  onRetry,
}: AskOmniComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const hasContent = Boolean(input.trim() || attachment);

  return (
    <div
      className="ask-omni-composer"
      style={{
        padding: '1rem 1.5rem',
        background: 'var(--surface-container-lowest)',
        borderTop: '1px solid var(--outline-variant)',
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 768,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {attachment && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              padding: '0.5rem',
              borderRadius: 12,
              width: 'max-content',
            }}
          >
            <img
              src={attachment.dataUrl}
              alt="Attached preview"
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
            />
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>
              {attachment.name}
            </div>
            <button
              type="button"
              onClick={onRemoveAttachment}
              aria-label="Remove attached image"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--on-surface-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div
          className="ask-omni-input-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 999,
            padding: '0.375rem 0.375rem 0.375rem 1rem',
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: 'var(--on-surface-variant)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Attach image"
            aria-label="Attach image"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFileChange}
            style={{ display: 'none' }}
            tabIndex={-1}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            placeholder={
              lang === 'id'
                ? 'Contoh: Besok ada kuis 9 pagi, atau catat beli makan 15rb...'
                : 'e.g. Add math exam Monday 9am, or spent $15 on lunch...'
            }
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '0.5rem 0.75rem',
              fontSize: '0.9375rem',
              color: 'var(--on-surface)',
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={isTyping || !hasContent}
            style={{
              background: hasContent ? 'var(--primary)' : 'var(--outline-variant)',
              color: hasContent ? 'white' : 'var(--on-surface-variant)',
              border: 'none',
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: hasContent ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
              marginLeft: '0.5rem',
            }}
          >
            <Send size={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
          </button>
        </div>

        {requestError && (
          <div
            role="alert"
            style={{
              color: 'var(--error)',
              fontSize: '0.8125rem',
              paddingLeft: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span>{requestError}</span>
            {retryText && (
              <button
                type="button"
                className="btn-ghost"
                onClick={onRetry}
                style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Coba lagi
              </button>
            )}
            {import.meta.env.DEV && (
              <Link
                to="/debug"
                style={{
                  color: 'var(--primary)',
                  textDecoration: 'underline',
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 500,
                }}
              >
                <Bug size={13} />
                Buka Debug Console
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
