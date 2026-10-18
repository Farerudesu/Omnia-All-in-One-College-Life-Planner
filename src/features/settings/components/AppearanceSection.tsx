import type { Language } from '@/lib/i18n';

interface AppearanceSectionProps {
  language: Language;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export function AppearanceSection({ language, theme, setTheme }: AppearanceSectionProps) {
  const isId = language === 'id';

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </div>
        <div>
          <h3>{isId ? 'Preferensi Tema' : 'Theme preference'}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            {isId
              ? 'Pilih mode tampilan terang atau gelap di semua perangkat Anda.'
              : 'Choose your interface brightness mode across all devices.'}
          </p>
        </div>
      </div>

      <div>
        <div
          className="theme-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
        >
          {[
            {
              value: 'light' as const,
              label: isId ? 'Terang' : 'Light',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ),
            },
            {
              value: 'dark' as const,
              label: isId ? 'Gelap' : 'Dark',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              ),
            },
            {
              value: 'system' as const,
              label: isId ? 'Sistem' : 'System',
              icon: (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              ),
            },
          ].map((tTheme) => (
            <button
              key={tTheme.value}
              type="button"
              onClick={() => setTheme(tTheme.value)}
              style={{
                padding: '1rem',
                border:
                  theme === tTheme.value
                    ? '2px solid var(--primary)'
                    : '1px solid var(--outline-variant)',
                borderRadius: 12,
                background:
                  theme === tTheme.value
                    ? 'var(--surface-container)'
                    : 'var(--surface-container-lowest)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>{tTheme.icon}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{tTheme.label}</div>
              {theme === tTheme.value && (
                <div style={{ marginTop: '0.375rem' }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
