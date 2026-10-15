import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import type { Priority, AssignmentStatus } from '../types';
import { useLanguage } from '../lib/useLanguage';
import { getTodayDateString, getUserTimezone } from '../lib/dateUtils';

export interface AddAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAssignmentModal({ isOpen, onClose }: AddAssignmentModalProps) {
  const lang = useLanguage();
  const settings = useData(ds.getSettings);
  const courses = useData(ds.getCourses);
  const uniqueCourses = courses.filter((course, index, list) => list.findIndex((item) => `${item.code}|${item.name}` === `${course.code}|${course.name}`) === index);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('classes');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState(() => getTodayDateString(settings.timeZone || getUserTimezone()));
  const [dueTime, setDueTime] = useState('23:59');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<AssignmentStatus>('not-started');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Sync default courseId when category is 'classes'
  useEffect(() => {
    if (category === 'classes' && !courseId && uniqueCourses.length > 0) {
      setCourseId(uniqueCourses[0].id);
    }
  }, [category, courseId, uniqueCourses]);

  // Sync default date with user timezone when modal opens
  useEffect(() => {
    if (isOpen) {
      setDueDate(getTodayDateString(settings.timeZone || getUserTimezone()));
    }
  }, [isOpen, settings.timeZone]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setTitleError('');
    setIsSubmitting(false);
    setShowDiscardConfirm(false);
  };

  const handleRequestClose = () => {
    if (title.trim() || notes.trim()) {
      setShowDiscardConfirm(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError(lang === 'id' ? 'Judul tidak boleh kosong' : 'Title is required');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalDueDate = dueDate || getTodayDateString(settings.timeZone || getUserTimezone());
      await ds.addAssignment({
        courseId: courseId || undefined,
        category: (category as any) || 'other',
        title: title.trim(),
        dueDate: `${finalDueDate}T${dueTime || '23:59'}`,
        priority,
        status,
        notes: notes.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleRequestClose} title={lang === 'id' ? 'Tambah tugas' : 'Add assignment'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="assignment-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Judul tugas *' : 'Title *'}
          </label>
          <input
            id="assignment-title"
            autoFocus
            data-autofocus
            value={title}
            aria-invalid={titleError ? 'true' : 'false'}
            aria-describedby={titleError ? 'assignment-title-error' : undefined}
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
            <div id="assignment-title-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
              {titleError}
            </div>
          )}
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label htmlFor="assignment-category" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Kategori' : 'Category'}
            </label>
            <select id="assignment-category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
              <option value="classes">{lang === 'id' ? 'Tugas Kuliah' : 'Coursework'}</option>
              <option value="personal">{lang === 'id' ? 'Pribadi' : 'Personal'}</option>
              <option value="exam">{lang === 'id' ? 'Persiapan Ujian' : 'Exam Prep'}</option>
              <option value="deadline">{lang === 'id' ? 'Tenggat Umum' : 'General Deadline'}</option>
              <option value="other">{lang === 'id' ? 'Lainnya' : 'Other'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="assignment-course" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Mata Kuliah (Opsional)' : 'Course (Optional)'}
            </label>
            <select
              id="assignment-course"
              value={courseId}
              onChange={(e) => {
                const val = e.target.value;
                setCourseId(val);
                if (val && (category === 'personal' || category === 'other')) {
                  setCategory('classes');
                }
              }}
              style={{ width: '100%' }}
            >
              <option value="">{lang === 'id' ? 'Tidak ada' : 'None'}</option>
              {uniqueCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.code ? `${c.code} ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label htmlFor="assignment-due-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Tanggal tenggat' : 'Due date'}
            </label>
            <input id="assignment-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="assignment-due-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Jam tenggat' : 'Due time'}
            </label>
            <input id="assignment-due-time" className="tabular-nums" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label htmlFor="assignment-priority" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Prioritas' : 'Priority'}
            </label>
            <select id="assignment-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={{ width: '100%' }}>
              <option value="low">{lang === 'id' ? 'Rendah' : 'Low'}</option>
              <option value="medium">{lang === 'id' ? 'Sedang' : 'Medium'}</option>
              <option value="high">{lang === 'id' ? 'Tinggi' : 'High'}</option>
            </select>
          </div>
          <div>
            <label htmlFor="assignment-status" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Status
            </label>
            <select id="assignment-status" value={status} onChange={(e) => setStatus(e.target.value as AssignmentStatus)} style={{ width: '100%' }}>
              <option value="not-started">{lang === 'id' ? 'Belum Dimulai' : 'Not Started'}</option>
              <option value="in-progress">{lang === 'id' ? 'Sedang Dikerjakan' : 'In Progress'}</option>
              <option value="done">{lang === 'id' ? 'Selesai' : 'Completed'}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="assignment-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Catatan & Spesifikasi' : 'Notes & Specifications'}
          </label>
          <textarea
            id="assignment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === 'id' ? 'Petunjuk pengumpulan, tautan lampiran, catatan...' : 'Submission guidelines, attachment links, grading notes...'}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <div className="modal-actions-sticky">
          <button type="button" className="btn-outline min-touch-target" onClick={handleRequestClose} disabled={isSubmitting}>
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary min-touch-target" onClick={handleSave} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? (lang === 'id' ? 'Menyimpan…' : 'Saving…') : (lang === 'id' ? 'Simpan tugas' : 'Save')}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title={lang === 'id' ? 'Buang perubahan?' : 'Discard changes?'}
        message={lang === 'id' ? 'Perubahan yang kamu buat belum disimpan dan akan hilang jika ditutup.' : 'You have unsaved changes that will be lost if you close now.'}
        confirmText={lang === 'id' ? 'Buang' : 'Discard'}
        cancelText={lang === 'id' ? 'Lanjut mengedit' : 'Keep editing'}
        variant="danger"
      />
    </Modal>
  );
}
