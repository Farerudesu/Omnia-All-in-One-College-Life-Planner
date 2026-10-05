import { useState, useEffect } from 'react';
import { Check, Copy, Share2, Globe } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useData } from '../lib/useData';
import { useAuth } from '../lib/AuthContext';
import { getCurrencyFractionDigits, getCurrencySymbol, isSupportedCurrencyCode } from '../lib/currency';
import * as ds from '../lib/dataService';
import type { UserSettings } from '../types';
import type { SharePreview } from '../lib/dataService';
import { getLanguage, setLanguage, translations, type Language } from '../lib/i18n';

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
    if (settings.language) setLangState(settings.language);
  }, [settings.monthlyBudget, settings.currency, settings.theme, settings.termName, settings.semesterStart, settings.semesterEnd, settings.firstDayOfWeek, settings.notifEnabled, settings.language]);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile.';
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
    notifEnabled !== (settings.notifEnabled ?? true);

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
  };

  const handleSave = () => {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!isSupportedCurrencyCode(normalizedCurrency)) {
      setCurrencyError('Enter a valid 3-letter ISO currency code.');
      return;
    }
    setCurrencyError('');
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
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.375rem',
            }}>
              <span className="badge" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                {language === 'id' ? 'Konfigurasi Sistem' : 'System Configuration'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                {language === 'id' ? 'Ruang Kerja & Sinkronisasi Pribadi' : 'Personal Workspace & Sync'}
              </span>
            </div>
            <h1>{t.settings.title}</h1>
            <p className="subtitle">
              {t.settings.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline min-touch-target"
              onClick={handleReset}
              disabled={!hasChanges}
              style={{
                opacity: hasChanges ? 1 : 0.45,
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                gap: '0.375rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {language === 'id' ? 'Batal perubahan' : 'Reset changes'}
            </button>
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
              <label htmlFor="currency-setting" className="label">{language === 'id' ? 'Kode mata uang ISO' : 'ISO currency code'}</label>
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
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                      PNG, JPG, WebP, GIF, {language === 'id' ? 'atau' : 'or'} AVIF · {language === 'id' ? 'hingga' : 'up to'} 5 MB{profileAvatarFile ? ` · ${profileAvatarFile.name}` : ''}
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
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
