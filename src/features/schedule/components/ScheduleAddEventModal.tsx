import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/lib/useLanguage';
import { useData } from '@/lib/useData';
import * as ds from '@/lib/dataService';
import type { EventType } from '@/types';

export function ScheduleAddEventModal({
  isOpen,
  onClose,
  defaultDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const courses = useData(ds.getCourses);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [type, setType] = useState<EventType>('exam');
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTitleError(null);
      setDate(defaultDate);
      setStartTime('10:00');
      setEndTime('11:00');
      setType('exam');
      setCourseId('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [isOpen, defaultDate]);

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
        courseId: courseId || undefined,
        notes: notes || undefined,
      });
      setTitle('');
      setNotes('');
      setTitleError(null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isId ? 'Tambah kegiatan ke jadwal' : 'Add event to schedule'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="schedule-event-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Judul Kegiatan *' : 'Event Title *'}
          </label>
          <input
            id="schedule-event-title"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) {
                setTitleError(null);
              }
            }}
            placeholder={isId ? 'contoh: Ujian Tengah Semester, Belajar Bersama' : 'e.g. Midterm Exam, Study Session, Project Presentation'}
            style={{
              width: '100%',
              borderColor: titleError ? 'var(--critical, #dc2626)' : undefined,
              boxShadow: titleError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
            }}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'schedule-event-title-error' : undefined}
            required
          />
          {titleError && (
            <div
              id="schedule-event-title-error"
              role="alert"
              style={{
                color: 'var(--critical, #dc2626)',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                fontWeight: 500,
              }}
            >
              {titleError}
            </div>
          )}
        </div>

        <div>
          <div id="schedule-event-category-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Kategori Kegiatan' : 'Event Category'}
          </div>
          <div role="group" aria-labelledby="schedule-event-category-label" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {(['exam', 'deadline', 'personal', 'other'] as EventType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={type === t ? 'chip active' : 'chip'}
                onClick={() => setType(t)}
              >
                {t === 'exam' ? (isId ? 'Ujian' : 'Exam') :
                 t === 'deadline' ? (isId ? 'Tenggat' : 'Deadline') :
                 t === 'personal' ? (isId ? 'Pribadi' : 'Personal') :
                 (isId ? 'Lainnya' : 'Other')}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label htmlFor="schedule-event-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Tanggal *' : 'Date *'}
            </label>
            <input
              id="schedule-event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label htmlFor="schedule-event-course" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Mata Kuliah Terkait' : 'Associated Course'}
            </label>
            <select
              id="schedule-event-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">{isId ? 'Tidak ada / Umum' : 'None / General'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label htmlFor="schedule-event-start-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Waktu Mulai' : 'Start Time'}
            </label>
            <input
              id="schedule-event-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="schedule-event-end-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {isId ? 'Waktu Selesai' : 'End Time'}
            </label>
            <input
              id="schedule-event-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="schedule-event-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {isId ? 'Catatan / Lokasi' : 'Notes / Location'}
          </label>
          <textarea
            id="schedule-event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isId ? 'Ruang kelas, materi ujian, dll.' : 'Room number, materials permitted, etc.'}
            rows={2}
            style={{ width: '100%' }}
          />
        </div>

        <div className="modal-actions-sticky">
          <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
            {isId ? 'Tambah Kegiatan' : 'Add Event'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
