import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/lib/useLanguage';
import { useData } from '@/lib/useData';
import * as ds from '@/lib/dataService';
import type { EventType } from '@/types';

interface CalendarAddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
}

export function CalendarAddEventModal({
  isOpen,
  onClose,
  defaultDate,
}: CalendarAddEventModalProps) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const courses = useData(ds.getCourses);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<EventType>('personal');
  const [courseId, setCourseId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setTitleError('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError(isId ? 'Judul kegiatan tidak boleh kosong' : 'Event title is required');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await ds.addEvent({
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type,
        location: location.trim() || undefined,
        courseId: courseId || undefined,
        notes: notes.trim() || undefined,
      });
      setTitle('');
      setLocation('');
      setNotes('');
      setTitleError('');
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isId ? 'Tambah acara' : 'Add event'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="event-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Judul acara *' : 'Event Title *'}
          </label>
          <input
            id="event-title"
            autoFocus
            data-autofocus
            value={title}
            aria-invalid={titleError ? 'true' : 'false'}
            aria-describedby={titleError ? 'event-title-error' : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) setTitleError('');
            }}
            placeholder={isId ? 'Contoh: Ujian Tengah Semester, Praktikum SBD, Rapat' : 'e.g. Midterm Exam, Database Lab, Meeting'}
            style={{
              width: '100%',
              borderColor: titleError ? 'var(--error)' : undefined,
              boxShadow: titleError ? '0 0 0 2px var(--error-container)' : undefined,
            }}
            required
          />
          {titleError && (
            <div id="event-title-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
              {titleError}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Kategori acara' : 'Event Category'}
          </label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(['class', 'exam', 'deadline', 'personal', 'lab', 'other'] as EventType[]).map((t) => {
              const chipLabel = isId
                ? (t === 'class' ? 'Kelas' : t === 'exam' ? 'Ujian' : t === 'deadline' ? 'Tenggat' : t === 'personal' ? 'Pribadi' : t === 'lab' ? 'Praktikum' : 'Lainnya')
                : (t.charAt(0).toUpperCase() + t.slice(1));
              return (
                <button
                  key={t}
                  type="button"
                  className={type === t ? 'chip active' : 'chip'}
                  onClick={() => setType(t)}
                >
                  {chipLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="event-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Tanggal *' : 'Date *'}
          </label>
          <input
            id="event-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%' }}
            required
          />
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label htmlFor="event-start-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Waktu Mulai' : 'Start Time'}
            </label>
            <input
              id="event-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="event-end-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Waktu Selesai' : 'End Time'}
            </label>
            <input
              id="event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="event-location" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Lokasi / Ruangan' : 'Location / Room'}
          </label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={isId ? 'contoh: D303, Lab Jarkom, Ruang Seminar' : 'e.g. Room D303, Lab 2, Hall B'}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label htmlFor="event-course" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Mata Kuliah Terkait (Opsional)' : 'Associated Course (Optional)'}
          </label>
          <select id="event-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: '100%' }}>
            <option value="">{isId ? 'Tidak Ada / Umum' : 'None / General'}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="event-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Catatan' : 'Notes'}
          </label>
          <textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isId ? 'Materi persiapan, perlengkapan yang dibawa, catatan…' : 'Preparation materials, notes…'}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div className="modal-actions-sticky">
          <button type="button" className="btn-outline" onClick={handleClose} disabled={isSubmitting}>
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? (isId ? 'Menyimpan…' : 'Saving…') : (isId ? 'Simpan' : 'Save Event')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
