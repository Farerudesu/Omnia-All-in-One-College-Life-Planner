import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/lib/useLanguage';
import { toDateString, formatDateLong, formatTime12 } from '@/lib/dateUtils';
import * as ds from '@/lib/dataService';
import type { Course, ClassSession } from '@/types';

export function ClassSessionModal({
  data,
  isOpen,
  onClose,
}: {
  data: { course: Course; session: ClassSession; date: Date } | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const lang = useLanguage();
  const navigate = useNavigate();

  if (!data) return null;
  const { course, session, date } = data;
  const dateStr = toDateString(date);

  const handleCancelToday = () => {
    if (
      window.confirm(
        lang === 'id'
          ? `Batalkan sesi perkuliahan ${course.code} untuk tanggal ${dateStr}?`
          : `Cancel lecture session for ${course.code} on ${dateStr}?`
      )
    ) {
      ds.addSessionException({
        classSessionId: session.id,
        date: dateStr,
        type: 'cancelled',
      });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang === 'id' ? 'Detail Kelas Perkuliahan' : 'Course Session Details'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: course.color || 'var(--primary)',
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: course.color || 'var(--primary)',
              }}
            >
              {course.code}
            </div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                margin: 0,
                color: 'var(--on-surface)',
              }}
            >
              {course.name}
            </h2>
          </div>
        </div>

        <div
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 8,
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>
              {lang === 'id' ? 'Tanggal:' : 'Date:'}
            </span>
            <span style={{ fontWeight: 600 }}>{formatDateLong(date)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>
              {lang === 'id' ? 'Waktu Kuliah:' : 'Time:'}
            </span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>
              {formatTime12(session.startTime)} – {formatTime12(session.endTime)}
            </span>
          </div>
          {(session.room || course.room) && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>
                {lang === 'id' ? 'Ruangan:' : 'Room:'}
              </span>
              <span style={{ fontWeight: 600 }}>{session.room || course.room}</span>
            </div>
          )}
          {course.professor && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--on-surface-variant)' }}>
                {lang === 'id' ? 'Dosen:' : 'Instructor:'}
              </span>
              <span style={{ fontWeight: 600 }}>{course.professor}</span>
            </div>
          )}
        </div>

        <div className="modal-actions-sticky" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={handleCancelToday}
            style={{ color: 'var(--error)', borderColor: 'var(--error-container)' }}
          >
            {lang === 'id' ? 'Batalkan Hari Ini' : 'Cancel for Today'}
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              {lang === 'id' ? 'Tutup' : 'Close'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onClose();
                navigate('/schedule');
              }}
            >
              {lang === 'id' ? 'Lihat di Jadwal' : 'View in Schedule'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
