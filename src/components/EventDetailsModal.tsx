import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import { CategoryIndicator } from './CategoryIndicator';
import { CATEGORY_SHAPES, CATEGORY_COLORS } from '../types';
import type { CalendarEvent, EventType } from '../types';
import { formatTime12 } from '../lib/dateUtils';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const courses = useData(ds.getCourses);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<EventType>('personal');
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setType(event.type);
      setCourseId(event.courseId || '');
      setNotes(event.notes || '');
      setIsEditing(false);
    }
  }, [event, isOpen]);

  if (!event) return null;

  const course = courses.find((c) => c.id === (isEditing ? courseId : event.courseId));
  const categoryKey = event.type === 'exam' ? 'exams' : event.type === 'deadline' ? 'deadlines' : 'personal';
  const shape = CATEGORY_SHAPES[categoryKey] || 'circle';
  const color = CATEGORY_COLORS[categoryKey] || 'var(--personal)';

  const handleSave = () => {
    if (!title.trim()) return;
    ds.updateEvent(event.id, {
      title,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      type,
      courseId: courseId || undefined,
      notes: notes || undefined,
    });
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      ds.deleteEvent(event.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Calendar Event' : 'Event Details'}
    >
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Exam, Office Hours, Group Meeting"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                style={{ width: '100%' }}
              >
                <option value="exam">Exam</option>
                <option value="deadline">Deadline</option>
                <option value="personal">Personal / Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="label">Associated Course (Optional)</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">None / General</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes / Location</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Room location, zoom link, exam materials permitted, etc."
              rows={3}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save Changes
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
                {event.type}
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
                {course.name} · {course.professor ? `Prof. ${course.professor}` : 'Academic Calendar'}
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
              <span style={{ color: 'var(--on-surface-variant)', width: 60 }}>Date:</span>
              <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {event.startTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 60 }}>Time:</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                  {formatTime12(event.startTime)}
                  {event.endTime ? ` – ${formatTime12(event.endTime)}` : ''}
                </span>
              </div>
            )}
            {event.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 60, flexShrink: 0 }}>Notes:</span>
                <span style={{ color: 'var(--on-surface)', whiteSpace: 'pre-wrap' }}>{event.notes}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
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
              Delete Event
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Close
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
                Edit Event
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
