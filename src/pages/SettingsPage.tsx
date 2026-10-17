import { useState, useEffect } from 'react';
import { Check, Copy, Share2, Globe, RefreshCw } from 'lucide-react';
import * as gcal from '../lib/googleCalendarService';
import { Modal } from '../components/Modal';
import { useData } from '../lib/useData';
import { useAuth } from '../lib/AuthContext';
import { getCurrencyFractionDigits, getCurrencySymbol, isSupportedCurrencyCode } from '../lib/currency';
import * as ds from '../lib/dataService';
import type { UserSettings } from '../types';
import type { SharePreview } from '../lib/dataService';
import { getLanguage, setLanguage, translations, type Language } from '../lib/i18n';
import { getUserTimezone } from '../lib/dateUtils';

export function SettingsPage() {
  const { user, signOut, requestPasswordReset } = useAuth();
  const settings = useData(ds.getSettings);
  const courses = useData(ds.getCourses);
  const profile = useData(ds.getProfile);
  const metadataName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const accountName = profile?.fullName.trim() || metadataName || user?.email?.split('@')[0] || 'Omnia account';
  const accountEmail = profile?.universityEmail || user?.email || '';
  const accountInitials = accountName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  const [language, setLangState] = useState<Language>(getLanguage());
  const [monthlyBudget, setMonthlyBudget] = useState(String(settings.monthlyBudget));
  const [currency, setCurrency] = useState(settings.currency);
  const [currencyError, setCurrencyError] = useState('');
  const [timeZone, setTimeZone] = useState(settings.timeZone || getUserTimezone());
  const [initialBalance, setInitialBalance] = useState(settings.initialBalance !== undefined ? String(settings.initialBalance) : '');
  const [theme, setTheme] = useState(settings.theme);
  const [termName, setTermName] = useState(settings.termName || '');
  const [termStartDate, setTermStartDate] = useState(settings.semesterStart);
  const [termEndDate, setTermEndDate] = useState(settings.semesterEnd);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(settings.firstDayOfWeek || 'monday');
  const [notifEnabled, setNotifEnabled] = useState(settings.notifEnabled ?? true);
  const [saved, setSaved] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(profile?.fullName || user?.user_metadata?.full_name || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(profile?.avatarUrl || '');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  // Share & Import State
  const [shareCode, setShareCode] = useState('');
  const [isCreatingShareCode, setIsCreatingShareCode] = useState(false);
  const [isShareCodeCopied, setIsShareCodeCopied] = useState(false);
  const [shareCreateError, setShareCreateError] = useState('');
  const [importCode, setImportCode] = useState('');
  const [previewData, setPreviewData] = useState<SharePreview | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isPreviewingShare, setIsPreviewingShare] = useState(false);
  const [isImportingShare, setIsImportingShare] = useState(false);

  // Payment Methods State
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(ds.getPaymentMethods());
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Google Calendar Sync State
  const [isGcalConnected, setIsGcalConnected] = useState(() => gcal.isGoogleCalendarConnected());
  const [gcalEmail, setGcalEmail] = useState(() => gcal.getConnectedGoogleEmail() || settings.googleAccountEmail || '');
  const [isGcalConnecting, setIsGcalConnecting] = useState(false);
  const [isGcalSyncing, setIsGcalSyncing] = useState(false);
  const [gcalSyncResult, setGcalSyncResult] = useState<string | null>(null);
  const [gcalError, setGcalError] = useState<string | null>(null);
  const [syncClasses, setSyncClasses] = useState(settings.googleSyncClasses ?? true);
  const [syncAssignments, setSyncAssignments] = useState(settings.googleSyncAssignments ?? true);
  const [syncEvents, setSyncEvents] = useState(settings.googleSyncEvents ?? true);
  const [importPersonal, setImportPersonal] = useState(settings.googleImportPersonal ?? true);

  useEffect(() => {
    return gcal.subscribeGoogleCalendar(() => {
      setIsGcalConnected(gcal.isGoogleCalendarConnected());
      setGcalEmail(gcal.getConnectedGoogleEmail() || settings.googleAccountEmail || '');
    });
  }, [settings.googleAccountEmail]);

  const handleConnectGoogle = async () => {
    setIsGcalConnecting(true);
    setGcalError(null);
    setGcalSyncResult(null);
    try {
      const res = await gcal.connectGoogleCalendar();
      setGcalEmail(res.email);
      setIsGcalConnected(true);
      // Automatically trigger initial two-way sync
      setIsGcalSyncing(true);
      const syncRes = await gcal.syncTwoWay();
      setGcalSyncResult(
        language === 'id'
          ? `Tersinkronisasi! ${syncRes.classesCount} kuliah, ${syncRes.assignmentsCount} tugas, ${syncRes.eventsCount} kegiatan terkirim ke Google Calendar. ${syncRes.pulledCount} acara diterima.`
          : `Connected & synced! ${syncRes.classesCount} classes, ${syncRes.assignmentsCount} tasks, ${syncRes.eventsCount} events pushed. ${syncRes.pulledCount} events imported.`
      );
    } catch (err: any) {
      console.error('Google Calendar connect error:', err);
      setGcalError(err?.message || (language === 'id' ? 'Gagal menghubungkan Google Calendar.' : 'Failed to connect to Google Calendar.'));
    } finally {
      setIsGcalConnecting(false);
      setIsGcalSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await gcal.disconnectGoogleCalendar();
      setIsGcalConnected(false);
      setGcalEmail('');
      setGcalSyncResult(null);
    } catch (err: any) {
      console.error('Disconnect error:', err);
    }
  };

  const handleSyncNow = async () => {
    if (isGcalSyncing) return;
    setIsGcalSyncing(true);
    setGcalError(null);
    setGcalSyncResult(null);
    try {
      const syncRes = await gcal.syncTwoWay();
      setGcalSyncResult(
        language === 'id'
          ? `Sinkronisasi selesai! ${syncRes.classesCount} kuliah, ${syncRes.assignmentsCount} tugas, ${syncRes.eventsCount} kegiatan diperbarui di Google Calendar.`
          : `Sync completed! ${syncRes.classesCount} classes, ${syncRes.assignmentsCount} tasks, ${syncRes.eventsCount} events updated in Google Calendar.`
      );
    } catch (err: any) {
      console.error('Google Calendar sync error:', err);
      setGcalError(err?.message || (language === 'id' ? 'Gagal menyinkronkan data.' : 'Failed to sync data with Google Calendar.'));
    } finally {
      setIsGcalSyncing(false);
    }
  };

  const handleToggleOption = async (key: 'classes' | 'assignments' | 'events' | 'import', value: boolean) => {
    if (key === 'classes') {
      setSyncClasses(value);
      await ds.updateSettings({ googleSyncClasses: value });
    } else if (key === 'assignments') {
      setSyncAssignments(value);
      await ds.updateSettings({ googleSyncAssignments: value });
    } else if (key === 'events') {
      setSyncEvents(value);
      await ds.updateSettings({ googleSyncEvents: value });
    } else if (key === 'import') {
      setImportPersonal(value);
      await ds.updateSettings({ googleImportPersonal: value });
    }
  };

  const t = translations[language];

  useEffect(() => {
    setMonthlyBudget(String(settings.monthlyBudget));
    setCurrency(settings.currency);
    setTheme(settings.theme);
    setTermName(settings.termName || '');
    setTermStartDate(settings.semesterStart);
    setTermEndDate(settings.semesterEnd);
    setFirstDayOfWeek(settings.firstDayOfWeek || 'monday');
    setNotifEnabled(settings.notifEnabled ?? true);
    setPaymentMethodsList(ds.getPaymentMethods());
    setTimeZone(settings.timeZone || getUserTimezone());
    setInitialBalance(settings.initialBalance !== undefined ? String(settings.initialBalance) : '');
    if (settings.language) setLangState(settings.language);
  }, [settings.monthlyBudget, settings.currency, settings.theme, settings.termName, settings.semesterStart, settings.semesterEnd, settings.firstDayOfWeek, settings.notifEnabled, settings.language, settings.timeZone, settings.initialBalance]);

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.trim()) return;
    const updated = ds.addPaymentMethod(newPaymentMethod.trim());
    setPaymentMethodsList(updated);
    setNewPaymentMethod('');
  };

  const handleDeletePaymentMethod = (pm: string) => {
    const updated = ds.deletePaymentMethod(pm);
    setPaymentMethodsList(updated);
  };

  useEffect(() => {
    setProfileName(profile?.fullName || metadataName || user?.email?.split('@')[0] || '');
    setProfileAvatarUrl(profile?.avatarUrl || '');
  }, [profile?.fullName, profile?.avatarUrl, user?.id]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      setProfileError('Enter a display name.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const avatarUrl = profileAvatarFile
        ? await ds.uploadProfileAvatar(profileAvatarFile)
        : profileAvatarUrl.trim() || undefined;
      await ds.updateProfile({
        fullName: profileName.trim(),
        universityEmail: accountEmail,
        avatarUrl,
      });
      setProfileAvatarFile(null);
      setIsEditingProfile(false);
      setProfileSaved(true);
    } catch (error: any) {
      const message = error?.message || (typeof error === 'string' ? error : 'Unable to save your profile.');
      setProfileError(/bucket.*not found/i.test(message)
        ? 'Profile image storage is not set up yet. Apply the profile avatar migration with `supabase db push`, then try again.'
        : message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setResetError('No email address is available for this account.');
      return;
    }
    setResetSending(true);
    setResetError('');
    setResetMessage('');
    try {
      await requestPasswordReset(user.email);
      setResetMessage(`Password reset link sent to ${user.email}.`);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Unable to send a reset link.');
    } finally {
      setResetSending(false);
    }
  };

  const handlePreviewShareCode = async () => {
    setImportError('');
    setImportSuccess('');
    setIsPreviewingShare(true);
    try {
      const preview = await ds.previewShareCode(importCode);
      setPreviewData(preview);
      setShowImportModal(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid or expired code.');
    } finally {
      setIsPreviewingShare(false);
    }
  };

  const handleCreateShareCode = async () => {
    setShareCreateError('');
    setShareCode('');
    setIsShareCodeCopied(false);
    setIsCreatingShareCode(true);
    try {
      setShareCode(await ds.createShareCode());
    } catch (error) {
      setShareCreateError(error instanceof Error ? error.message : 'Unable to create a share code.');
    } finally {
      setIsCreatingShareCode(false);
    }
  };

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setIsShareCodeCopied(true);
      window.setTimeout(() => setIsShareCodeCopied(false), 1800);
    } catch {
      setShareCreateError('Clipboard access is unavailable. Select and copy the code.');
    }
  };

  const handleImportShareCode = async () => {
    setImportError('');
    setIsImportingShare(true);
    try {
      const result = await ds.redeemShareCode(importCode);
      setImportSuccess(`Copied ${result.classes} ${result.classes === 1 ? 'class' : 'classes'} and ${result.assignments} ${result.assignments === 1 ? 'assignment' : 'assignments'}.`);
      setImportCode('');
      setShowImportModal(false);
      setPreviewData(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid or expired code.');
      setShowImportModal(false);
    } finally {
      setIsImportingShare(false);
    }
  };

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const hasChanges =
    language !== (settings.language || 'id') ||
    theme !== settings.theme ||
    currency !== settings.currency ||
    monthlyBudget !== String(settings.monthlyBudget) ||
    termName !== (settings.termName || '') ||
    termStartDate !== settings.semesterStart ||
    termEndDate !== settings.semesterEnd ||
    firstDayOfWeek !== (settings.firstDayOfWeek || 'monday') ||
    notifEnabled !== (settings.notifEnabled ?? true) ||
    timeZone !== (settings.timeZone || getUserTimezone()) ||
    initialBalance.trim() !== (settings.initialBalance !== undefined ? String(settings.initialBalance) : '');

  const handleReset = () => {
    setLangState(settings.language || 'id');
    setTheme(settings.theme);
    setCurrency(settings.currency);
    setMonthlyBudget(String(settings.monthlyBudget));
    setTermName(settings.termName || '');
    setTermStartDate(settings.semesterStart);
    setTermEndDate(settings.semesterEnd);
    setFirstDayOfWeek(settings.firstDayOfWeek || 'monday');
    setNotifEnabled(settings.notifEnabled ?? true);
    setTimeZone(settings.timeZone || getUserTimezone());
    setInitialBalance(settings.initialBalance !== undefined ? String(settings.initialBalance) : '');
  };

  const handleSave = () => {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!isSupportedCurrencyCode(normalizedCurrency)) {
      setCurrencyError('Enter a valid 3-letter ISO currency code.');
      return;
    }
    setCurrencyError('');
    const initBalNum = initialBalance.trim() ? parseFloat(initialBalance) : undefined;
    const updated: UserSettings = {
      ...settings,
      monthlyBudget: parseFloat(monthlyBudget) || 1850,
      currency: normalizedCurrency,
      theme,
      termName,
      semesterStart: termStartDate,
      semesterEnd: termEndDate,
      firstDayOfWeek,
      notifEnabled,
      language,
      timeZone,
      initialBalance: initBalNum,
    };
    setLanguage(language);
    ds.updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleExportCoursesCSV = () => {
    const headers = ['Course Code', 'Name', 'Credits', 'Professor', 'Room', 'Color'];
    const rows = courses.map((c) => [
      `"${c.code}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      c.credits,
      `"${(c.professor || '').replace(/"/g, '""')}"`,
      `"${(c.room || '').replace(/"/g, '""')}"`,
      `"${c.color}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `omnia-curriculum-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportICS = () => {
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Omnia Academic OS//Academic Timetable//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Omnia Academic Schedule',
      ...courses.map((c, idx) => [
        'BEGIN:VEVENT',
        `UID:omnia-course-${c.id}-${idx}@academic.local`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `SUMMARY:${c.code} - ${c.name}`,
        `DESCRIPTION:Professor: ${c.professor || 'TBA'} | Credits: ${c.credits}`,
        `LOCATION:${c.room || 'Campus'}`,
        'END:VEVENT',
      ].join('\r\n')),
      'END:VCALENDAR',
    ];
    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `omnia-schedule-${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settings-page-container">
      <div className="page-header">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <h1 style={{ margin: 0 }}>{t.settings.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasChanges && (
            <button
              type="button"
              className="btn-outline min-touch-target"
              onClick={handleReset}
              style={{
                gap: '0.375rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {language === 'id' ? 'Batal perubahan' : 'Reset changes'}
            </button>
            )}
            <button type="button" className="btn-primary min-touch-target" onClick={handleSave} style={{ minWidth: 140, justifyContent: 'center' }}>
              {saved ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {language === 'id' ? 'Tersimpan!' : 'Saved!'}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {language === 'id' ? 'Simpan preferensi' : 'Save preferences'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="settings-layout">
          {/* Left column — Preferences, Budget & Schedule Sharing */}
          <div className="settings-column">
            {/* Language Selector */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--surface-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
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

            {/* Appearance */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--surface-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                  <h3>{language === 'id' ? 'Preferensi Tema' : 'Theme preference'}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {language === 'id'
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
                    { value: 'light', label: language === 'id' ? 'Terang' : 'Light', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
                    { value: 'dark', label: language === 'id' ? 'Gelap' : 'Dark', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
                    { value: 'system', label: language === 'id' ? 'Sistem' : 'System', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                  ].map((tTheme) => (
                    <button
                      key={tTheme.value}
                      type="button"
                      onClick={() => setTheme(tTheme.value as typeof theme)}
                      style={{
                        padding: '1rem',
                        border: theme === tTheme.value ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
                        borderRadius: 12,
                        background: theme === tTheme.value ? 'var(--surface-container)' : 'var(--surface-container-lowest)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>{tTheme.icon}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{tTheme.label}</div>
                      {theme === tTheme.value && (
                        <div style={{ marginTop: '0.375rem' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Budget */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--surface-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div>
                  <h3>{language === 'id' ? 'Anggaran Bulanan' : 'Monthly budget'}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {language === 'id'
                      ? 'Tetapkan batas pengeluaran bulanan untuk pelacakan anggaran langsung.'
                      : 'Set your monthly spending cap for live budget tracking and expense alerts.'}
                  </p>
                </div>
              </div>
              <div className="settings-budget-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{getCurrencySymbol(currency)}</span>
                <label htmlFor="monthly-budget-input" className="sr-only">
                  {language === 'id' ? 'Jumlah anggaran bulanan' : 'Monthly budget amount'}
                </label>
                <input
                  id="monthly-budget-input"
                  type="number"
                  step={String(1 / (10 ** getCurrencyFractionDigits(currency)))}
                  className="tabular-nums"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  style={{ width: 'min(100%, 200px)', minWidth: 90 }}
                />
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{language === 'id' ? 'per bulan kalender' : 'per calendar month'}</span>
              </div>
            </div>

            {/* Currency */}
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>{language === 'id' ? 'Mata Uang' : 'Currency'}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                {language === 'id'
                  ? 'Pilih mata uang untuk anggaran dan transaksi. Mengubahnya tidak mengonversi nominal sebelumnya.'
                  : 'Choose the currency used for your budget and transactions. Changing it does not convert existing amounts.'}
              </p>
              <label htmlFor="currency-setting" className="label">{language === 'id' ? 'Mata uang' : 'Currency'}</label>
              <input
                id="currency-setting"
                list="currency-code-suggestions"
                value={currency}
                maxLength={3}
                onChange={(event) => { setCurrency(event.target.value.toUpperCase()); setCurrencyError(''); }}
                placeholder="IDR"
                aria-invalid={!!currencyError}
                aria-describedby={currencyError ? 'currency-error' : undefined}
                style={{ width: '100%', textTransform: 'uppercase' }}
              />
              <datalist id="currency-code-suggestions">
                {['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'MYR', 'AUD', 'CAD', 'JPY', 'CNY', 'INR', 'KRW', 'THB', 'PHP', 'VND', 'NZD', 'CHF', 'HKD', 'TWD', 'AED', 'SAR', 'BRL', 'MXN', 'ZAR', 'TRY', 'PLN', 'SEK', 'NOK', 'DKK', 'RUB', 'PKR', 'BDT', 'EGP', 'NGN', 'KES', 'LKR', 'NPR', 'CLP', 'COP', 'ARS', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'ILS', 'HUF', 'CZK', 'RON', 'BGN'].map((code) => <option key={code} value={code} />)}
              </datalist>
              {currencyError && <div id="currency-error" role="alert" style={{ marginTop: '0.375rem', color: 'var(--error)', fontSize: '0.75rem' }}>{currencyError}</div>}
            </div>

            {/* Saldo Kas Awal (Initial Balance) */}
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>{language === 'id' ? 'Saldo Kas Awal (Opsional)' : 'Initial Cash Balance (Optional)'}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                {language === 'id'
                  ? 'Catat saldo awal uang tunai, e-wallet, atau rekening bank kamu sebelum mulai mencatat pengeluaran di Omnia.'
                  : 'Record starting balance across cash and accounts before logging expenses in Omnia.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{getCurrencySymbol(currency)}</span>
                <label htmlFor="initial-balance-input" className="sr-only">
                  {language === 'id' ? 'Saldo kas awal' : 'Initial cash balance'}
                </label>
                <input
                  id="initial-balance-input"
                  type="number"
                  step="1000"
                  className="tabular-nums"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  style={{ width: 'min(100%, 200px)', minWidth: 90 }}
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>{language === 'id' ? 'Zona Waktu' : 'Timezone'}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                {language === 'id'
                  ? 'Pilih zona waktu untuk jadwal kuliah, tenggat tugas, dan catatan pengeluaran.'
                  : 'Select your preferred timezone for schedule timeline, assignment countdowns, and transactions.'}
              </p>
              <label htmlFor="timezone-setting" className="sr-only">
                {language === 'id' ? 'Pilih zona waktu' : 'Select timezone'}
              </label>
              <select
                id="timezone-setting"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.875rem' }}
              >
                <option value="Asia/Jakarta">WIB — Asia/Jakarta (Waktu Indonesia Barat, UTC+7)</option>
                <option value="Asia/Makassar">WITA — Asia/Makassar (Waktu Indonesia Tengah, UTC+8)</option>
                <option value="Asia/Jayapura">WIT — Asia/Jayapura (Waktu Indonesia Timur, UTC+9)</option>
                <option value="UTC">UTC / GMT+0</option>
              </select>
            </div>

            {/* Payment Methods Management Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--surface-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>{language === 'id' ? 'Metode Pembayaran' : 'Payment Methods'}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {language === 'id'
                      ? 'Kelola metode pembayaran yang tersedia pada formulir pencatatan pengeluaran dan Omni AI.'
                      : 'Manage available payment methods for expense logging and Omni AI prefill.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {paymentMethodsList.map((pm) => (
                  <span
                    key={pm}
                    className="badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.625rem',
                      background: 'var(--surface-container-high)',
                      color: 'var(--on-surface)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {pm}
                    {paymentMethodsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePaymentMethod(pm)}
                        aria-label={`${language === 'id' ? 'Hapus' : 'Delete'} ${pm}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--on-surface-variant)',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPaymentMethod();
                    }
                  }}
                  placeholder={language === 'id' ? 'Tambah metode (cth. GoPay, OVO)' : 'Add method (e.g. Card, Venmo)'}
                  style={{ flex: 1, fontSize: '0.8125rem' }}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleAddPaymentMethod}
                  disabled={!newPaymentMethod.trim()}
                  style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                >
                  {language === 'id' ? '+ Tambah' : '+ Add'}
                </button>
              </div>
            </div>

            {/* Term & Reminders */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>{language === 'id' ? 'Semester & Pengingat' : 'Term & reminders'}</h3>
              <div className="settings-terms-grid">
                <div>
                  <label htmlFor="term-name" className="label">{language === 'id' ? 'Nama semester' : 'Term name'}</label>
                  <input id="term-name" value={termName} onChange={(e) => setTermName(e.target.value)} placeholder={language === 'id' ? 'cth. Semester Ganjil 2026' : 'e.g. Fall 2026'} style={{ width: '100%' }} />
                </div>
                <div>
                  <label htmlFor="term-start" className="label">{language === 'id' ? 'Tanggal mulai' : 'Start date'}</label>
                  <input id="term-start" type="date" value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label htmlFor="term-end" className="label">{language === 'id' ? 'Tanggal selesai' : 'End date'}</label>
                  <input id="term-end" type="date" value={termEndDate} onChange={(e) => setTermEndDate(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label htmlFor="first-day" className="label">{language === 'id' ? 'Awal minggu' : 'Week starts on'}</label>
                  <select id="first-day" value={firstDayOfWeek} onChange={(e) => setFirstDayOfWeek(e.target.value)} style={{ width: '100%' }}>
                    <option value="monday">{language === 'id' ? 'Senin' : 'Monday'}</option>
                    <option value="sunday">{language === 'id' ? 'Minggu' : 'Sunday'}</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={notifEnabled} onChange={(e) => setNotifEnabled(e.target.checked)} />
                {language === 'id' ? 'Aktifkan pengingat' : 'Enable reminders'}
              </label>
            </div>

            {/* Google Calendar Two-Way Sync */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'color-mix(in srgb, #4285F4 12%, var(--surface-container))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {/* Google Calendar Multi-color Icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="#34A853" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="#FBBC05" strokeWidth="2" />
                    <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#4285F4" />
                    <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#34A853" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.125rem', margin: 0 }}>
                      Google Calendar
                    </h3>
                    {isGcalConnected && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: 999,
                        background: 'color-mix(in srgb, #34A853 15%, transparent)',
                        color: 'var(--classes, #2d6a4f)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34A853' }} />
                        {language === 'id' ? 'Terhubung' : 'Connected'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', marginBottom: 0 }}>
                    {language === 'id'
                      ? 'Sinkronisasi dua arah otomatis antara Omnia dan akun Google Calendar Anda.'
                      : 'Two-way synchronization between Omnia and your personal Google Calendar.'}
                  </p>
                </div>
              </div>

              {!isGcalConnected ? (
                <div style={{
                  padding: '1rem',
                  borderRadius: 10,
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--outline-variant)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.5 }}>
                    {language === 'id'
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
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    {isGcalConnecting
                      ? (language === 'id' ? 'Menghubungkan…' : 'Connecting…')
                      : (language === 'id' ? 'Hubungkan dengan Google' : 'Connect with Google')}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Account & Target Info */}
                  <div style={{
                    padding: '0.875rem 1rem',
                    borderRadius: 10,
                    background: 'var(--surface-container-low)',
                    border: '1px solid var(--outline-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                        {language === 'id' ? 'AKUN GOOGLE' : 'GOOGLE ACCOUNT'}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>
                        {gcalEmail || 'Google User'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                        {language === 'id' ? 'Kalender tujuan: ' : 'Target calendar: '}
                        <strong>
                          {settings.googleCalendarTarget === 'secondary'
                            ? 'Omnia College Life'
                            : (language === 'id' ? 'Kalender Utama (Primary)' : 'Primary Calendar')}
                        </strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'flex-end' }}>
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost"
                        style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem' }}
                      >
                        Google Calendar ↗
                      </a>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={async () => {
                          const nextTarget = settings.googleCalendarTarget === 'secondary' ? 'primary' : 'secondary';
                          await ds.updateSettings({
                            googleCalendarTarget: nextTarget,
                            googleCalendarId: nextTarget === 'secondary' ? (settings.googleCalendarId || 'secondary') : 'primary',
                          });
                        }}
                        style={{ fontSize: '0.7rem', color: 'var(--primary)', padding: '0.2rem 0.4rem', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {settings.googleCalendarTarget === 'secondary'
                          ? (language === 'id' ? 'Ganti ke Kalender Utama' : 'Switch to Primary Calendar')
                          : (language === 'id' ? 'Ganti ke Kalender Khusus' : 'Switch to Omnia Calendar')}
                      </button>
                    </div>
                  </div>

                  {/* Sync Options Toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={syncClasses}
                        onChange={(e) => void handleToggleOption('classes', e.target.checked)}
                      />
                      <span>{language === 'id' ? 'Kirim jadwal kuliah rutin (Classes & Sessions)' : 'Push recurring classes & lectures to Google Calendar'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={syncAssignments}
                        onChange={(e) => void handleToggleOption('assignments', e.target.checked)}
                      />
                      <span>{language === 'id' ? 'Kirim tenggat tugas & praktikum (Assignments)' : 'Push assignments & deadlines to Google Calendar'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={syncEvents}
                        onChange={(e) => void handleToggleOption('events', e.target.checked)}
                      />
                      <span>{language === 'id' ? 'Kirim jadwal ujian & kegiatan (Exams & Events)' : 'Push exams & custom events to Google Calendar'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.84rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={importPersonal}
                        onChange={(e) => void handleToggleOption('import', e.target.checked)}
                      />
                      <span>{language === 'id' ? 'Impor acara pribadi dari Google Calendar ke Omnia' : 'Import personal Google Calendar events into Omnia'}</span>
                    </label>
                  </div>

                  {/* Action Buttons & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--outline-variant)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      {settings.googleLastSynced ? (
                        <>
                          {language === 'id' ? 'Terakhir disinkronkan: ' : 'Last synced: '}
                          <strong>{new Date(settings.googleLastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </>
                      ) : (
                        language === 'id' ? 'Belum pernah disinkronkan' : 'Not yet synced'
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={handleDisconnectGoogle}
                        style={{ fontSize: '0.8125rem', color: 'var(--error)' }}
                      >
                        {language === 'id' ? 'Putuskan' : 'Disconnect'}
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
                          ? (language === 'id' ? 'Menyinkronkan…' : 'Syncing…')
                          : (language === 'id' ? 'Sinkronkan Sekarang' : 'Sync Now')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gcalSyncResult && (
                <div role="status" style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontSize: '0.8125rem' }}>
                  ✓ {gcalSyncResult}
                </div>
              )}

              {gcalError && (
                <div role="alert" style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 8, background: 'var(--error-container)', color: 'var(--error)', fontSize: '0.8125rem' }}>
                  ⚠ {gcalError}
                </div>
              )}
            </div>

            {/* Share & Import */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--surface-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem' }}>{language === 'id' ? 'Bagikan & Impor Jadwal' : 'Share & import schedule'}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {language === 'id'
                      ? 'Bagikan salinan jadwal Anda ke teman lewat kode atau impor jadwal mahasiswa lain.'
                      : "Share your schedule snapshot with a classmate via short code or import another student's timetable."}
                  </p>
                </div>
              </div>

              <div style={{
                padding: '1rem',
                borderRadius: 10,
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
                marginBottom: '0.75rem',
              }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {language === 'id' ? 'Bagikan jadwal saya' : 'Share my schedule'}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                  {language === 'id'
                    ? 'Buat kode untuk salinan kelas dan tugas Anda.'
                    : 'Create a code for a snapshot of your classes and assignments.'}
                </p>
                {shareCode ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <output aria-label="Schedule share code" className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.375rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--on-surface)' }}>{shareCode}</output>
                    <button type="button" className="btn-outline min-touch-target" aria-label={isShareCodeCopied ? (language === 'id' ? 'Kode disalin' : 'Code copied') : (language === 'id' ? 'Salin kode' : 'Copy share code')} title="Copy code" onClick={() => void handleCopyShareCode()}>
                      {isShareCodeCopied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-outline" onClick={() => void handleCreateShareCode()} disabled={isCreatingShareCode} style={{ width: '100%', justifyContent: 'center', gap: '0.375rem' }}>
                    <Share2 size={15} aria-hidden="true" />
                    {isCreatingShareCode ? (language === 'id' ? 'Membuat kode…' : 'Generating code…') : (language === 'id' ? 'Buat kode' : 'Generate code')}
                  </button>
                )}
                {isShareCodeCopied && <div role="status" style={{ marginTop: '0.5rem', color: 'var(--primary)', fontSize: '0.75rem' }}>{language === 'id' ? 'Kode disalin.' : 'Code copied.'}</div>}
                {shareCreateError && <div role="alert" style={{ marginTop: '0.5rem', color: 'var(--error)', fontSize: '0.75rem' }}>{shareCreateError}</div>}
              </div>

              <div style={{
                padding: '1rem',
                borderRadius: 10,
                background: 'var(--surface-container-low)',
                border: '1px solid var(--outline-variant)',
              }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem',
                }}>
                  {language === 'id' ? 'Gabung dengan kode' : 'Join with code'}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>
                  {language === 'id'
                    ? 'Masukkan 6 karakter kode untuk melihat kelas dan tugas sebelum menyalinnya ke jadwal Anda.'
                    : 'Enter a 6-character code to preview classes and assignments before copying them into your schedule.'}
                </p>
                <div className="settings-share-code-form">
                  <label htmlFor="import-schedule-code" className="sr-only">Schedule share code</label>
                  <input
                    id="import-schedule-code"
                    value={importCode}
                    onChange={(event) => setImportCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').replace(/[IO]/g, '').slice(0, 6))}
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
                    onClick={() => void handlePreviewShareCode()}
                    disabled={importCode.length !== 6 || isPreviewingShare}
                  >
                    {isPreviewingShare ? (language === 'id' ? 'Memeriksa…' : 'Checking…') : (language === 'id' ? 'Pratinjau' : 'Preview')}
                  </button>
                </div>
                <div id="import-schedule-code-hint" style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>
                  {language === 'id' ? 'Hanya huruf dan angka. Huruf O dan I tidak digunakan.' : 'Letters and numbers only. O and I are not used.'}
                </div>
                {importError && <div role="alert" style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.5rem' }}>{importError}</div>}
              </div>
              {importSuccess && <div role="status" aria-live="polite" style={{ position: 'fixed', right: '1.5rem', bottom: '1.5rem', zIndex: 1000, padding: '0.875rem 1rem', borderRadius: 8, background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: 'var(--shadow-md)' }}>{importSuccess}</div>}
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
                      {language === 'id' ? 'Tersimpan!' : 'Saved!'}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {language === 'id' ? 'Simpan preferensi' : 'Save preferences'}
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
                    {language === 'id' ? 'Batal perubahan' : 'Reset changes'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right column — Account & Data */}
          <div className="settings-column">
            {/* Account */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface)" strokeWidth="2" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h3 style={{ fontSize: '1.125rem' }}>{language === 'id' ? 'Akun' : 'Account'}</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>
                {language === 'id' ? 'Detail profil untuk akun Omnia Anda.' : 'Profile details for your Omnia account.'}
              </p>

              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 0.75rem',
                  background: 'var(--primary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--on-primary-container)',
                  fontSize: '1.75rem', fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                }}>
                  {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : accountInitials}
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{accountName}</div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="account-email-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--on-surface)' }}>
                  {language === 'id' ? 'Email akun' : 'Account email'}
                </label>
                <input id="account-email-input" type="email" value={accountEmail} readOnly style={{ width: '100%', background: 'var(--surface-container)' }} />
              </div>

              {isEditingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label htmlFor="profile-display-name" className="label">{language === 'id' ? 'Nama tampilan' : 'Display name'}</label>
                    <input id="profile-display-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} required style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label htmlFor="profile-avatar-url" className="label">{language === 'id' ? 'URL foto profil' : 'Profile image URL'}</label>
                    <input id="profile-avatar-url" type="url" value={profileAvatarUrl} onChange={(event) => setProfileAvatarUrl(event.target.value)} placeholder="https://example.com/photo.jpg" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label htmlFor="profile-avatar-file" className="label">{language === 'id' ? 'Atau unggah foto' : 'Or upload an image'}</label>
                    <input
                      id="profile-avatar-file"
                      type="file"
                      accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          setProfileError(language === 'id' ? 'Pilih foto berukuran kurang dari 5 MB.' : 'Choose an image smaller than 5 MB.');
                          event.target.value = '';
                          return;
                        }
                        setProfileError('');
                        setProfileAvatarFile(file);
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                      <span>PNG, JPG, WebP, GIF, {language === 'id' ? 'atau' : 'or'} AVIF · {language === 'id' ? 'hingga' : 'up to'} 5 MB{profileAvatarFile ? ` · ${profileAvatarFile.name}` : ''}</span>
                      {profileAvatarFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileAvatarFile(null);
                            const fileInput = document.getElementById('profile-avatar-file') as HTMLInputElement | null;
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
                          {language === 'id' ? 'Batal pilih' : 'Clear'}
                        </button>
                      )}
                    </div>
                  </div>
                  {profileError && <div role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>{profileError}</div>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn-outline" onClick={() => { setIsEditingProfile(false); setProfileError(''); setProfileAvatarFile(null); }}>
                      {language === 'id' ? 'Batal' : 'Cancel'}
                    </button>
                    <button type="button" className="btn-primary" onClick={() => void handleSaveProfile()} disabled={profileSaving}>
                      {profileSaving ? (language === 'id' ? 'Menyimpan…' : 'Saving…') : (language === 'id' ? 'Simpan profil' : 'Save profile')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn-outline" onClick={() => { setIsEditingProfile(true); setProfileSaved(false); }} style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  {language === 'id' ? 'Ubah profil' : 'Edit profile'}
                </button>
              )}
              {profileSaved && <div role="status" style={{ color: 'var(--primary)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{language === 'id' ? 'Profil tersimpan.' : 'Profile saved.'}</div>}

              <button type="button" className="btn-outline" onClick={() => void handlePasswordReset()} disabled={resetSending} style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}>
                {resetSending ? (language === 'id' ? 'Mengirim tautan…' : 'Sending reset link…') : (language === 'id' ? 'Atur ulang kata sandi' : 'Reset password')}
              </button>
              {resetMessage && <div role="status" style={{ color: 'var(--primary)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{resetMessage}</div>}
              {resetError && <div role="alert" style={{ color: 'var(--error)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{resetError}</div>}

              <button
                type="button"
                onClick={() => void signOut().catch((error: unknown) => window.alert(error instanceof Error ? error.message : 'Unable to sign out.'))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.5rem', padding: '0.625rem 1rem',
                  border: '1px solid var(--error-container)',
                  borderRadius: 'var(--radius-sm)', background: 'var(--error-container)',
                  color: 'var(--error)', fontWeight: 600, fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {language === 'id' ? 'Keluar' : 'Sign out'}
              </button>
            </div>

            {/* Data & Export */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface)" strokeWidth="2" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <h3 style={{ fontSize: '1.125rem' }}>{language === 'id' ? 'Data & Ekspor' : 'Data & export'}</h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
                {language === 'id' ? 'Ekspor portabel dan status sinkronisasi.' : 'Portable exports and sync status.'}
              </p>

              <div style={{
                padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1rem',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{language === 'id' ? 'Sinkronisasi cloud aktif' : 'Cloud sync active'}</div>
                  <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    {language === 'id' ? 'Terakhir disinkronkan hari ini' : 'Last synced today'}
                  </div>
                </div>
                <button type="button" className="btn-ghost" style={{ fontSize: '0.75rem' }}>
                  {language === 'id' ? 'Sinkronkan sekarang' : 'Sync now'}
                </button>
              </div>

              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {language === 'id' ? 'Ekspor jadwal perkuliahan' : 'Export current timetable'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleExportICS}
                  title={language === 'id' ? 'Unduh file .ics standar untuk kalender' : 'Download standard .ics file for Apple Calendar or Google Calendar'}
                  style={{ justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M3 10h18M8 2v4M16 2v4" />
                    </svg>
                    iCalendar (.ics file)
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleExportCoursesCSV}
                  title={language === 'id' ? 'Unduh kurikulum sebagai file spreadsheet CSV' : 'Download curriculum timetable as a CSV spreadsheet'}
                  style={{ justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                    Spreadsheet (CSV file)
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title={language === 'id' ? 'Impor jadwal' : 'Import schedule'}>
        {previewData && (
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--on-surface-variant)' }}>
              {language === 'id'
                ? 'Salin item ini ke jadwal Anda? Kelas dan tugas yang diimpor akan berdiri sendiri dari aslinya.'
                : 'Copy these items into your schedule? Imported classes and assignments will be independent of the original.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1, padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 8 }}>
                <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{previewData.classes}</div>
                <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
                  {language === 'id' ? 'kelas' : (previewData.classes === 1 ? 'class' : 'classes')}
                </div>
              </div>
              <div style={{ flex: 1, padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 8 }}>
                <div className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{previewData.assignments}</div>
                <div style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
                  {language === 'id' ? 'tugas' : (previewData.assignments === 1 ? 'assignment' : 'assignments')}
                </div>
              </div>
            </div>
            <div className="modal-actions-sticky">
              <button type="button" className="btn-ghost" onClick={() => setShowImportModal(false)}>
                {language === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn-primary tabular-nums"
                onClick={() => void handleImportShareCode()}
                disabled={isImportingShare}
              >
                {isImportingShare
                  ? (language === 'id' ? 'Menyalin…' : 'Copying…')
                  : (language === 'id' ? 'Salin ke jadwal saya' : 'Copy to my schedule')}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
