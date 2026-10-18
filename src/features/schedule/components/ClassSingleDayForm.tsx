import type { ExceptionType } from '@/types';
import { getMonthName } from '@/lib/dateUtils';
import { ClassExceptionsPicker } from './ClassExceptionsPicker';

interface ClassSingleDayFormProps {
  isId: boolean;
  date: Date;
  dateStr: string;
  instructor: string;
  setInstructor: (v: string) => void;
  excType: ExceptionType | '';
  setExcType: (v: ExceptionType | '') => void;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
  newStartTime: string;
  setNewStartTime: (v: string) => void;
  newEndTime: string;
  setNewEndTime: (v: string) => void;
  setTimeError: (v: string | null) => void;
  newRoom: string;
  setNewRoom: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
}

export function ClassSingleDayForm({
  isId,
  date,
  dateStr,
  instructor,
  setInstructor,
  excType,
  setExcType,
  isOnline,
  setIsOnline,
  newStartTime,
  setNewStartTime,
  newEndTime,
  setNewEndTime,
  setTimeError,
  newRoom,
  setNewRoom,
  note,
  setNote,
}: ClassSingleDayFormProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}
    >
      <div>
        <label
          htmlFor="class-instructor-edit"
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '0.25rem',
          }}
        >
          {isId ? 'Dosen Pengampu' : 'Instructor'}
        </label>
        <input
          id="class-instructor-edit"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          placeholder={isId ? 'contoh: Dr. Budi Santoso' : 'e.g. Dr. Jane Smith'}
          style={{ width: '100%' }}
        />
      </div>

      <div>
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
            }}
          >
            {isId ? 'Status Pertemuan Hari Ini' : 'Single-day exceptions'}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}
          >
            {isId
              ? `Hanya untuk ${dateStr}`
              : `Apply to ${getMonthName(date.getMonth(), true)} ${date.getDate()} only`}
          </span>
        </div>
        <ClassExceptionsPicker
          excType={excType}
          isOnline={isOnline}
          isId={isId}
          onSelectException={(t) => setExcType(excType === t ? '' : t)}
          onToggleOnline={() => {
            setIsOnline(!isOnline);
            if (excType === 'online') setExcType('');
          }}
        />
      </div>

      {(excType === 'moved' || excType === 'extra') && (
        <div className="modal-form-grid-2col">
          <div>
            <label
              htmlFor="new-start-time-input"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.25rem',
              }}
            >
              {isId ? 'Mulai baru' : 'New start'}
            </label>
            <input
              id="new-start-time-input"
              className="tabular-nums"
              type="time"
              value={newStartTime}
              onChange={(e) => {
                setNewStartTime(e.target.value);
                setTimeError(null);
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label
              htmlFor="new-end-time-input"
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                marginBottom: '0.25rem',
              }}
            >
              {isId ? 'Selesai baru' : 'New end'}
            </label>
            <input
              id="new-end-time-input"
              className="tabular-nums"
              type="time"
              value={newEndTime}
              onChange={(e) => {
                setNewEndTime(e.target.value);
                setTimeError(null);
              }}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      {(excType === 'room-changed' || excType === 'moved' || !isOnline) && (
        <div>
          <label
            htmlFor="new-room-input"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.25rem',
            }}
          >
            {isId ? 'Ruangan hari ini' : 'Room for today'}
          </label>
          <input
            id="new-room-input"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder={isId ? 'contoh: C402 / D303' : 'e.g. C402 / D303'}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <label htmlFor="class-note-input" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            {isId ? 'Catatan pertemuan' : 'Note for this class'}
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            {isId ? 'Opsional' : 'Optional'}
          </span>
        </div>
        <textarea
          id="class-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            isId
              ? 'contoh: Bawa laptop, kuis di awal jam...'
              : 'e.g., Bring laptop, quiz at start...'
          }
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
