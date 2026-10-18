interface ClassPermanentFormProps {
  isId: boolean;
  instructor: string;
  setInstructor: (v: string) => void;
  newRoom: string;
  setNewRoom: (v: string) => void;
  newStartTime: string;
  setNewStartTime: (v: string) => void;
  newEndTime: string;
  setNewEndTime: (v: string) => void;
  setTimeError: (v: string | null) => void;
}

export function ClassPermanentForm({
  isId,
  instructor,
  setInstructor,
  newRoom,
  setNewRoom,
  newStartTime,
  setNewStartTime,
  newEndTime,
  setNewEndTime,
  setTimeError,
}: ClassPermanentFormProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}
    >
      <div
        style={{
          background: 'var(--surface-container-low)',
          padding: '0.75rem',
          borderRadius: 8,
          fontSize: '0.75rem',
          color: 'var(--on-surface-variant)',
        }}
      >
        {isId
          ? 'Perubahan ini akan mengubah informasi dosen, ruangan, dan jadwal kuliah secara permanen untuk semester ini.'
          : 'These changes will permanently update instructor, room, and timetable for all upcoming weeks.'}
      </div>

      <div>
        <label
          htmlFor="class-instructor-perm"
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '0.25rem',
          }}
        >
          {isId ? 'Dosen Pengampu (Permanen)' : 'Instructor (Permanent)'}
        </label>
        <input
          id="class-instructor-perm"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          placeholder={isId ? 'contoh: Dr. Budi Santoso' : 'e.g. Dr. Jane Smith'}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label
          htmlFor="class-room-perm"
          style={{
            display: 'block',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginBottom: '0.25rem',
          }}
        >
          {isId ? 'Lokasi / Ruangan (Permanen)' : 'Location / Room (Permanent)'}
        </label>
        <input
          id="class-room-perm"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          placeholder={isId ? 'contoh: C402 / Lab 3' : 'e.g. C402 / Lab 3'}
          style={{ width: '100%' }}
        />
      </div>

      <div className="modal-form-grid-2col">
        <div>
          <label
            htmlFor="class-start-perm"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.25rem',
            }}
          >
            {isId ? 'Jam Mulai' : 'Start Time'}
          </label>
          <input
            id="class-start-perm"
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
            htmlFor="class-end-perm"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.25rem',
            }}
          >
            {isId ? 'Jam Selesai' : 'End Time'}
          </label>
          <input
            id="class-end-perm"
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
    </div>
  );
}
