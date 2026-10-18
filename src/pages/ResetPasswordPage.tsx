import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { OmniaLogo } from '../components/OmniaLogo';

export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      setSaved(true);
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Unable to update your password.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
        background: 'var(--surface)',
      }}
    >
      <section className="card" style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: 'var(--primary)',
          }}
        >
          <OmniaLogo size={38} />
        </div>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Reset your password</h1>
        {loading ? (
          <p role="status" style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>
            Checking your reset link…
          </p>
        ) : !user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
              This reset link is invalid or has expired. Request a new one from sign in.
            </p>
            <Link
              to="/signin"
              className="btn-primary"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              Back to sign in
            </Link>
          </div>
        ) : saved ? (
          <div style={{ textAlign: 'center' }}>
            <p role="status" style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
              Your password has been updated.
            </p>
            <Link
              to="/schedule"
              className="btn-primary"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              Continue to Omnia
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
          >
            <div>
              <label htmlFor="new-password" className="label">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="label">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            {error && (
              <div role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ justifyContent: 'center' }}
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
