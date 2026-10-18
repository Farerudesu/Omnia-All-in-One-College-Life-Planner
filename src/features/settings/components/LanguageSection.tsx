import { Globe } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

interface LanguageSectionProps {
  language: Language;
  setLangState: (lang: Language) => void;
}

export function LanguageSection({ language, setLangState }: LanguageSectionProps) {
  const t = translations[language];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--surface-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Globe size={20} />
        </div>
        <div>
          <h3>{t.settings.languageTitle}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setLangState('id')}
          style={{
            padding: '0.875rem',
            border: language === 'id' ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
            borderRadius: 12,
            background: language === 'id' ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--on-surface)' }}>Bahasa Indonesia</div>
          {language === 'id' && (
            <div style={{ marginTop: '0.375rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setLangState('en')}
          style={{
            padding: '0.875rem',
            border: language === 'en' ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
            borderRadius: 12,
            background: language === 'en' ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--on-surface)' }}>English</div>
          {language === 'en' && (
            <div style={{ marginTop: '0.375rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
