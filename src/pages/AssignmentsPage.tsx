import { useState, useMemo } from 'react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { AddAssignmentModal } from '../components/AddAssignmentModal';
import { AssignmentDetailsModal } from '../components/AssignmentDetailsModal';
import { CategoryIndicator } from '../components/CategoryIndicator';
import { Pin } from 'lucide-react';
import type { Assignment, AssignmentStatus, CategoryShape } from '../types';
import { useLanguage } from '../lib/useLanguage';
import { formatDateShort, formatTime12 } from '../lib/dateUtils';

const CATEGORY_MAP: Record<string, { shape: CategoryShape; color: string; label: string }> = {
  classes: { shape: 'square', color: 'var(--classes)', label: 'Coursework' },
  exam: { shape: 'diamond', color: 'var(--exams)', label: 'Exam prep' },
  deadline: { shape: 'outline-square', color: 'var(--deadlines)', label: 'Deadline' },
  personal: { shape: 'circle', color: 'var(--personal)', label: 'Personal' },
  other: { shape: 'circle', color: 'var(--on-surface-variant)', label: 'Other' },
};

type FilterMode = 'active' | 'all' | 'due-soon' | 'pinned' | 'by-course' | 'done';

export function AssignmentsPage() {
  const lang = useLanguage();
  const assignments = useData(ds.getAssignments);
  const courses = useData(ds.getCourses);
  const pinnedIds = useData(ds.getPinnedAssignmentIds);

  const [filter, setFilter] = useState<FilterMode>('active');
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);

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
      case 'active':
        list = list.filter((a) => a.status !== 'done');
        break;
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
      case 'pinned':
        list = list.filter((a) => pinnedIds.includes(a.id));
        break;
      case 'by-course':
        list = list.filter((a) => a.status !== 'done');
        list.sort((a, b) => (a.courseId || '').localeCompare(b.courseId || ''));
        break;
    }

    if (filter !== 'by-course') {
      const pinnedSet = new Set(pinnedIds);
      list.sort((a, b) => {
        const aPinned = pinnedSet.has(a.id) && a.status !== 'done' ? 1 : 0;
        const bPinned = pinnedSet.has(b.id) && b.status !== 'done' ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }

    return list;
  }, [assignments, filter, searchQuery, courseMap, now, pinnedIds]);

  const activeCount = assignments.filter((a) => a.status !== 'done').length;
  const doneCount = assignments.filter((a) => a.status === 'done').length;
  const pinnedCount = assignments.filter((a) => pinnedIds.includes(a.id)).length;
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
        <h1 style={{ margin: 0 }}>{lang === 'id' ? 'Tugas & Pekerjaan Rumah' : 'Assignments & Tasks'}</h1>
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
          <div className="assignment-filter-list horizontal-scroll-chips" style={{ display: 'flex', gap: '0.375rem', width: '100%', paddingBottom: '0.25rem', paddingRight: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {([
              { key: 'active', label: `${lang === 'id' ? 'Belum Selesai' : 'Pending'} (${activeCount})` },
              { key: 'due-soon', label: `${lang === 'id' ? 'Mendesak' : 'Due soon'} (${dueSoonCount})` },
              { key: 'pinned', label: `${lang === 'id' ? 'Disematkan' : 'Pinned'} (${pinnedCount})` },
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
              isPinned={pinnedIds.includes(a.id)}
              onTogglePin={() => ds.togglePinAssignment(a.id)}
              onToggle={() => toggleStatus(a.id, a.status)}
              onOpenDetails={() => { setOpenInEditMode(false); setSelectedAssignment(a); }}
              onEdit={() => { setOpenInEditMode(true); setSelectedAssignment(a); }}
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
        openInEditMode={openInEditMode}
        onClose={() => { setSelectedAssignment(null); setOpenInEditMode(false); }}
      />
    </div>
  );
}

// ─── Assignment Row ───
function AssignmentRow({
  assignment,
  course,
  isOverdue,
  isPinned,
  onTogglePin,
  onToggle,
  onOpenDetails,
  onEdit,
}: {
  assignment: Assignment;
  course?: { code: string; name: string; color: string };
  isOverdue: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onToggle: () => void;
  onOpenDetails: () => void;
  onEdit: () => void;
}) {
  const lang = useLanguage();
  const due = new Date(assignment.dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const diffMins = Math.floor(diff / (1000 * 60));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  const dateFormatted = formatDateShort(due);
  const timeFormatted = formatTime12(`${due.getHours().toString().padStart(2, '0')}:${due.getMinutes().toString().padStart(2, '0')}`);

  const countdownLabel = (() => {
    if (isOverdue) {
      const overdueDays = Math.floor(-diff / (1000 * 60 * 60 * 24));
      return lang === 'id'
        ? `Terlambat ${overdueDays > 0 ? `${overdueDays} hari` : 'hari ini'}`
        : `Overdue ${overdueDays > 0 ? `${overdueDays}d` : 'today'}`;
    }
    if (diffMins < 60) return lang === 'id' ? `${Math.max(1, diffMins)} menit lagi` : `${Math.max(1, diffMins)}m left`;
    if (diffHours < 24) return lang === 'id' ? `${diffHours} jam lagi` : `${diffHours}h left`;
    return lang === 'id' ? `${diffDays} hari lagi` : `${diffDays}d left`;
  })();

  const dueText = `${dateFormatted} – ${timeFormatted} (${countdownLabel})`;

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

          {/* Pinned badge */}
          {isPinned && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}>
                <Pin size={11} style={{ fill: 'currentColor' }} />
                {lang === 'id' ? 'Disematkan' : 'Pinned'}
              </span>
            </>
          )}

          {/* Priority */}
          {assignment.priority === 'high' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', color: 'var(--error)', fontWeight: 600 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                Prioritas tinggi
              </div>
            </>
          )}

          {/* Status Text (if in progress) */}
          {assignment.status === 'in-progress' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Sedang dikerjakan</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons: Pin & Edit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={onTogglePin}
          className="btn-ghost min-touch-target"
          style={{
            padding: '0.3rem',
            color: isPinned ? 'var(--primary)' : 'var(--on-surface-variant)',
            background: isPinned ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
            borderRadius: 6,
          }}
          aria-label={isPinned ? (lang === 'id' ? 'Lepas sematan' : 'Unpin from sidebar') : (lang === 'id' ? 'Sematkan ke sidebar' : 'Pin to sidebar')}
          title={isPinned ? (lang === 'id' ? 'Lepas sematan dari sidebar' : 'Unpin from sidebar') : (lang === 'id' ? 'Sematkan ke sidebar' : 'Pin to sidebar')}
        >
          <Pin size={15} style={{ fill: isPinned ? 'currentColor' : 'none' }} />
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="btn-ghost min-touch-target"
          style={{ padding: '0.3rem', color: 'var(--on-surface-variant)' }}
          aria-label={`Edit ${assignment.title}`}
          title={lang === 'id' ? 'Ubah rincian' : 'Edit deliverable'}
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
