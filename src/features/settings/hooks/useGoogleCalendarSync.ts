import { useState, useEffect } from 'react';
import type { Language } from '@/lib/i18n';
import type { UserSettings } from '@/types';
import * as gcal from '@/lib/googleCalendarService';
import * as ds from '@/lib/dataService';

export function useGoogleCalendarSync(settings: UserSettings, language: Language) {
  const [isGcalConnected, setIsGcalConnected] = useState(() => gcal.isGoogleCalendarConnected());
  const [gcalEmail, setGcalEmail] = useState(
    () => gcal.getConnectedGoogleEmail() || settings.googleAccountEmail || ''
  );
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
      setIsGcalSyncing(true);
      const syncRes = await gcal.syncTwoWay();
      setGcalSyncResult(
        language === 'id'
          ? `Tersinkronisasi! ${syncRes.classesCount} kuliah, ${syncRes.assignmentsCount} tugas, ${syncRes.eventsCount} kegiatan terkirim ke Google Calendar. ${syncRes.pulledCount} acara diterima.`
          : `Connected & synced! ${syncRes.classesCount} classes, ${syncRes.assignmentsCount} tasks, ${syncRes.eventsCount} events pushed. ${syncRes.pulledCount} events imported.`
      );
    } catch (err: unknown) {
      console.error('Google Calendar connect error:', err);
      const message =
        err instanceof Error
          ? err.message
          : language === 'id'
            ? 'Gagal menghubungkan Google Calendar.'
            : 'Failed to connect to Google Calendar.';
      setGcalError(message);
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error('Google Calendar sync error:', err);
      const message =
        err instanceof Error
          ? err.message
          : language === 'id'
            ? 'Gagal menyinkronkan data.'
            : 'Failed to sync data with Google Calendar.';
      setGcalError(message);
    } finally {
      setIsGcalSyncing(false);
    }
  };

  const handleToggleOption = async (
    key: 'classes' | 'assignments' | 'events' | 'import',
    value: boolean
  ) => {
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

  return {
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
  };
}
