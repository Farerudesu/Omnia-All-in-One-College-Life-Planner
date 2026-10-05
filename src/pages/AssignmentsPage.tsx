import { useState, useMemo } from 'react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { Modal } from '../components/Modal';
import { AssignmentDetailsModal } from '../components/AssignmentDetailsModal';
import { CategoryIndicator } from '../components/CategoryIndicator';
import type { Assignment, Priority, AssignmentStatus, CategoryShape } from '../types';
import { useLanguage } from '../lib/useLanguage';
import { formatDateShort, formatTime12 } from '../lib/dateUtils';

const CATEGORY_MAP: Record<string, { shape: CategoryShape; color: string; label: string }> = {
  classes: { shape: 'square', color: 'var(--classes)', label: 'Coursework' },
  exam: { shape: 'diamond', color: 'var(--exams)', label: 'Exam prep' },
  deadline: { shape: 'outline-square', color: 'var(--deadlines)', label: 'Deadline' },
  personal: { shape: 'circle', color: 'var(--personal)', label: 'Personal' },
  other: { shape: 'circle', color: 'var(--on-surface-variant)', label: 'Other' },
};

type FilterMode = 'all' | 'due-soon' | 'by-course' | 'done';

export function AssignmentsPage() {
  const lang = useLanguage();
  const assignments = useData(ds.getAssignments);
  const courses = useData(ds.getCourses);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const courseMap = useMemo(() => {
    const map = new Map<string, typeof courses[0]>();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const now = new Date();

  const filtered = useMemo(() => {
    let list = [...assignments];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => {
        const course = a.courseId ? courseMap.get(a.courseId) : undefined;
        return (
          a.title.toLowerCase().includes(q) ||
          (a.notes && a.notes.toLowerCase().includes(q)) ||
          (course && (course.code.toLowerCase().includes(q) || course.name.toLowerCase().includes(q)))
        );
      });
    }

    switch (filter) {
      case 'due-soon':
        list = list.filter((a) => {
          if (a.status === 'done') return false;
          const due = new Date(a.dueDate);
          const diff = due.getTime() - now.getTime();
          return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
        });
        break;
      case 'done':
        list = list.filter((a) => a.status === 'done');
        break;
      case 'by-course':
        list.sort((a, b) => (a.courseId || '').localeCompare(b.courseId || ''));
        break;
    }

    if (filter !== 'by-course') {
      list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    return list;
  }, [assignments, filter, searchQuery, courseMap, now]);

  const activeCount = assignments.filter((a) => a.status !== 'done').length;
  const doneCount = assignments.filter((a) => a.status === 'done').length;
  const overdueCount = assignments.filter((a) => {
    return a.status !== 'done' && new Date(a.dueDate) < now;
  }).length;
  const dueSoonCount = assignments.filter((a) => {
    if (a.status === 'done') return false;
    const due = new Date(a.dueDate);
    const diff = due.getTime() - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const toggleStatus = (id: string, current: AssignmentStatus) => {
    const next: AssignmentStatus = current === 'done' ? 'not-started' : 'done';
    ds.updateAssignment(id, { status: next });
  };

  return (
    <div>
      <div className="page-header">
        <div style={{
          fontSize: '0.8125rem', fontWeight: 500, color: 'var(--on-surface-variant)',
          marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem'
        }}>
          <span>{lang === 'id' ? 'Akademik' : 'Academics'}</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span>{lang === 'id' ? 'Daftar Tugas' : 'Deliverables'}</span>
        </div>
        <h1>{lang === 'id' ? 'Tugas & Pekerjaan Rumah' : 'Assignments & Tasks'}</h1>
        <p className="subtitle">
          {lang === 'id'
            ? 'Pantau tugas kuliah, bahan bacaan, laporan, dan jadwal evaluasi.'
            : 'Track problem sets, readings, deliverables, and exam milestones.'}
        </p>
      </div>

      <div className="page-content">
        {/* Academic Progress & Overview Strip */}
        <div className="card assignments-overview" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div className="assignments-controls" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '0.875rem',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                {lang === 'id' ? 'Penyelesaian Tugas Semester' : 'Semester Task Completion'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span className="tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {doneCount} {lang === 'id' ? 'dari' : 'of'} {assignments.length}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                  ({assignments.length > 0 ? Math.round((doneCount / assignments.length) * 100) : 0}% {lang === 'id' ? 'selesai' : 'completed'})
                </span>
              </div>
            </div>

            <div className="horizontal-scroll-chips" style={{ display: 'flex', gap: '0.625rem', paddingBottom: '0.25rem' }}>
              <div style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 6,
                background: 'var(--surface-container)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{lang === 'id' ? 'Aktif:' : 'Active:'}</span>
                <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.875rem' }}>{activeCount}</span>
              </div>
              <div style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 6,
                background: 'var(--tertiary-container)',
                color: 'var(--on-tertiary-container)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.75rem' }}>{lang === 'id' ? 'Tenggat minggu ini:' : 'Due this week:'}</span>
                <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.875rem' }}>{dueSoonCount}</span>
              </div>
              {overdueCount > 0 && (
                <div style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 6,
                  background: 'var(--error-container)',
                  color: 'var(--on-error-container)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '0.75rem' }}>{lang === 'id' ? 'Terlambat:' : 'Overdue:'}</span>
                  <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.875rem' }}>{overdueCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 8,
            background: 'var(--surface-container-high)',
            borderRadius: 9999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${assignments.length > 0 ? (doneCount / assignments.length) * 100 : 0}%`,
              background: 'var(--primary)',
              borderRadius: 9999,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Search & Filter controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div className="assignment-filter-list horizontal-scroll-chips" style={{ display: 'flex', gap: '0.375rem', width: '100%', paddingBottom: '0.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {([
              { key: 'all', label: `${lang === 'id' ? 'Semua' : 'All'} (${assignments.length})` },
              { key: 'due-soon', label: `${lang === 'id' ? 'Mendesak' : 'Due soon'} (${dueSoonCount})` },
              { key: 'by-course', label: lang === 'id' ? 'Per mata kuliah' : 'By course' },
              { key: 'done', label: `${lang === 'id' ? 'Selesai' : 'Completed'} (${doneCount})` },
            ] as { key: FilterMode; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={filter === key ? 'chip active' : 'chip'}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="assignment-search-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 300px', maxWidth: 450 }}>
            <div className="assignment-search-field" style={{ position: 'relative', width: '100%' }}>
              <input
                className="assignment-search-input"
                type="text"
                placeholder={lang === 'id' ? 'Cari tugas, mata kuliah, catatan…' : 'Search deliverables, courses, notes…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', fontSize: '0.8125rem', padding: '0.45rem 2rem 0.45rem 0.75rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear assignment search"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontSize: '0.75rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button type="button" className="btn-primary assignment-add-button" onClick={() => setShowAdd(true)} style={{ whiteSpace: 'nowrap' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {lang === 'id' ? 'Tambah tugas' : 'Add assignment'}
            </button>
          </div>
        </div>

        {/* Assignment list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              course={a.courseId ? courseMap.get(a.courseId) : undefined}
              isOverdue={a.status !== 'done' && new Date(a.dueDate) < now}
              onToggle={() => toggleStatus(a.id, a.status)}
              onOpenDetails={() => setSelectedAssignment(a)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--on-surface-variant)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              background: 'var(--surface-container-low)',
              borderRadius: 12,
              border: '1px dashed var(--outline-variant)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--outline)" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                  {searchQuery ? (lang === 'id' ? `Tidak ada tugas sesuai "${searchQuery}"` : `No deliverables matching "${searchQuery}"`) : (lang === 'id' ? 'Belum ada tugas' : 'No assignments found')}
                </div>
                <div style={{ fontSize: '0.875rem' }}>{lang === 'id' ? 'Catat tugas berikutnya untuk mengatur jadwal belajarmu.' : 'Get ahead of your coursework by adding your next deliverable.'}</div>
              </div>
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                {lang === 'id' ? 'Tambah tugas' : 'Add assignment'}
              </button>
            </div>
          )}
        </div>
      </div>

      <AddAssignmentModal isOpen={showAdd} onClose={() => setShowAdd(false)} />

      {/* Details & Edit Modal */}
      <AssignmentDetailsModal
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </div>
  );
}

// ─── Assignment Row ───
function AssignmentRow({
  assignment,
  course,
  isOverdue,
  onToggle,
  onOpenDetails,
}: {
  assignment: Assignment;
  course?: { code: string; name: string; color: string };
  isOverdue: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
}) {
  const lang = useLanguage();
  const due = new Date(assignment.dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24));

  const dateFormatted = formatDateShort(due);
  const timeFormatted = formatTime12(`${due.getHours().toString().padStart(2, '0')}:${due.getMinutes().toString().padStart(2, '0')}`);

  const dueText = isOverdue
    ? (lang === 'id' ? `${dateFormatted} – ${timeFormatted} (Terlambat)` : `${dateFormatted} – ${timeFormatted} (Overdue)`)
    : daysUntil <= 0
      ? (lang === 'id' ? 'Hari Ini' : 'Today')
      : (lang === 'id' ? `${dateFormatted} – ${timeFormatted} (${daysUntil} hari lagi)` : `${dateFormatted} – ${timeFormatted} (In ${daysUntil} day${daysUntil !== 1 ? 's' : ''})`);

  return (
    <div
      className="card hover-highlight"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 14,
        background: assignment.status === 'done' ? 'var(--surface-container-low)' : 'var(--surface-container-lowest)',
        border: isOverdue ? '1px solid var(--error)' : '1px solid var(--outline-variant)',
        boxShadow: 'var(--shadow-xs)',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Accessible Checkbox with comfortable 36x36 tap area */}
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={assignment.status === 'done'}
        aria-label={assignment.status === 'done' ? `Mark "${assignment.title}" as incomplete` : `Mark "${assignment.title}" as complete`}
        style={{
          width: 32, height: 32, borderRadius: '50%', marginTop: -2, marginLeft: -2,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
        className="btn-ghost"
      >
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          border: assignment.status === 'done' ? 'none' : '1.5px solid var(--outline)',
          background: assignment.status === 'done' ? 'var(--primary)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background-color 0.12s ease, border-color 0.12s ease',
        }}>
          {assignment.status === 'done' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </button>

      {/* Content — clicking opens AssignmentDetailsModal */}
      <div
        style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        onClick={onOpenDetails}
      >
        <div style={{
          fontWeight: 600, fontSize: '0.9375rem',
          textDecoration: assignment.status === 'done' ? 'line-through' : 'none',
          opacity: assignment.status === 'done' ? 0.6 : 1,
          color: 'var(--on-surface)',
          marginBottom: '0.25rem',
        }}>
          {assignment.title}
        </div>
        
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--on-surface-variant)',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.375rem',
          opacity: assignment.status === 'done' ? 0.7 : 1,
        }}>
          {/* Due Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--error)' : 'inherit' }}>
            {isOverdue && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {!isOverdue && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            )}
            <span style={{ fontWeight: isOverdue ? 600 : 500 }}>{dueText}</span>
          </div>
          
          <span style={{ opacity: 0.4 }}>·</span>

          {/* Category / Course */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <CategoryIndicator 
              shape={course ? 'square' : (CATEGORY_MAP[assignment.category || 'other']?.shape || 'circle')} 
              color={course ? course.color : (CATEGORY_MAP[assignment.category || 'other']?.color || 'var(--on-surface-variant)')} 
              size={6} 
            />
            <span style={{ fontWeight: 500 }}>
              {course ? course.code : (CATEGORY_MAP[assignment.category || 'other']?.label || 'Other')}
            </span>
          </div>

          {/* Priority */}
          {assignment.priority === 'high' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', color: 'var(--error)', fontWeight: 600 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                High Priority
              </div>
            </>
          )}

          {/* Status Text (if in progress) */}
          {assignment.status === 'in-progress' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>In progress</span>
            </>
          )}
        </div>
      </div>

      {/* Edit button */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onOpenDetails}
          className="btn-ghost min-touch-target"
          style={{ padding: '0.3rem', color: 'var(--on-surface-variant)' }}
          aria-label={`Edit ${assignment.title}`}
          title="Edit deliverable"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Add Assignment Modal ───
function AddAssignmentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const lang = useLanguage();
  const courses = useData(ds.getCourses);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('classes');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('23:59');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<AssignmentStatus>('not-started');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setTitleError('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(lang === 'id' ? 'Judul tidak boleh kosong' : 'Title is required');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalDueDate = dueDate || new Date().toISOString().split('T')[0];
      ds.addAssignment({
        courseId: courseId || undefined,
        category: (category as any) || 'other',
        title: title.trim(),
        dueDate: `${finalDueDate}T${dueTime || '23:59'}`,
        priority,
        status,
        notes: notes.trim() || undefined,
      });
      setTitle('');
      setNotes('');
      setTitleError('');
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={lang === 'id' ? 'Tambah tugas' : 'Add assignment'}>
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
            placeholder={lang === 'id' ? 'Contoh: Laporan Praktikum Fisika' : 'Assignment title'}
            style={{
              width: '100%',
              borderColor: titleError ? 'var(--error)' : undefined,
              boxShadow: titleError ? '0 0 0 2px var(--error-container)' : undefined,
            }}
          />
          {titleError && (
            <div id="assignment-title-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
              {titleError}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
            <select id="assignment-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={category !== 'classes'} style={{ width: '100%' }}>
              <option value="">{lang === 'id' ? 'Tidak ada' : 'None'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} – {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="assignment-due-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Tanggal tenggat' : 'Due date'}
            </label>
            <input id="assignment-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label htmlFor="assignment-due-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Waktu tenggat' : 'Due time'}
            </label>
            <input id="assignment-due-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Prioritas' : 'Priority'}
          </label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={priority === p ? 'chip active' : 'chip'}
                onClick={() => setPriority(p)}
              >
                {p === 'low' ? (lang === 'id' ? 'Rendah' : 'Low') : p === 'medium' ? (lang === 'id' ? 'Sedang' : 'Medium') : (lang === 'id' ? 'Tinggi' : 'High')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Status' : 'Status'}
          </label>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {([
              { value: 'not-started', label: lang === 'id' ? 'Belum mulai' : 'Not started' },
              { value: 'in-progress', label: lang === 'id' ? 'Sedang dikerjakan' : 'In progress' },
              { value: 'done', label: lang === 'id' ? 'Selesai' : 'Done' },
            ] as { value: AssignmentStatus; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={status === value ? 'chip active' : 'chip'}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="assignment-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Catatan (opsional)' : 'Notes (optional)'}
          </label>
          <textarea id="assignment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={lang === 'id' ? 'Catatan tambahan...' : 'Additional notes…'} rows={3} style={{ width: '100%', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={handleClose} disabled={isSubmitting}>
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? (lang === 'id' ? 'Menyimpan…' : 'Saving…') : (lang === 'id' ? 'Simpan' : 'Save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
