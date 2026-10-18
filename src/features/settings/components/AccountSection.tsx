import type { ChangeEvent } from 'react';
import type { Language } from '@/lib/i18n';
import type { UserProfile } from '@/types';

interface AccountSectionProps {
  language: Language;
  profile: UserProfile | null;
  accountName: string;
  accountEmail: string;
  accountInitials: string;
  isEditingProfile: boolean;
  setIsEditingProfile: (v: boolean) => void;
  profileName: string;
  setProfileName: (n: string) => void;
  profileAvatarUrl: string;
  setProfileAvatarUrl: (u: string) => void;
  profileAvatarFile: File | null;
  setProfileAvatarFile: (f: File | null) => void;
  profileSaving: boolean;
  profileError: string;
  setProfileError: (e: string) => void;
  profileSaved: boolean;
  setProfileSaved: (v: boolean) => void;
  handleSaveProfile: () => void;
  handlePasswordReset: () => void;
  resetSending: boolean;
  resetMessage: string;
  resetError: string;
  signOut: () => Promise<void>;
}

export function AccountSection({
  language,
  profile,
  accountName,
  accountEmail,
  accountInitials,
  isEditingProfile,
  setIsEditingProfile,
  profileName,
  setProfileName,
  profileAvatarUrl,
  setProfileAvatarUrl,
  profileAvatarFile,
  setProfileAvatarFile,
  profileSaving,
  profileError,
  setProfileError,
  profileSaved,
  setProfileSaved,
  handleSaveProfile,
  handlePasswordReset,
  resetSending,
  resetMessage,
  resetError,
  signOut,
}: AccountSectionProps) {
  const isId = language === 'id';

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileError(
        isId ? 'Pilih foto berukuran kurang dari 5 MB.' : 'Choose an image smaller than 5 MB.'
      );
      event.target.value = '';
      return;
    }
    setProfileError('');
    setProfileAvatarFile(file);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--on-surface)"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <h3 style={{ fontSize: '1.125rem' }}>{isId ? 'Akun' : 'Account'}</h3>
      </div>
      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--on-surface-variant)',
          marginBottom: '1.25rem',
        }}
      >
        {isId ? 'Detail profil untuk akun Omnia Anda.' : 'Profile details for your Omnia account.'}
      </p>

      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            margin: '0 auto 0.75rem',
            background: 'var(--primary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-primary-container)',
            fontSize: '1.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
          }}
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            accountInitials
          )}
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{accountName}</div>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label
          htmlFor="account-email-input"
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '0.375rem',
            color: 'var(--on-surface)',
          }}
        >
          {isId ? 'Email akun' : 'Account email'}
        </label>
        <input
          id="account-email-input"
          type="email"
          value={accountEmail}
          readOnly
          style={{ width: '100%', background: 'var(--surface-container)' }}
        />
      </div>

      {isEditingProfile ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div>
            <label htmlFor="profile-display-name" className="label">
              {isId ? 'Nama tampilan' : 'Display name'}
            </label>
            <input
              id="profile-display-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              maxLength={80}
              required
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="profile-avatar-url" className="label">
              {isId ? 'URL foto profil' : 'Profile image URL'}
            </label>
            <input
              id="profile-avatar-url"
              type="url"
              value={profileAvatarUrl}
              onChange={(event) => setProfileAvatarUrl(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="profile-avatar-file" className="label">
              {isId ? 'Atau unggah foto' : 'Or upload an image'}
            </label>
            <input
              id="profile-avatar-file"
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif"
              onChange={handleFileChange}
              style={{ width: '100%' }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
                marginTop: '0.25rem',
              }}
            >
              <span>
                PNG, JPG, WebP, GIF, {isId ? 'atau' : 'or'} AVIF · {isId ? 'hingga' : 'up to'} 5 MB
                {profileAvatarFile ? ` · ${profileAvatarFile.name}` : ''}
              </span>
              {profileAvatarFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileAvatarFile(null);
                    const fileInput = document.getElementById(
                      'profile-avatar-file'
                    ) as HTMLInputElement | null;
                    if (fileInput) fileInput.value = '';
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--error, #ba1a1a)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  {isId ? 'Batal pilih' : 'Clear'}
                </button>
              )}
            </div>
          </div>
          {profileError && (
            <div role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>
              {profileError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setIsEditingProfile(false);
                setProfileError('');
                setProfileAvatarFile(null);
              }}
            >
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving
                ? isId
                  ? 'Menyimpan…'
                  : 'Saving…'
                : isId
                  ? 'Simpan profil'
                  : 'Save profile'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-outline"
          onClick={() => {
            setIsEditingProfile(true);
            setProfileSaved(false);
          }}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}
        >
          {isId ? 'Ubah profil' : 'Edit profile'}
        </button>
      )}
      {profileSaved && (
        <div
          role="status"
          style={{ color: 'var(--primary)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}
        >
          {isId ? 'Profil tersimpan.' : 'Profile saved.'}
        </div>
      )}

      <button
        type="button"
        className="btn-outline"
        onClick={handlePasswordReset}
        disabled={resetSending}
        style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}
      >
        {resetSending
          ? isId
            ? 'Mengirim tautan…'
            : 'Sending reset link…'
          : isId
            ? 'Atur ulang kata sandi'
            : 'Reset password'}
      </button>
      {resetMessage && (
        <div
          role="status"
          style={{ color: 'var(--primary)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}
        >
          {resetMessage}
        </div>
      )}
      {resetError && (
        <div
          role="alert"
          style={{ color: 'var(--error)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}
        >
          {resetError}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          void signOut().catch((error: unknown) =>
            window.alert(error instanceof Error ? error.message : 'Unable to sign out.')
          )
        }
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1rem',
          border: '1px solid var(--error-container)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--error-container)',
          color: 'var(--error)',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {isId ? 'Keluar' : 'Sign out'}
      </button>
    </div>
  );
}
