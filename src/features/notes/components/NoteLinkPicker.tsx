import { GraduationCap, CheckSquare, Calendar as CalendarIcon, X } from 'lucide-react';
import type { Course, Assignment, CalendarEvent } from '@/types';
import { useLanguage } from '@/lib/useLanguage';

interface NoteLinkPickerProps {
  courseId: string | null;
  assignmentId: string | null;
  eventId: string | null;
  courses: Course[];
  assignments: Assignment[];
  events: CalendarEvent[];
  onChange: (links: {
    courseId: string | null;
    assignmentId: string | null;
    eventId: string | null;
  }) => void;
}

export function NoteLinkPicker({
  courseId,
  assignmentId,
  eventId,
  courses,
  assignments,
  events,
  onChange,
}: NoteLinkPickerProps) {
  const lang = useLanguage();

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({
      courseId: val ? val : null,
      assignmentId,
      eventId,
    });
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({
      courseId,
      assignmentId: val ? val : null,
      eventId,
    });
  };

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({
      courseId,
      assignmentId,
      eventId: val ? val : null,
    });
  };

  const hasAnyLink = Boolean(courseId || assignmentId || eventId);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem',
        background: 'var(--surface-container-low)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--outline-variant)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--on-surface-variant)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {lang === 'id' ? 'Tautan Konteks' : 'Linked Context'}
        </span>
        {hasAnyLink && (
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', height: 'auto' }}
            onClick={() => onChange({ courseId: null, assignmentId: null, eventId: null })}
          >
            <X size={12} />
            <span>{lang === 'id' ? 'Hapus semua tautan' : 'Clear links'}</span>
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {/* Course Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <GraduationCap size={15} color="var(--primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <select
            value={courseId || ''}
            onChange={handleCourseChange}
            aria-label={lang === 'id' ? 'Hubungkan ke mata kuliah' : 'Link to course'}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.8125rem',
              padding: '0.375rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface)',
            }}
          >
            <option value="">{lang === 'id' ? '— Mata Kuliah —' : '— Course —'}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assignment Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <CheckSquare size={15} color="var(--deadlines)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <select
            value={assignmentId || ''}
            onChange={handleAssignmentChange}
            aria-label={lang === 'id' ? 'Hubungkan ke tugas' : 'Link to task'}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.8125rem',
              padding: '0.375rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface)',
            }}
          >
            <option value="">{lang === 'id' ? '— Tugas —' : '— Assignment —'}</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        {/* Event Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <CalendarIcon size={15} color="var(--personal)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <select
            value={eventId || ''}
            onChange={handleEventChange}
            aria-label={lang === 'id' ? 'Hubungkan ke acara/jadwal' : 'Link to event'}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.8125rem',
              padding: '0.375rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-lowest)',
              color: 'var(--on-surface)',
            }}
          >
            <option value="">{lang === 'id' ? '— Acara —' : '— Event —'}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.date})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
