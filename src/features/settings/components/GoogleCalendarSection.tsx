import { RefreshCw } from 'lucide-react';
import type { Language } from '@/lib/i18n';
import type { UserSettings } from '@/types';
import * as ds from '@/lib/dataService';

interface GoogleCalendarSectionProps {
  language: Language;
  settings: UserSettings;
  isGcalConnected: boolean;
  isGcalConnecting: boolean;
  isGcalSyncing: boolean;
  gcalEmail: string;
  gcalSyncResult: string | null;
  gcalError: string | null;
  syncClasses: boolean;
  syncAssignments: boolean;
  syncEvents: boolean;
  importPersonal: boolean;
  handleConnectGoogle: () => void;
  handleDisconnectGoogle: () => void;
  handleSyncNow: () => void;
  handleToggleOption: (
    key: 'classes' | 'assignments' | 'events' | 'import',
    value: boolean
  ) => void;
}

export function GoogleCalendarSection({
  language,
  settings,
  isGcalConnected,
  isGcalConnecting,
  isGcalSyncing,
  gcalEmail,
  gcalSyncResult,
  gcalError,
  syncClasses,
  syncAssignments,
  syncEvents,
  importPersonal,
  handleConnectGoogle,
  handleDisconnectGoogle,
  handleSyncNow,
  handleToggleOption,
}: GoogleCalendarSectionProps) {
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
            background: 'rgba(66, 133, 244, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Google Calendar Multi-color Icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="2" />
            <line
              x1="16"
              y1="2"
              x2="16"
              y2="6"
              stroke="#EA4335"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="2"
              x2="8"
              y2="6"
              stroke="#34A853"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line x1="3" y1="10" x2="21" y2="10" stroke="#FBBC05" strokeWidth="2" />
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#4285F4" />
            <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#34A853" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Google Calendar</h3>
            {isGcalConnected && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 999,
                  background: 'rgba(52, 168, 83, 0.15)',
                  color: 'var(--classes, #2d6a4f)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A853' }} />
                {isId ? 'Terhubung' : 'Connected'}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--on-surface-variant)',
              marginTop: '0.25rem',
              marginBottom: 0,
            }}
          >
            {isId
              ? 'Sinkronisasi dua arah otomatis antara Omnia dan akun Google Calendar Anda.'
              : 'Two-way synchronization between Omnia and your personal Google Calendar.'}
          </p>
        </div>
      </div>

      {!isGcalConnected ? (
        <div
          style={{
            padding: '1rem',
            borderRadius: 10,
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
          }}
        >
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--on-surface-variant)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isId
              ? 'Hubungkan akun Google Anda. Omnia akan membuat kalender khusus bernama "Omnia College Life" agar jadwal pribadi Anda di Google Calendar tetap rapi, dan mengimpor acara Google Calendar Anda ke Omnia.'
              : 'Connect your Google account. Omnia creates a dedicated "Omnia College Life" calendar so your personal calendar stays clean, while importing your Google events into Omnia.'}
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={handleConnectGoogle}
            disabled={isGcalConnecting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '0.625rem 1.25rem',
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: isGcalConnecting ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {isGcalConnecting
              ? isId
                ? 'Menghubungkan…'
                : 'Connecting…'
              : isId
                ? 'Hubungkan dengan Google'
                : 'Connect with Google'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Account & Target Info */}
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 10,
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}
              >
                {isId ? 'AKUN GOOGLE' : 'GOOGLE ACCOUNT'}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                {gcalEmail || 'Google User'}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--on-surface-variant)',
                  marginTop: '0.125rem',
                }}
              >
                {isId ? 'Kalender tujuan: ' : 'Target calendar: '}
                <strong>
                  {settings.googleCalendarTarget === 'secondary'
                    ? 'Omnia College Life'
                    : isId
                      ? 'Kalender Utama (Primary)'
                      : 'Primary Calendar'}
                </strong>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
                alignItems: 'flex-end',
              }}
            >
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.6rem',
                }}
              >
                Google Calendar ↗
              </a>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  const nextTarget =
                    settings.googleCalendarTarget === 'secondary' ? 'primary' : 'secondary';
                  await ds.updateSettings({
                    googleCalendarTarget: nextTarget,
                    googleCalendarId:
                      nextTarget === 'secondary'
                        ? settings.googleCalendarId || 'secondary'
                        : 'primary',
                  });
                }}
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--primary)',
                  padding: '0.2rem 0.4rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                {settings.googleCalendarTarget === 'secondary'
                  ? isId
                    ? 'Ganti ke Kalender Utama'
                    : 'Switch to Primary Calendar'
                  : isId
                    ? 'Ganti ke Kalender Khusus'
                    : 'Switch to Omnia Calendar'}
              </button>
            </div>
          </div>

          {/* Sync Options Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={syncClasses}
                onChange={(e) => void handleToggleOption('classes', e.target.checked)}
              />
              <span>
                {isId
                  ? 'Kirim jadwal kuliah rutin (Classes & Sessions)'
                  : 'Push recurring classes & lectures to Google Calendar'}
              </span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={syncAssignments}
                onChange={(e) => void handleToggleOption('assignments', e.target.checked)}
              />
              <span>
                {isId
                  ? 'Kirim tenggat tugas & praktikum (Assignments)'
                  : 'Push assignments & deadlines to Google Calendar'}
              </span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={syncEvents}
                onChange={(e) => void handleToggleOption('events', e.target.checked)}
              />
              <span>
                {isId
                  ? 'Kirim jadwal ujian & kegiatan (Exams & Events)'
                  : 'Push exams & custom events to Google Calendar'}
              </span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={importPersonal}
                onChange={(e) => void handleToggleOption('import', e.target.checked)}
              />
              <span>
                {isId
                  ? 'Impor acara pribadi dari Google Calendar ke Omnia'
                  : 'Import personal Google Calendar events into Omnia'}
              </span>
            </label>
          </div>

          {/* Action Buttons & Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {settings.googleLastSynced ? (
                <>
                  {isId ? 'Terakhir disinkronkan: ' : 'Last synced: '}
                  <strong>
                    {new Date(settings.googleLastSynced).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </>
              ) : isId ? (
                'Belum pernah disinkronkan'
              ) : (
                'Not yet synced'
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleDisconnectGoogle}
                style={{ fontSize: '0.8125rem', color: 'var(--error)' }}
              >
                {isId ? 'Putuskan' : 'Disconnect'}
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSyncNow}
                disabled={isGcalSyncing}
                style={{
                  fontSize: '0.8125rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.45rem 0.875rem',
                }}
              >
                <RefreshCw
                  size={13}
                  style={{
                    animation: isGcalSyncing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                {isGcalSyncing
                  ? isId
                    ? 'Menyinkronkan…'
                    : 'Syncing…'
                  : isId
                    ? 'Sinkronkan Sekarang'
                    : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {gcalSyncResult && (
        <div
          role="status"
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: 8,
            background: 'var(--primary-container)',
            color: 'var(--primary)',
            fontSize: '0.8125rem',
          }}
        >
          ✓ {gcalSyncResult}
        </div>
      )}

      {gcalError && (
        <div
          role="alert"
          style={{
            marginTop: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: 8,
            background: 'var(--error-container)',
            color: 'var(--error)',
            fontSize: '0.8125rem',
          }}
        >
          ⚠ {gcalError}
        </div>
      )}
    </div>
  );
}
