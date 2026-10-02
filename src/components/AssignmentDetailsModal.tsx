import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import { CheckCircle, Clock, Circle } from 'lucide-react';
import type { Assignment, Priority, AssignmentStatus } from '../types';
interface AssignmentDetailsModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignmentDetailsModal({ assignment, isOpen, onClose }: AssignmentDetailsModalProps) {
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

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title);
      setDueDate(assignment.dueDate);
      setPriority(assignment.priority);
      setStatus(assignment.status);
      setCategory(assignment.category || 'classes');
      setCourseId(assignment.courseId || '');
      setNotes(assignment.notes || '');
      setIsEditing(false);
    }
  }, [assignment, isOpen]);

  if (!assignment) return null;

  const course = courses.find((c) => c.id === (isEditing ? courseId : assignment.courseId));

  const handleSave = () => {
    if (!title.trim()) return;
    ds.updateAssignment(assignment.id, {
      title,
      dueDate,
      priority,
      status,
      category: (category as any) || 'other',
      courseId: courseId || undefined,
      notes: notes || undefined,
    });
    setIsEditing(false);
    onClose();
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
      title={isEditing ? 'Edit Assignment' : 'Deliverable Details'}
    >
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Problem Set 4, Research Proposal"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
              <label className="label">Course (Optional)</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={category !== 'classes'}
                style={{ width: '100%' }}
              >
                <option value="">None</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.name}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label">Priority</label>
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
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes & Specifications</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Submission guidelines, file formats, grading rubric notes..."
              rows={3}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save Deliverable
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header pill & Course badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {course && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: `${course.color}15`,
                  color: course.color,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 4,
                }}
              >
                {course.code} · {course.name}
              </span>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                {assignment.priority} Priority
              </span>
              <button
                onClick={handleToggleStatus}
                className="badge"
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {assignment.status === 'done' ? (
                    <><CheckCircle size={14} /> Completed</>
                  ) : assignment.status === 'in-progress' ? (
                    <><Clock size={14} /> In Progress</>
                  ) : (
                    <><Circle size={14} /> Not Started</>
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
              <span style={{ color: 'var(--on-surface-variant)', width: 80 }}>Due Date:</span>
              <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })} at {new Date(assignment.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            {course?.professor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 80 }}>Instructor:</span>
                <span style={{ color: 'var(--on-surface)' }}>{course.professor}</span>
              </div>
            )}
            {assignment.notes && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--on-surface-variant)', width: 80, flexShrink: 0 }}>Notes:</span>
                <span style={{ color: 'var(--on-surface)', whiteSpace: 'pre-wrap' }}>{assignment.notes}</span>
              </div>
            )}
          </div>

          {/* Actions */}
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
              Delete
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
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
