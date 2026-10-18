import type { Language } from '@/lib/i18n';

interface AcademicSectionProps {
  language: Language;
  termName: string;
  setTermName: (t: string) => void;
  termStartDate: string;
  setTermStartDate: (d: string) => void;
  termEndDate: string;
  setTermEndDate: (d: string) => void;
  firstDayOfWeek: string;
  setFirstDayOfWeek: (d: string) => void;
  notifEnabled: boolean;
  setNotifEnabled: (e: boolean) => void;
}

export function AcademicSection({
  language,
  termName,
  setTermName,
  termStartDate,
  setTermStartDate,
  termEndDate,
  setTermEndDate,
  firstDayOfWeek,
  setFirstDayOfWeek,
  notifEnabled,
  setNotifEnabled,
}: AcademicSectionProps) {
  const isId = language === 'id';

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1rem' }}>{isId ? 'Semester & Pengingat' : 'Term & reminders'}</h3>
      <div className="settings-terms-grid">
        <div>
          <label htmlFor="term-name" className="label">{isId ? 'Nama semester' : 'Term name'}</label>
          <input
            id="term-name"
            value={termName}
            onChange={(e) => setTermName(e.target.value)}
            placeholder={isId ? 'cth. Semester Ganjil 2026' : 'e.g. Fall 2026'}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="term-start" className="label">{isId ? 'Tanggal mulai' : 'Start date'}</label>
          <input
            id="term-start"
            type="date"
            value={termStartDate}
            onChange={(e) => setTermStartDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="term-end" className="label">{isId ? 'Tanggal selesai' : 'End date'}</label>
          <input
            id="term-end"
            type="date"
            value={termEndDate}
            onChange={(e) => setTermEndDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="first-day" className="label">{isId ? 'Awal minggu' : 'Week starts on'}</label>
          <select
            id="first-day"
            value={firstDayOfWeek}
            onChange={(e) => setFirstDayOfWeek(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="monday">{isId ? 'Senin' : 'Monday'}</option>
            <option value="sunday">{isId ? 'Minggu' : 'Sunday'}</option>
          </select>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
        <input
          type="checkbox"
          checked={notifEnabled}
          onChange={(e) => setNotifEnabled(e.target.checked)}
        />
        {isId ? 'Aktifkan pengingat' : 'Enable reminders'}
      </label>
    </div>
  );
}
