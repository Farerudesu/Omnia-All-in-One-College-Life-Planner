import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SignInPage } from './pages/SignInPage';
import { SchedulePage } from './pages/SchedulePage';
import { CalendarPage } from './pages/CalendarPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { FinancePage } from './pages/FinancePage';
import { SettingsPage } from './pages/SettingsPage';
import { AskOmniPage } from './pages/AskOmniPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DebugPage } from './pages/DebugPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/version" element={<VersionPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/debug-omni" element={<DebugPage />} />
          <Route path="/signin" element={<SignInRoute />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/ask-omni" element={<AskOmniPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/schedule" replace />} />
        </Route>
          </Route>
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

function VersionPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Omnia version</h1>
      <p>Version: 1.7.2</p>
      <p>Build: 2026-10-15 05:45:00 +08:00</p>
      <p>Commit: feat-omni-api-diagnostics-and-debug-page</p>
      <p>Changelog: Add full-featured Omnia API &amp; Engine Debug Console (/debug), fix LLM model fallback chain with active Google Gemini (gemini-flash-latest, gemini-3.8-flash) &amp; Groq models, and surface deep Edge Function diagnostics</p>
      <p style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <a href="/schedule" style={{ color: 'var(--primary, #0284c7)', textDecoration: 'underline' }}>← Back to App</a>
        <a href="/debug" style={{ color: 'var(--primary, #0284c7)', textDecoration: 'underline' }}>🔧 Open Debug Console</a>
      </p>
    </main>
  );
}

function SignInRoute() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  return user ? <Navigate to="/schedule" replace /> : <SignInPage />;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  return user ? <Outlet /> : <Navigate to="/signin" replace />;
}

function AuthLoading() {
  return <main role="status" style={{ padding: '2rem', color: 'var(--on-surface-variant)' }}>Checking your session…</main>;
}
