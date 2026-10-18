import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/lib/useLanguage';
import * as ds from '@/lib/dataService';

export function AddClassModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const { showToast } = useToast();
  const [courseName, setCourseName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [instructor, setInstructor] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('#1b4332');
  const [type, setType] = useState<'lecture' | 'lab' | 'tutorial' | 'seminar'>('lecture');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAndAdd, setSaveAndAdd] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = Boolean(
    courseName.trim() || courseCode.trim() || instructor.trim() || days.length > 0 || room.trim()
  );

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setCourseName('');
      setNameError(null);
      setCourseCode('');
      setCodeError(null);
      setInstructor('');
      setDays([]);
      setDaysError(null);
      setStartTime('09:00');
      setEndTime('10:30');
      setRoom('');
      setColor('#1b4332');
      setType('lecture');
      setIsSubmitting(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  const toggleDay = (d: number) => {
    setDays((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      if (next.length > 0 && daysError) {
        setDaysError(null);
      }
      return next;
    });
  };

  const handleSave = async () => {
    let hasError = false;
    if (!courseName.trim()) {
      setNameError(isId ? 'Nama mata kuliah tidak boleh kosong' : 'Class name is required');
      hasError = true;
    }
    if (!courseCode.trim()) {
      setCodeError(isId ? 'Kode mata kuliah tidak boleh kosong' : 'Course code is required');
      hasError = true;
    }
    if (days.length === 0) {
      setDaysError(isId ? 'Pilih minimal satu hari pertemuan' : 'Select at least one day');
      hasError = true;
    }
    if (hasError || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const keepOpen = saveAndAdd;
      const savedName = courseName.trim();
      setSaveAndAdd(false);
      await ds.addClassSession(
        {
          courseId: '',
          daysOfWeek: days,
          startTime,
          endTime,
          room,
          type,
        },
        {
          name: savedName,
          code: courseCode.trim(),
          professor: instructor.trim(),
          room,
          color,
        }
      );
      showToast({
        message: isId
          ? `Mata kuliah "${savedName}" berhasil ditambahkan`
          : `Class "${savedName}" added`,
        type: 'success',
      });
      setCourseName('');
      setNameError(null);
      setCourseCode('');
      setCodeError(null);
      setInstructor('');
      setDays([]);
      setDaysError(null);
      setRoom('');
      setColor('#1b4332');
      if (!keepOpen) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={isId ? 'Tambah mata kuliah' : 'Add class'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="modal-form-grid-2col">
          <div>
            <label
              htmlFor="class-name"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {isId ? 'Nama Mata Kuliah *' : 'Class name *'}
            </label>
            <input
              id="class-name"
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value);
                if (nameError && e.target.value.trim()) setNameError(null);
              }}
              placeholder={isId ? 'Biologi Sel' : 'Biology'}
              style={{
                width: '100%',
                borderColor: nameError ? 'var(--critical, #dc2626)' : undefined,
                boxShadow: nameError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
              }}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'class-name-error' : 'class-name-helper'}
            />
            <div
              id="class-name-helper"
              style={{
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
                marginTop: '0.25rem',
              }}
            >
              {isId
                ? 'Contoh: Biologi Sel, Algoritma Pemrograman'
                : 'e.g. Biology, Data Structures'}
            </div>
            {nameError && (
              <div
                id="class-name-error"
                role="alert"
                style={{
                  color: 'var(--critical, #dc2626)',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  fontWeight: 500,
                }}
              >
                {nameError}
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="class-code"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {isId ? 'Kode MK *' : 'Course code *'}
            </label>
            <input
              id="class-code"
              value={courseCode}
              onChange={(e) => {
                setCourseCode(e.target.value);
                if (codeError && e.target.value.trim()) setCodeError(null);
              }}
              placeholder={isId ? 'BIO110' : 'BIO110'}
              style={{
                width: '100%',
                borderColor: codeError ? 'var(--critical, #dc2626)' : undefined,
                boxShadow: codeError ? '0 0 0 1px var(--critical, #dc2626)' : undefined,
              }}
              aria-invalid={!!codeError}
              aria-describedby={codeError ? 'class-code-error' : 'class-code-helper'}
            />
            <div
              id="class-code-helper"
              style={{
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
                marginTop: '0.25rem',
              }}
            >
              {isId ? 'Contoh: BIO110, IF2110' : 'e.g. BIO110, CS101'}
            </div>
            {codeError && (
              <div
                id="class-code-error"
                role="alert"
                style={{
                  color: 'var(--critical, #dc2626)',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  fontWeight: 500,
                }}
              >
                {codeError}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="class-instructor"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
            }}
          >
            {isId ? 'Dosen Pengampu (opsional)' : 'Instructor (optional)'}
          </label>
          <input
            id="class-instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder={isId ? 'Contoh: Dr. Budi Santoso' : 'e.g. Dr. Jane Smith'}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div
            id="class-days-label"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
            }}
          >
            {isId ? 'Hari Pertemuan *' : 'Days *'}
          </div>
          <div
            role="group"
            aria-labelledby="class-days-label"
            style={{
              display: 'flex',
              gap: '0.375rem',
              flexWrap: 'wrap',
              padding: daysError ? '0.375rem' : 0,
              borderRadius: 8,
              border: daysError ? '1px solid var(--critical, #dc2626)' : '1px solid transparent',
            }}
          >
            {[
              { num: 1, label: isId ? 'Sen' : 'Mon' },
              { num: 2, label: isId ? 'Sel' : 'Tue' },
              { num: 3, label: isId ? 'Rab' : 'Wed' },
              { num: 4, label: isId ? 'Kam' : 'Thu' },
              { num: 5, label: isId ? 'Jum' : 'Fri' },
              { num: 6, label: isId ? 'Sab' : 'Sat' },
              { num: 7, label: isId ? 'Min' : 'Sun' },
            ].map(({ num, label }) => (
              <button
                key={num}
                type="button"
                className={days.includes(num) ? 'chip active' : 'chip'}
                onClick={() => toggleDay(num)}
              >
                {label}
              </button>
            ))}
          </div>
          {daysError && (
            <div
              id="class-days-error"
              role="alert"
              style={{
                color: 'var(--critical, #dc2626)',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                fontWeight: 500,
              }}
            >
              {daysError}
            </div>
          )}
        </div>

        <div className="modal-form-grid-2col">
          <div>
            <label
              htmlFor="class-start-time"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {isId ? 'Jam Mulai *' : 'Start time *'}
            </label>
            <input
              id="class-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label
              htmlFor="class-end-time"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {isId ? 'Jam Selesai *' : 'End time *'}
            </label>
            <input
              id="class-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="class-room"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.375rem',
            }}
          >
            {isId ? 'Ruang Kelas (opsional)' : 'Room (optional)'}
          </label>
          <input
            id="class-room"
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={isId ? 'Ruang B-204' : 'Room B-204'}
            style={{ width: '100%' }}
          />
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--on-surface-variant)',
              marginTop: '0.25rem',
            }}
          >
            {isId ? 'Contoh: Ruang B-204, Lab Riset 2' : 'e.g. Room B-204, Lab 2'}
          </div>
        </div>

        <div className="modal-form-grid-2col" style={{ alignItems: 'flex-start' }}>
          <div>
            <label
              htmlFor="class-color"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {isId ? 'Warna Penanda' : 'Color'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="class-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: 52,
                  height: 38,
                  padding: '0.2rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                {color}
              </span>
            </div>
          </div>
          <div>
            <label
              htmlFor="class-type"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.375rem',
              }}
            >
              {isId ? 'Tipe Kegiatan' : 'Type'}
            </label>
            <select
              id="class-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              style={{ width: '100%', height: 38 }}
            >
              <option value="lecture">{isId ? 'Kuliah' : 'Lecture'}</option>
              <option value="lab">{isId ? 'Praktikum' : 'Lab'}</option>
              <option value="tutorial">{isId ? 'Tutorial' : 'Tutorial'}</option>
              <option value="seminar">{isId ? 'Seminar' : 'Seminar'}</option>
            </select>
          </div>
        </div>

        <div
          className="modal-actions-sticky"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button
              type="button"
              className="btn-outline min-touch-target"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              style={{ flex: 1, minHeight: 44 }}
            >
              {isId ? 'Batal' : 'Discard'}
            </button>
            <button
              type="button"
              className="btn-primary min-touch-target"
              onClick={handleSave}
              disabled={isSubmitting}
              style={{ flex: 2, minHeight: 44, whiteSpace: 'nowrap' }}
            >
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
              {isSubmitting
                ? isId
                  ? 'Menyimpan…'
                  : 'Saving…'
                : isId
                  ? 'Tambah Kelas'
                  : 'Add class'}
            </button>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={async () => {
              setSaveAndAdd(true);
              await handleSave();
            }}
            disabled={isSubmitting}
            style={{
              fontSize: '0.8125rem',
              padding: '0.35rem',
              color: 'var(--primary)',
              textAlign: 'center',
            }}
          >
            {isId ? '+ Simpan & tambah kelas lagi' : '+ Save & add another'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title={isId ? 'Buang Perubahan?' : 'Discard Changes?'}
        message={
          isId
            ? 'Informasi mata kuliah yang kamu masukkan belum disimpan. Yakin ingin membuangnya?'
            : 'You have unsaved changes. Are you sure you want to discard them?'
        }
        confirmText={isId ? 'Buang' : 'Discard'}
        cancelText={isId ? 'Lanjut Edit' : 'Keep Editing'}
        danger
      />
    </Modal>
  );
}
