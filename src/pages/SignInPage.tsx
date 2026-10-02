import { useState } from 'react';
import { Modal } from '../components/Modal';
import { OmniaLogo } from '../components/OmniaLogo';
import { useAuth } from '../lib/AuthContext';

export function SignInPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const needsEmailConfirmation = await signUp(email, password);
        if (needsEmailConfirmation) setSuccessMessage('Check your email to confirm your account, then sign in.');
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Top bar */}
      <header style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'flex', color: 'var(--on-primary)' }}>
              <OmniaLogo size={18} />
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            Omnia
          </span>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setShowHelpModal(true)}
          style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Help
        </button>
      </header>

      {/* Center card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem 2rem',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--outline-variant)',
        }}>
          {/* Logo icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-sm)', margin: '0 auto 1.25rem',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'flex', color: 'var(--on-primary)' }}>
              <OmniaLogo size={24} />
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '0.375rem',
            letterSpacing: '-0.02em',
          }}>
            {isSignUp ? 'Create your account' : 'Welcome back to Omnia'}
          </h1>
          <p style={{
            textAlign: 'center',
            color: 'var(--on-surface-variant)',
            fontSize: '0.875rem',
            marginBottom: '1.75rem',
            lineHeight: 1.5,
          }}>
            {isSignUp
              ? 'Keep your classes, assignments, and plans together in one place.'
              : 'Sign in to see your classes, assignments, and plans.'}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="sign-in-email" style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
                color: 'var(--on-surface)',
              }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <svg
                  width="18" height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-surface-variant)"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="sign-in-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{ width: '100%', paddingLeft: 40 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.375rem',
              }}>
                <label htmlFor="sign-in-password" style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <svg
                  width="18" height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-surface-variant)"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <input
                  id="sign-in-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  minLength={isSignUp ? 6 : undefined}
                  style={{ width: '100%', paddingLeft: 40, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 8, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--outline)',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {errorMessage && <div role="alert" style={{ marginBottom: '1rem', color: 'var(--error)', fontSize: '0.8125rem' }}>{errorMessage}</div>}
            {successMessage && <div role="status" style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '0.8125rem' }}>{successMessage}</div>}

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.8125rem',
                fontSize: '0.9375rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in to Omnia'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>

          {/* Bottom divider + toggle */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--outline-variant)',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
          }}>
            {isSignUp ? 'Already have an account? ' : "Need an account? "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        fontSize: '0.8125rem',
        color: 'var(--on-surface-variant)',
        borderTop: '1px solid var(--outline-variant)',
        background: 'var(--surface-container-lowest)',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <span className="tabular-nums">© 2026 Omnia · A personal planner for college life.</span>
        <button type="button" onClick={() => setShowHelpModal(true)} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer' }}>Sign-in help</button>
      </footer>

      <Modal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} title="Sign-in help">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            <p>Sign in with the email address and password for your Omnia account. New here? Choose “Create an account” below the form.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button type="button" className="btn-primary" onClick={() => setShowHelpModal(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
