import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import { CheckCircle, Clock } from 'lucide-react';
import type { Assignment, Priority, AssignmentStatus } from '../types';
import { useLanguage } from '../lib/useLanguage';
import { formatDateShort, formatTime12 } from '../lib/dateUtils';

interface AssignmentDetailsModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignmentDetailsModal({ assignment, isOpen, onClose }: AssignmentDetailsModalProps) {
  const lang = useLanguage();
  const courses = useData(ds.getCourses);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<AssignmentStatus>('not-started');
  const [category, setCategory] = useState<string>('classes');
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(0);
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title);
      setDueDate(assignment.dueDate);
      setPriority(assignment.priority);
      setStatus(assignment.status);
      setCategory(assignment.category || 'classes');
      setCourseId(assignment.courseId || '');
      setNotes(assignment.notes || '');
      const existingRem = ds.getUserReminders().find((r) => r.itemId === assignment.id);
      setReminderMinutes(existingRem ? existingRem.minutesBefore : 0);
      setIsEditing(false);
      setTitleError('');
      setIsSubmitting(false);
    }
  }, [assignment, isOpen]);

  if (!assignment) return null;

  const course = courses.find((c) => c.id === (isEditing ? courseId : assignment.courseId));

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(lang === 'id' ? 'Judul tidak boleh kosong' : 'Title is required');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      ds.updateAssignment(assignment.id, {
        title: title.trim(),
        dueDate,
        priority,
        status,
        category: (category as any) || 'other',
        courseId: courseId || undefined,
        notes: notes.trim() || undefined,
      });

      if (reminderMinutes > 0 && dueDate) {
        const remindTime = new Date(new Date(dueDate).getTime() - reminderMinutes * 60 * 1000);
        ds.setUserReminder({
          id: `assignment-${assignment.id}`,
          itemId: assignment.id,
          itemType: 'assignment',
          title: title.trim(),
          remindAt: remindTime.toISOString(),
          minutesBefore: reminderMinutes,
          link: '/assignments',
        });
      } else {
        ds.deleteUserReminder(assignment.id);
      }

      setIsEditing(false);
      setTitleError('');
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      ds.deleteAssignment(assignment.id);
      onClose();
    }
  };

  const handleToggleStatus = () => {
    const nextStatus: AssignmentStatus =
      assignment.status === 'done'
        ? 'not-started'
        : assignment.status === 'not-started'
          ? 'in-progress'
          : 'done';
    ds.updateAssignment(assignment.id, { status: nextStatus });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? (lang === 'id' ? 'Edit tugas' : 'Edit Assignment') : (lang === 'id' ? 'Detail tugas' : 'Deliverable Details')}
    >
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">
              {lang === 'id' ? 'Judul tugas *' : 'Title *'}
            </label>
            <input
              type="text"
              value={title}
              aria-invalid={titleError ? 'true' : 'false'}
              aria-describedby={titleError ? 'edit-assignment-title-error' : undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError && e.target.value.trim()) setTitleError('');
              }}
              placeholder={lang === 'id' ? 'Contoh: Laporan Praktikum Fisika' : 'e.g. Problem Set 4, Research Proposal'}
              style={{
                width: '100%',
                borderColor: titleError ? 'var(--error)' : undefined,
                boxShadow: titleError ? '0 0 0 2px var(--error-container)' : undefined,
              }}
              required
            />
            {titleError && (
              <div id="edit-assignment-title-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
                {titleError}
              </div>
            )}
          </div>

          <div className="modal-form-grid-2col">
            <div>
              <label className="label">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="classes">Coursework</option>
                <option value="personal">Personal</option>
                <option value="exam">Exam Prep</option>
                <option value="deadline">General Deadline</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">{lang === 'id' ? 'Mata Kuliah (Opsional)' : 'Course (Optional)'}</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={category !== 'classes'}
                style={{ width: '100%' }}
              >
                <option value="">{lang === 'id' ? 'Tidak ada' : 'None'}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Due Date & Time *</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>

          <div className="modal-form-grid-2col">
            <div>
              <label className="label">{lang === 'id' ? 'Prioritas' : 'Priority'}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                style={{ width: '100%' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssignmentStatus)}
                style={{ width: '100%' }}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="done">{lang === 'id' ? 'Selesai' : 'Completed'}</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="assignment-reminder" className="label">
              {lang === 'id' ? 'Ingatkan Saya' : 'Remind me'}
            </label>
            <select
              id="assignment-reminder"
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value={0}>{lang === 'id' ? 'Tidak ada pengingat' : 'No reminder'}</option>
              <option value={15}>{lang === 'id' ? '15 menit sebelumnya' : '15 minutes before'}</option>
              <option value={60}>{lang === 'id' ? '1 jam sebelumnya' : '1 hour before'}</option>
              <option value={1440}>{lang === 'id' ? '1 hari sebelumnya' : '1 day before'}</option>
            </select>
          </div>

          <div>
            <label className="label">{lang === 'id' ? 'Catatan & Spesifikasi' : 'Notes & Specifications'}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={lang === 'id' ? 'Petunjuk pengumpulan, format berkas, catatan...' : 'Submission guidelines, file formats, grading rubric notes...'}
              rows={3}
              style={{ width: '100%' }}
            />
          </div>

          <div className="modal-actions-sticky">
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (lang === 'id' ? 'Menyimpan…' : 'Saving…') : (lang === 'id' ? 'Simpan tugas' : 'Save Deliverable')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header pill & Course badge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {course && (
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    background: `${course.color}15`,
                    color: course.color,
                    padding: '0.25rem 0.625rem',
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{course.code}</span>
                  <span>{course.name}</span>
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                className="badge"
                style={{
                  background:
                    assignment.priority === 'high'
                      ? 'var(--error-container)'
                      : assignment.priority === 'medium'
                        ? 'var(--tertiary-container)'
                        : 'var(--surface-container-high)',
                  color:
                    assignment.priority === 'high'
                      ? 'var(--on-error-container)'
                      : assignment.priority === 'medium'
                        ? 'var(--on-tertiary-container)'
                        : 'var(--on-surface-variant)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                }}
              >
                {assignment.priority === 'high' ? (lang === 'id' ? 'Prioritas Tinggi' : 'High Priority')
                  : assignment.priority === 'medium' ? (lang === 'id' ? 'Prioritas Sedang' : 'Medium Priority')
                  : (lang === 'id' ? 'Prioritas Rendah' : 'Low Priority')}
              </span>
              <button
                onClick={handleToggleStatus}
                className="badge min-touch-target"
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background:
                    assignment.status === 'done'
                      ? 'var(--primary-container)'
                      : assignment.status === 'in-progress'
                        ? '#e0f2fe'
                        : 'var(--surface-container-high)',
                  color:
                    assignment.status === 'done'
                      ? 'var(--on-primary-container)'
                      : assignment.status === 'in-progress'
                        ? '#0369a1'
                        : 'var(--on-surface-variant)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.625rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {assignment.status === 'done' ? (
                    <><CheckCircle size={14} /> {lang === 'id' ? 'Selesai' : 'Completed'}</>
                  ) : assignment.status === 'in-progress' ? (
                    <><Clock size={14} /> {lang === 'id' ? 'Sedang Dikerjakan' : 'In Progress'}</>
                  ) : (
                    <span>{lang === 'id' ? 'Belum Dimulai' : 'Not Started'}</span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
              {assignment.title}
            </h2>
          </div>

          {/* Metadata Block */}
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
              <span style={{ color: 'var(--on-surface-variant)', width: 100 }}>{lang === 'id' ? 'Tenggat Waktu:' : 'Due Date:'}</span>
              <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                {formatDateShort(new Date(assignment.dueDate))} {assignment.dueDate.includes('T') ? `· ${formatTime12(assignment.dueDate.split('T')[1])}` : ''}
              </span>
            </div>
            {course?.professor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 100 }}>{lang === 'id' ? 'Dosen Pengampu:' : 'Instructor:'}</span>
                <span style={{ color: 'var(--on-surface)' }}>{course.professor}</span>
              </div>
            )}
            {reminderMinutes > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 100 }}>{lang === 'id' ? 'Pengingat:' : 'Reminder:'}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {reminderMinutes === 15 ? (lang === 'id' ? '15 menit sebelumnya' : '15 min before') : reminderMinutes === 60 ? (lang === 'id' ? '1 jam sebelumnya' : '1 hour before') : (lang === 'id' ? '1 hari sebelumnya' : '1 day before')}
                </span>
              </div>
            )}
            {assignment.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 100, flexShrink: 0 }}>{lang === 'id' ? 'Catatan:' : 'Notes:'}</span>
                <span style={{ color: 'var(--on-surface)', whiteSpace: 'pre-wrap' }}>{assignment.notes}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions-sticky" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
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
              {lang === 'id' ? 'Hapus' : 'Delete'}
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                {lang === 'id' ? 'Tutup' : 'Close'}
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
                {lang === 'id' ? 'Ubah' : 'Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
