import { useState, useEffect } from 'react';
import { useData } from '@/lib/useData';
import { useAuth } from '@/lib/AuthContext';
import { isSupportedCurrencyCode } from '@/lib/currency';
import * as ds from '@/lib/dataService';
import type { UserSettings } from '@/types';
import { getLanguage, setLanguage, translations, type Language } from '@/lib/i18n';
import { getUserTimezone } from '@/lib/dateUtils';

import { useProfileSettings } from './hooks/useProfileSettings';
import { useShareSchedule } from './hooks/useShareSchedule';
import { useGoogleCalendarSync } from './hooks/useGoogleCalendarSync';

import { LanguageSection } from './components/LanguageSection';
import { AppearanceSection } from './components/AppearanceSection';
import { BudgetSection } from './components/BudgetSection';
import { AcademicSection } from './components/AcademicSection';
import { GoogleCalendarSection } from './components/GoogleCalendarSection';
import { ShareImportSection } from './components/ShareImportSection';
import { AccountSection } from './components/AccountSection';
import { DataExportSection } from './components/DataExportSection';
import { ImportScheduleModal } from './components/ImportScheduleModal';

export function SettingsPage() {
  const { user, signOut, requestPasswordReset } = useAuth();
  const settings = useData(ds.getSettings);
  const courses = useData(ds.getCourses);
  const profile = useData(ds.getProfile);
  const metadataName =
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const accountName =
    profile?.fullName.trim() || metadataName || user?.email?.split('@')[0] || 'Omnia account';
  const accountEmail = profile?.universityEmail || user?.email || '';
  const accountInitials = accountName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [language, setLangState] = useState<Language>(getLanguage());
  const [monthlyBudget, setMonthlyBudget] = useState(String(settings.monthlyBudget));
  const [currency, setCurrency] = useState(settings.currency);
  const [currencyError, setCurrencyError] = useState('');
  const [timeZone, setTimeZone] = useState(settings.timeZone || getUserTimezone());
  const [initialBalance, setInitialBalance] = useState(
    settings.initialBalance !== undefined ? String(settings.initialBalance) : ''
  );
  const [theme, setTheme] = useState(settings.theme);
  const [termName, setTermName] = useState(settings.termName || '');
  const [termStartDate, setTermStartDate] = useState(settings.semesterStart);
  const [termEndDate, setTermEndDate] = useState(settings.semesterEnd);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(settings.firstDayOfWeek || 'monday');
  const [notifEnabled, setNotifEnabled] = useState(settings.notifEnabled ?? true);
  const [saved, setSaved] = useState(false);

  // Payment Methods State
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>(ds.getPaymentMethods());
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Sub-hooks
  const profileState = useProfileSettings({
    user,
    profile,
    metadataName,
    accountEmail,
    requestPasswordReset,
  });

  const shareState = useShareSchedule();

  const gcalState = useGoogleCalendarSync(settings, language);

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
  }, [
    settings.monthlyBudget,
    settings.currency,
    settings.theme,
    settings.termName,
    settings.semesterStart,
    settings.semesterEnd,
    settings.firstDayOfWeek,
    settings.notifEnabled,
    settings.language,
    settings.timeZone,
    settings.initialBalance,
  ]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

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
    initialBalance.trim() !==
      (settings.initialBalance !== undefined ? String(settings.initialBalance) : '');

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
      ...courses.map((c, idx) =>
        [
          'BEGIN:VEVENT',
          `UID:omnia-course-${c.id}-${idx}@academic.local`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `SUMMARY:${c.code} - ${c.name}`,
          `DESCRIPTION:Professor: ${c.professor || 'TBA'} | Credits: ${c.credits}`,
          `LOCATION:${c.room || 'Campus'}`,
          'END:VEVENT',
        ].join('\r\n')
      ),
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

  const t = translations[language];

  return (
    <div className="settings-page-container">
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{t.settings.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasChanges && (
              <button
                type="button"
                className="btn-outline min-touch-target"
                onClick={handleReset}
                style={{ gap: '0.375rem' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                {language === 'id' ? 'Batal perubahan' : 'Reset changes'}
              </button>
            )}
            <button
              type="button"
              className="btn-primary min-touch-target"
              onClick={handleSave}
              style={{ minWidth: 140, justifyContent: 'center' }}
            >
              {saved ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {language === 'id' ? 'Tersimpan!' : 'Saved!'}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
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
            <LanguageSection language={language} setLangState={setLangState} />
            <AppearanceSection language={language} theme={theme} setTheme={setTheme} />
            <BudgetSection
              language={language}
              currency={currency}
              setCurrency={setCurrency}
              currencyError={currencyError}
              setCurrencyError={setCurrencyError}
              monthlyBudget={monthlyBudget}
              setMonthlyBudget={setMonthlyBudget}
              initialBalance={initialBalance}
              setInitialBalance={setInitialBalance}
              timeZone={timeZone}
              setTimeZone={setTimeZone}
              paymentMethodsList={paymentMethodsList}
              newPaymentMethod={newPaymentMethod}
              setNewPaymentMethod={setNewPaymentMethod}
              handleAddPaymentMethod={handleAddPaymentMethod}
              handleDeletePaymentMethod={handleDeletePaymentMethod}
            />
            <AcademicSection
              language={language}
              termName={termName}
              setTermName={setTermName}
              termStartDate={termStartDate}
              setTermStartDate={setTermStartDate}
              termEndDate={termEndDate}
              setTermEndDate={setTermEndDate}
              firstDayOfWeek={firstDayOfWeek}
              setFirstDayOfWeek={setFirstDayOfWeek}
              notifEnabled={notifEnabled}
              setNotifEnabled={setNotifEnabled}
            />
            <GoogleCalendarSection
              language={language}
              settings={settings}
              isGcalConnected={gcalState.isGcalConnected}
              isGcalConnecting={gcalState.isGcalConnecting}
              isGcalSyncing={gcalState.isGcalSyncing}
              gcalEmail={gcalState.gcalEmail}
              gcalSyncResult={gcalState.gcalSyncResult}
              gcalError={gcalState.gcalError}
              syncClasses={gcalState.syncClasses}
              syncAssignments={gcalState.syncAssignments}
              syncEvents={gcalState.syncEvents}
              importPersonal={gcalState.importPersonal}
              handleConnectGoogle={gcalState.handleConnectGoogle}
              handleDisconnectGoogle={gcalState.handleDisconnectGoogle}
              handleSyncNow={gcalState.handleSyncNow}
              handleToggleOption={gcalState.handleToggleOption}
            />
            <ShareImportSection
              language={language}
              shareCode={shareState.shareCode}
              isCreatingShareCode={shareState.isCreatingShareCode}
              isShareCodeCopied={shareState.isShareCodeCopied}
              shareCreateError={shareState.shareCreateError}
              importCode={shareState.importCode}
              setImportCode={shareState.setImportCode}
              isPreviewingShare={shareState.isPreviewingShare}
              importError={shareState.importError}
              importSuccess={shareState.importSuccess}
              handleCreateShareCode={shareState.handleCreateShareCode}
              handleCopyShareCode={shareState.handleCopyShareCode}
              handlePreviewShareCode={shareState.handlePreviewShareCode}
              hasChanges={hasChanges}
              handleSave={handleSave}
              handleReset={handleReset}
              saved={saved}
            />
          </div>

          {/* Right column — Account & Data */}
          <div className="settings-column">
            <AccountSection
              language={language}
              profile={profile}
              accountName={accountName}
              accountEmail={accountEmail}
              accountInitials={accountInitials}
              isEditingProfile={profileState.isEditingProfile}
              setIsEditingProfile={profileState.setIsEditingProfile}
              profileName={profileState.profileName}
              setProfileName={profileState.setProfileName}
              profileAvatarUrl={profileState.profileAvatarUrl}
              setProfileAvatarUrl={profileState.setProfileAvatarUrl}
              profileAvatarFile={profileState.profileAvatarFile}
              setProfileAvatarFile={profileState.setProfileAvatarFile}
              profileSaving={profileState.profileSaving}
              profileError={profileState.profileError}
              setProfileError={profileState.setProfileError}
              profileSaved={profileState.profileSaved}
              setProfileSaved={profileState.setProfileSaved}
              handleSaveProfile={profileState.handleSaveProfile}
              handlePasswordReset={profileState.handlePasswordReset}
              resetSending={profileState.resetSending}
              resetMessage={profileState.resetMessage}
              resetError={profileState.resetError}
              signOut={signOut}
            />
            <DataExportSection
              language={language}
              handleExportICS={handleExportICS}
              handleExportCoursesCSV={handleExportCoursesCSV}
            />
          </div>
        </div>
      </div>

      <ImportScheduleModal
        isOpen={shareState.showImportModal}
        onClose={() => shareState.setShowImportModal(false)}
        language={language}
        previewData={shareState.previewData}
        handleImportShareCode={shareState.handleImportShareCode}
        isImportingShare={shareState.isImportingShare}
      />
    </div>
  );
}

export default SettingsPage;
