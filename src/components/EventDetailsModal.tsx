import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import { CategoryIndicator } from './CategoryIndicator';
import { CATEGORY_SHAPES, CATEGORY_COLORS } from '../types';
import type { CalendarEvent, EventType } from '../types';
import { formatTime12, formatDateShort } from '../lib/dateUtils';
import { useLanguage } from '../lib/useLanguage';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const courses = useData(ds.getCourses);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<EventType>('personal');
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setTitleError(null);
      setDate(event.date);
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setType(event.type);
      setCourseId(event.courseId || '');
      setNotes(event.notes || '');
      const existingRem = ds.getUserReminders().find((r) => r.itemId === event.id);
      setReminderMinutes(existingRem ? existingRem.minutesBefore : 0);
      setIsEditing(false);
      setIsSubmitting(false);
    }
  }, [event, isOpen]);

  if (!event) return null;

  const course = courses.find((c) => c.id === (isEditing ? courseId : event.courseId));
  const categoryKey = event.type === 'exam' ? 'exams' : event.type === 'deadline' ? 'deadlines' : 'personal';
  const shape = CATEGORY_SHAPES[categoryKey] || 'circle';
  const color = CATEGORY_COLORS[categoryKey] || 'var(--personal)';

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError(isId ? 'Judul kegiatan tidak boleh kosong' : 'Event title is required');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ds.updateEvent(event.id, {
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        type,
        courseId: courseId || undefined,
        notes: notes || undefined,
      });

      if (reminderMinutes > 0 && date) {
        const eventTimeStr = startTime || '09:00';
        const eventDateTime = new Date(`${date}T${eventTimeStr}`);
        const remindTime = new Date(eventDateTime.getTime() - reminderMinutes * 60 * 1000);
        ds.setUserReminder({
          id: `event-${event.id}`,
          itemId: event.id,
          itemType: 'event',
          title: title.trim(),
          remindAt: remindTime.toISOString(),
          minutesBefore: reminderMinutes,
          link: '/calendar',
        });
      } else {
        ds.deleteUserReminder(event.id);
      }

      setTitleError(null);
      setIsEditing(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    const confirmMsg = isId ? `Yakin ingin menghapus "${event.title}"?` : `Are you sure you want to delete "${event.title}"?`;
    if (window.confirm(confirmMsg)) {
      ds.deleteEvent(event.id);
      ds.deleteUserReminder(event.id);
      onClose();
    }
  };

  const getTypeName = (t: string) => {
    if (!isId) return t;
    switch (t) {
      case 'exam':
        return 'Ujian';
      case 'deadline':
        return 'Tenggat Waktu';
      case 'personal':
        return 'Pribadi / Kegiatan';
      default:
        return 'Lainnya';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? (isId ? 'Edit Kegiatan' : 'Edit Calendar Event') : (isId ? 'Detail Kegiatan' : 'Event Details')}
    >
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="edit-event-title" className="label">
              {isId ? 'Judul Kegiatan *' : 'Event Title *'}
            </label>
            <input
              id="edit-event-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError && e.target.value.trim()) setTitleError(null);
              }}
              placeholder={isId ? 'contoh: Ujian Tengah Semester' : 'e.g. Midterm Exam, Office Hours, Group Meeting'}
              style={{
                width: '100%',
                borderColor: titleError ? 'var(--critical, #dc2626)' : undefined,
                boxShadow: titleError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
              }}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? 'edit-event-title-error' : undefined}
              required
            />
            {titleError && (
              <div
                id="edit-event-title-error"
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

          <div className="modal-form-grid-2col">
            <div>
              <label htmlFor="edit-event-date" className="label">
                {isId ? 'Tanggal *' : 'Date *'}
              </label>
              <input
                id="edit-event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label className="label">{isId ? 'Jenis' : 'Type'}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                style={{ width: '100%' }}
              >
                <option value="exam">{isId ? 'Ujian' : 'Exam'}</option>
                <option value="deadline">{isId ? 'Tenggat Waktu' : 'Deadline'}</option>
                <option value="personal">{isId ? 'Pribadi / Kegiatan' : 'Personal / Event'}</option>
                <option value="other">{isId ? 'Lainnya' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div className="modal-form-grid-2col">
            <div>
              <label className="label">{isId ? 'Waktu Mulai' : 'Start Time'}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="label">{isId ? 'Waktu Selesai' : 'End Time'}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="label">{isId ? 'Ingatkan Saya' : 'Remind me'}</label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value={0}>{isId ? 'Tidak ada pengingat' : 'No reminder'}</option>
              <option value={15}>{isId ? '15 menit sebelumnya' : '15 min before'}</option>
              <option value={60}>{isId ? '1 jam sebelumnya' : '1 hour before'}</option>
              <option value={1440}>{isId ? '1 hari sebelumnya' : '1 day before'}</option>
            </select>
          </div>

          <div>
            <label className="label">{isId ? 'Mata Kuliah Terkait (Opsional)' : 'Associated Course (Optional)'}</label>
            <select
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

          <div>
            <label className="label">{isId ? 'Catatan / Lokasi' : 'Notes / Location'}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isId ? 'Ruang kelas, tautan Zoom, materi yang diperbolehkan, dll.' : 'Room location, zoom link, exam materials permitted, etc.'}
              rows={3}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>
              {isId ? 'Batal' : 'Cancel'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (isId ? 'Menyimpan…' : 'Saving…') : (isId ? 'Simpan Perubahan' : 'Save Changes')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header pill & Type */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CategoryIndicator shape={shape} color={color} size={10} />
              <span
                className="badge"
                style={{
                  background: `color-mix(in srgb, ${color} 15%, transparent)`,
                  color: color,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                }}
              >
                {getTypeName(event.type)}
              </span>
            </div>
            {course && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: `${course.color}15`,
                  color: course.color,
                  padding: '0.2rem 0.5rem',
                  borderRadius: 4,
                }}
              >
                {course.code}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
              {event.title}
            </h2>
            {course && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                {course.name} · {course.professor ? `Prof. ${course.professor}` : (isId ? 'Kalender Akademik' : 'Academic Calendar')}
              </div>
            )}
          </div>

          {/* Date & Time metadata block */}
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 8,
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--on-surface-variant)', width: 80 }}>{isId ? 'Tanggal:' : 'Date:'}</span>
              <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                {formatDateShort(new Date(event.date + 'T00:00:00'))}
              </span>
            </div>
            {event.startTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 80 }}>{isId ? 'Waktu:' : 'Time:'}</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                  {formatTime12(event.startTime)}
                  {event.endTime ? ` – ${formatTime12(event.endTime)}` : ''}
                </span>
              </div>
            )}
            {reminderMinutes > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 80 }}>{isId ? 'Pengingat:' : 'Reminder:'}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {reminderMinutes === 15
                    ? (isId ? '15 menit sebelumnya' : '15 min before')
                    : reminderMinutes === 60
                    ? (isId ? '1 jam sebelumnya' : '1 hour before')
                    : (isId ? '1 hari sebelumnya' : '1 day before')}
                </span>
              </div>
            )}
            {event.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 80, flexShrink: 0 }}>{isId ? 'Catatan:' : 'Notes:'}</span>
                <span style={{ color: 'var(--on-surface)', whiteSpace: 'pre-wrap' }}>{event.notes}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleDelete}
              style={{
                color: 'var(--error)',
                borderColor: 'var(--error-container)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {isId ? 'Hapus' : 'Delete Event'}
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                {isId ? 'Tutup' : 'Close'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {isId ? 'Ubah Kegiatan' : 'Edit Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
