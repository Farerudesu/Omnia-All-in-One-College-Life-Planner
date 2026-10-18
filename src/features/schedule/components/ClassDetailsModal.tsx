import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { useLanguage } from '@/lib/useLanguage';
import { formatTime12, toDateString, formatDateLong, parseTime } from '@/lib/dateUtils';
import type { ClassSession, Course, SessionException, ExceptionType } from '@/types';
import * as ds from '@/lib/dataService';
import { ClassPermanentForm } from './ClassPermanentForm';
import { ClassSingleDayForm } from './ClassSingleDayForm';

interface ClassDetailsModalProps {
  session: ClassSession;
  course: Course;
  date: Date;
  exception?: SessionException;
  onClose: () => void;
}

export function ClassDetailsModal({
  session,
  course,
  date,
  exception,
  onClose,
}: ClassDetailsModalProps) {
  const lang = useLanguage();
  const isId = lang === 'id';
  const { showToast } = useToast();
  const [scope, setScope] = useState<'this-day' | 'all-future'>('this-day');
  const [excType, setExcType] = useState<ExceptionType | ''>(exception?.type || '');
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (exception?.isOnline !== undefined) return exception.isOnline;
    if (exception?.type === 'online' || exception?.types?.includes('online')) return true;
    const r = (exception?.newRoom || session.room || course.room || '').toLowerCase();
    return r.includes('online') || r.includes('zoom') || r.includes('meet') || r.includes('teams');
  });
  const [newStartTime, setNewStartTime] = useState(exception?.newStartTime || session.startTime);
  const [newEndTime, setNewEndTime] = useState(exception?.newEndTime || session.endTime);
  const [newRoom, setNewRoom] = useState(exception?.newRoom || session.room || course.room || '');
  const [instructor, setInstructor] = useState(course.professor || '');
  const [note, setNote] = useState(exception?.note || '');
  const [courseName, setCourseName] = useState(course.name);
  const [showDeleteCourse, setShowDeleteCourse] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  const startTime = exception?.newStartTime || session.startTime;
  const endTime = exception?.newEndTime || session.endTime;
  const room = exception?.newRoom || session.room || course.room || 'TBA';
  const dateStr = formatDateLong(date);

  const handleSave = async () => {
    if (scope === 'all-future' || excType === 'moved' || excType === 'extra') {
      const { hours: sh, minutes: sm } = parseTime(newStartTime);
      const { hours: eh, minutes: em } = parseTime(newEndTime);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      if (endMins <= startMins) {
        setTimeError(
          isId
            ? 'Jam selesai harus lebih akhir daripada jam mulai'
            : 'End time must be after start time'
        );
        return;
      }
    }

    if (courseName.trim() && courseName.trim() !== course.name) {
      await ds.updateCourse(course.id, { name: courseName.trim() });
    }

    if (scope === 'all-future') {
      const sessionUpdates: Partial<ClassSession> = {
        room: newRoom.trim() || undefined,
        startTime: newStartTime,
        endTime: newEndTime,
      };
      await ds.updateClassSession(session.id, sessionUpdates);

      await ds.updateCourse(course.id, {
        professor: instructor.trim() || undefined,
        room: newRoom.trim() || undefined,
      });
    } else {
      const activeTypes: ExceptionType[] = [];
      if (excType && excType !== 'online') activeTypes.push(excType);
      if (isOnline) activeTypes.push('online');
      if (
        activeTypes.length === 0 &&
        (newStartTime !== session.startTime || newEndTime !== session.endTime)
      ) {
        activeTypes.push('moved');
      }

      const primaryType = activeTypes[0] || (isOnline ? 'online' : excType || 'room-changed');
      await ds.addSessionException({
        classSessionId: session.id,
        date: toDateString(date),
        type: primaryType,
        types: activeTypes,
        isOnline,
        newStartTime:
          activeTypes.includes('moved') || newStartTime !== session.startTime
            ? newStartTime
            : undefined,
        newEndTime:
          activeTypes.includes('moved') || newEndTime !== session.endTime ? newEndTime : undefined,
        newRoom:
          activeTypes.includes('room-changed') || newRoom.trim() !== session.room
            ? newRoom.trim()
            : undefined,
        note: note.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isId ? 'Ubah kelas' : 'Edit class'}
      maxWidth="560px"
    >
      {/* Occurrence info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'var(--surface-container)',
          borderRadius: 8,
          marginBottom: '1rem',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 10h18M8 2v4M16 2v4" />
          </svg>
          <span
            style={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {isId ? 'Pertemuan:' : 'Occurrence:'}
          </span>
        </div>
        <span className="tabular-nums" style={{ fontWeight: 600 }}>
          {dateStr}
        </span>
      </div>

      {/* Mata kuliah */}
      <div
        style={{
          marginBottom: '1.25rem',
          padding: '0.875rem',
          border: '1px solid var(--outline-variant)',
          borderRadius: 10,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
          {isId ? 'Mata kuliah' : 'Course'}
        </div>
        <label className="label" htmlFor="course-name">
          {isId ? 'Nama mata kuliah' : 'Course name'}
        </label>
        <input
          id="course-name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          style={{ width: '100%' }}
        />
        <div
          style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}
        >
          {isId
            ? 'Berlaku untuk SEMUA sesi mata kuliah ini.'
            : 'Applies to ALL sessions of this course.'}
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setShowDeleteCourse(true)}
          style={{ marginTop: '0.75rem', color: 'var(--error)' }}
        >
          {isId ? 'Hapus mata kuliah' : 'Delete course'}
        </button>
      </div>

      {/* Scope choice */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.6875rem',
              letterSpacing: '0.05em',
              color: 'var(--on-surface-variant)',
            }}
          >
            {isId ? 'Cakupan perubahan' : 'Scope choice'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
            {scope === 'all-future'
              ? isId
                ? 'Ubah permanen dosen & ruangan'
                : 'Permanently edit instructor & room'
              : isId
                ? 'Hanya untuk hari ini'
                : 'Single day exception'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            className={scope === 'this-day' ? 'chip active' : 'chip'}
            onClick={() => setScope('this-day')}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {isId ? 'Pengecualian hari ini' : 'This day only'}
          </button>
          <button
            type="button"
            className={scope === 'all-future' ? 'chip active' : 'chip'}
            onClick={() => setScope('all-future')}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {isId ? 'Permanen (semua minggu)' : 'All future weeks'}
          </button>
        </div>
      </div>

      {/* Course info preview */}
      <div
        style={{
          marginBottom: '1rem',
          paddingBottom: '0.875rem',
          borderBottom: '1px solid var(--outline-variant)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h4 style={{ margin: 0, flex: 1 }}>
            {course.code} {course.name}
          </h4>
          <span
            style={{
              background: `color-mix(in srgb, ${course.color || 'var(--primary)'} 15%, transparent)`,
              color: course.color || 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.6875rem',
              padding: '0.125rem 0.375rem',
              borderRadius: 4,
            }}
          >
            {course.code}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '0.625rem',
            paddingTop: '0.625rem',
            borderTop: '1px solid var(--outline-variant)',
            fontSize: '0.8125rem',
            color: 'var(--on-surface-variant)',
            flexWrap: 'wrap',
          }}
        >
          <div
            className="tabular-nums"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {formatTime12(startTime)}–{formatTime12(endTime)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{room}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>
              {instructor || course.professor || (isId ? 'Dosen belum diisi' : 'Instructor TBA')}
            </span>
          </div>
        </div>
      </div>

      {scope === 'all-future' && (
        <ClassPermanentForm
          isId={isId}
          instructor={instructor}
          setInstructor={setInstructor}
          newRoom={newRoom}
          setNewRoom={setNewRoom}
          newStartTime={newStartTime}
          setNewStartTime={setNewStartTime}
          newEndTime={newEndTime}
          setNewEndTime={setNewEndTime}
          setTimeError={setTimeError}
        />
      )}

      {scope === 'this-day' && (
        <ClassSingleDayForm
          isId={isId}
          date={date}
          dateStr={dateStr}
          instructor={instructor}
          setInstructor={setInstructor}
          excType={excType}
          setExcType={setExcType}
          isOnline={isOnline}
          setIsOnline={setIsOnline}
          newStartTime={newStartTime}
          setNewStartTime={setNewStartTime}
          newEndTime={newEndTime}
          setNewEndTime={setNewEndTime}
          setTimeError={setTimeError}
          newRoom={newRoom}
          setNewRoom={setNewRoom}
          note={note}
          setNote={setNote}
        />
      )}

      {timeError && (
        <div
          style={{
            padding: '0.625rem 0.875rem',
            background: 'color-mix(in srgb, var(--error) 12%, var(--surface-container-lowest))',
            color: 'var(--error)',
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {timeError}
        </div>
      )}

      <div
        className="modal-actions-sticky"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          gap: '0.5rem',
        }}
      >
        <button
          type="button"
          className="btn-outline min-touch-target"
          onClick={() => setShowDeleteCourse(true)}
          style={{
            color: 'var(--critical, #dc2626)',
            borderColor: 'var(--outline-variant)',
            background: 'transparent',
            fontSize: '0.8125rem',
            padding: '0.4rem 0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            style={{ marginRight: '0.25rem' }}
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          {isId ? 'Hapus' : 'Delete'}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn-outline min-touch-target" onClick={onClose}>
            {isId ? 'Batal' : 'Discard'}
          </button>
          <button type="button" className="btn-primary min-touch-target" onClick={handleSave}>
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
            {isId ? 'Simpan' : 'Save'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteCourse}
        onClose={() => setShowDeleteCourse(false)}
        onConfirm={async () => {
          setShowDeleteCourse(false);
          await ds.deleteCourse(course.id);
          showToast({
            message: isId
              ? `Kelas "${course.name}" berhasil dihapus`
              : `Class "${course.name}" deleted`,
            type: 'success',
          });
          onClose();
        }}
        title={isId ? 'Hapus Kelas?' : 'Delete Class?'}
        message={
          isId
            ? `Apakah kamu yakin ingin menghapus kelas "${course.name}" (${course.code}) beserta seluruh jadwal sesinya?`
            : `Are you sure you want to delete "${course.name}" (${course.code}) and all its scheduled sessions?`
        }
        confirmText={isId ? 'Hapus Kelas' : 'Delete Class'}
        cancelText={isId ? 'Batal' : 'Cancel'}
        danger
      />
    </Modal>
  );
}
