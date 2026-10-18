import { Check, Copy, Share2 } from 'lucide-react';
import type { Language } from '@/lib/i18n';

interface ShareImportSectionProps {
  language: Language;
  shareCode: string;
  isCreatingShareCode: boolean;
  isShareCodeCopied: boolean;
  shareCreateError: string;
  importCode: string;
  setImportCode: (code: string) => void;
  isPreviewingShare: boolean;
  importError: string;
  importSuccess: string;
  handleCreateShareCode: () => void;
  handleCopyShareCode: () => void;
  handlePreviewShareCode: () => void;
  hasChanges: boolean;
  handleSave: () => void;
  handleReset: () => void;
  saved: boolean;
}

export function ShareImportSection({
  language,
  shareCode,
  isCreatingShareCode,
  isShareCodeCopied,
  shareCreateError,
  importCode,
  setImportCode,
  isPreviewingShare,
  importError,
  importSuccess,
  handleCreateShareCode,
  handleCopyShareCode,
  handlePreviewShareCode,
  hasChanges,
  handleSave,
  handleReset,
  saved,
}: ShareImportSectionProps) {
  const isId = language === 'id';

  return (
    <>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem' }}>{isId ? 'Bagikan & Impor Jadwal' : 'Share & import schedule'}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              {isId
                ? 'Bagikan salinan jadwal Anda ke teman lewat kode atau impor jadwal mahasiswa lain.'
                : "Share your schedule snapshot with a classmate via short code or import another student's timetable."}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: 10,
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {isId ? 'Bagikan jadwal saya' : 'Share my schedule'}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
            {isId
              ? 'Buat kode untuk salinan kelas dan tugas Anda.'
              : 'Create a code for a snapshot of your classes and assignments.'}
          </p>
          {shareCode ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <output
                aria-label="Schedule share code"
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1.375rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--on-surface)' }}
              >
                {shareCode}
              </output>
              <button
                type="button"
                className="btn-outline min-touch-target"
                aria-label={isShareCodeCopied ? (isId ? 'Kode disalin' : 'Code copied') : (isId ? 'Salin kode' : 'Copy share code')}
                title="Copy code"
                onClick={handleCopyShareCode}
              >
                {isShareCodeCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-outline"
              onClick={handleCreateShareCode}
              disabled={isCreatingShareCode}
              style={{ width: '100%', justifyContent: 'center', gap: '0.375rem' }}
            >
              <Share2 size={15} aria-hidden="true" />
              {isCreatingShareCode ? (isId ? 'Membuat kode…' : 'Generating code…') : (isId ? 'Buat kode' : 'Generate code')}
            </button>
          )}
          {isShareCodeCopied && <div role="status" style={{ marginTop: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>{isId ? 'Kode disalin.' : 'Code copied.'}</div>}
          {shareCreateError && <div role="alert" style={{ marginTop: '0.5rem', color: 'var(--error)', fontSize: '0.75rem' }}>{shareCreateError}</div>}
        </div>

        <div
          style={{
            padding: '1rem',
            borderRadius: 10,
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {isId ? 'Gabung dengan kode' : 'Join with code'}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
            {isId
              ? 'Masukkan 6 karakter kode untuk melihat kelas dan tugas sebelum menyalinnya ke jadwal Anda.'
              : 'Enter a 6-character code to preview classes and assignments before copying them into your schedule.'}
          </p>
          <div className="settings-share-code-form">
            <label htmlFor="import-schedule-code" className="sr-only">Schedule share code</label>
            <input
              id="import-schedule-code"
              value={importCode}
              onChange={(event) =>
                setImportCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z2-9]/g, '')
                    .replace(/[IO]/g, '')
                    .slice(0, 6)
                )
              }
              placeholder="AB3K7Z"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              aria-describedby="import-schedule-code-hint"
              style={{ background: 'var(--surface-container)', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', textAlign: 'center' }}
            />
            <button
              type="button"
              className="btn-primary min-touch-target"
              onClick={handlePreviewShareCode}
              disabled={importCode.length !== 6 || isPreviewingShare}
            >
              {isPreviewingShare ? (isId ? 'Memeriksa…' : 'Checking…') : (isId ? 'Pratinjau' : 'Preview')}
            </button>
          </div>
          <div id="import-schedule-code-hint" style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>
            {isId ? 'Hanya huruf dan angka. Huruf O dan I tidak digunakan.' : 'Letters and numbers only. O and I are not used.'}
          </div>
          {importError && <div role="alert" style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.5rem' }}>{importError}</div>}
        </div>
        {importSuccess && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              right: '1.5rem',
              bottom: '1.5rem',
              zIndex: 1000,
              padding: '0.875rem 1rem',
              borderRadius: 8,
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {importSuccess}
          </div>
        )}
      </div>

      {/* Mobile Save Actions Row */}
      <div className="card show-mobile" style={{ padding: '1rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <button
            type="button"
            className="btn-primary min-touch-target"
            onClick={handleSave}
            style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
          >
            {saved ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isId ? 'Tersimpan!' : 'Saved!'}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {isId ? 'Simpan preferensi' : 'Save preferences'}
              </span>
            )}
          </button>
          {hasChanges && (
            <button
              type="button"
              className="btn-outline min-touch-target"
              onClick={handleReset}
              style={{ width: '100%', justifyContent: 'center', minHeight: 40 }}
            >
              {isId ? 'Batal perubahan' : 'Reset changes'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
