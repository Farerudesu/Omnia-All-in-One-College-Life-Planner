import { useState, useMemo } from 'react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { AddAssignmentModal } from '../components/AddAssignmentModal';
import { AssignmentDetailsModal } from '../components/AssignmentDetailsModal';
import { CategoryIndicator } from '../components/CategoryIndicator';
import { Pin, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Assignment, AssignmentStatus, CategoryShape } from '../types';
import { useLanguage } from '../lib/useLanguage';
import {
  formatDateShort,
  formatTime12,
  formatDetailedCountdown,
  isAssignmentUrgent,
} from '../lib/dateUtils';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

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
  const { showToast } = useToast();
  const assignments = useData(ds.getAssignments);
  const courses = useData(ds.getCourses);
  const pinnedIds = useData(ds.getPinnedAssignmentIds);

  const [filter, setFilter] = useState<FilterMode>('active');
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
  const [isOverdueManualToggle, setIsOverdueManualToggle] = useState<boolean | null>(null);

  const courseMap = useMemo(() => {
    const map = new Map<string, (typeof courses)[0]>();
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
          (course &&
            (course.code.toLowerCase().includes(q) || course.name.toLowerCase().includes(q)))
        );
      });
    }

    switch (filter) {
      case 'active':
        list = list.filter((a) => a.status !== 'done');
        break;
      case 'due-soon':
        list = list.filter((a) => isAssignmentUrgent(a.dueDate, a.status));
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
  }, [assignments, filter, searchQuery, courseMap, pinnedIds]);

  const activeCount = assignments.filter((a) => a.status !== 'done').length;
  const doneCount = assignments.filter((a) => a.status === 'done').length;
  const pinnedCount = assignments.filter((a) => pinnedIds.includes(a.id)).length;
  const overdueCount = assignments.filter((a) => {
    return a.status !== 'done' && new Date(a.dueDate) < now;
  }).length;
  const dueSoonCount = assignments.filter((a) => isAssignmentUrgent(a.dueDate, a.status)).length;
  const isOverdueOpen = isOverdueManualToggle !== null ? isOverdueManualToggle : overdueCount <= 3;

  const toggleStatus = (id: string, current: AssignmentStatus) => {
    const next: AssignmentStatus = current === 'done' ? 'not-started' : 'done';
    ds.updateAssignment(id, { status: next });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAssignment) return;
    const toDelete = deletingAssignment;
    setDeletingAssignment(null);
    try {
      await ds.deleteAssignment(toDelete.id);
      showToast({
        message:
          lang === 'id' ? `Tugas "${toDelete.title}" dihapus` : `Task "${toDelete.title}" deleted`,
        action: {
          label: lang === 'id' ? 'Urungkan' : 'Undo',
          onClick: async () => {
            await ds.restoreAssignment(toDelete);
          },
        },
      });
    } catch {
      // toast error handled in mutateTable
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0 }}>
          {lang === 'id' ? 'Tugas & Pekerjaan Rumah' : 'Assignments & Tasks'}
        </h1>
      </div>

      <div className="page-content">
        {/* Academic Progress & Overview Strip */}
        <div
          className="card assignments-overview"
          style={{ marginBottom: '1.5rem', padding: '1.25rem' }}
        >
          <div
            className="assignments-controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '0.875rem',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                  marginBottom: '0.25rem',
                }}
              >
                {lang === 'id' ? 'Penyelesaian Tugas Semester' : 'Semester Task Completion'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span
                  className="tabular-nums"
                  style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}
                >
                  {doneCount} {lang === 'id' ? 'dari' : 'of'} {assignments.length}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                  ({assignments.length > 0 ? Math.round((doneCount / assignments.length) * 100) : 0}
                  % {lang === 'id' ? 'selesai' : 'completed'})
                </span>
              </div>
            </div>

            <div
              className="horizontal-scroll-chips"
              style={{ display: 'flex', gap: '0.625rem', paddingBottom: '0.25rem' }}
            >
              <div
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 6,
                  background: 'var(--surface-container)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                  {lang === 'id' ? 'Aktif:' : 'Active:'}
                </span>
                <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  {activeCount}
                </span>
              </div>
              <div
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 6,
                  background: 'var(--tertiary-container)',
                  color: 'var(--on-tertiary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>
                  {lang === 'id' ? 'Mendesak:' : 'Urgent:'}
                </span>
                <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  {dueSoonCount}
                </span>
              </div>
              {overdueCount > 0 && (
                <div
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 6,
                    background: 'var(--error-container)',
                    color: 'var(--on-error-container)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '0.75rem' }}>
                    {lang === 'id' ? 'Terlambat:' : 'Overdue:'}
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {overdueCount}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar with accessibility labels */}
          <div
            role="progressbar"
            aria-valuenow={
              assignments.length > 0 ? Math.round((doneCount / assignments.length) * 100) : 0
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              lang === 'id'
                ? `${doneCount} dari ${assignments.length} tugas semester selesai (${assignments.length > 0 ? Math.round((doneCount / assignments.length) * 100) : 0}%)`
                : `${doneCount} of ${assignments.length} semester tasks completed (${assignments.length > 0 ? Math.round((doneCount / assignments.length) * 100) : 0}%)`
            }
            style={{
              height: 8,
              background: 'var(--surface-container-high)',
              borderRadius: 9999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${assignments.length > 0 ? (doneCount / assignments.length) * 100 : 0}%`,
                background: 'var(--primary)',
                borderRadius: 9999,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Search & Filter controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div
            className="assignment-filter-list horizontal-scroll-chips"
            style={{
              display: 'flex',
              gap: '0.375rem',
              width: '100%',
              paddingBottom: '0.25rem',
              paddingRight: '1.5rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {(
              [
                {
                  key: 'active',
                  label: `${lang === 'id' ? 'Belum Selesai' : 'Pending'} (${activeCount})`,
                },
                {
                  key: 'due-soon',
                  label: `${lang === 'id' ? 'Mendesak' : 'Urgent'} (${dueSoonCount})`,
                },
                {
                  key: 'pinned',
                  label: `${lang === 'id' ? 'Disematkan' : 'Pinned'} (${pinnedCount})`,
                },
                { key: 'by-course', label: lang === 'id' ? 'Per mata kuliah' : 'By course' },
                { key: 'done', label: `${lang === 'id' ? 'Selesai' : 'Completed'} (${doneCount})` },
              ] as { key: FilterMode; label: string }[]
            ).map(({ key, label }) => (
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

          <div
            className="assignment-search-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flex: '1 1 300px',
              maxWidth: 450,
            }}
          >
            <div
              className="assignment-search-field"
              style={{ position: 'relative', width: '100%' }}
            >
              <input
                className="assignment-search-input"
                type="text"
                placeholder={
                  lang === 'id'
                    ? 'Cari tugas, mata kuliah, catatan…'
                    : 'Search deliverables, courses, notes…'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.8125rem',
                  padding: '0.45rem 2rem 0.45rem 0.75rem',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear assignment search"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--on-surface-variant)',
                    fontSize: '0.75rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {filtered.length > 0 && (
              <button
                type="button"
                className="btn-primary assignment-add-button"
                onClick={() => setShowAdd(true)}
                style={{ whiteSpace: 'nowrap' }}
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
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {lang === 'id' ? 'Tambah tugas' : 'Add assignment'}
              </button>
            )}
          </div>
        </div>

        {/* Assignment list with Collapsible Overdue section */}
        {filtered.length === 0 ? (
          <div>
            {searchQuery.trim() ? (
              <EmptyState
                title={
                  lang === 'id'
                    ? `Tidak ada tugas sesuai "${searchQuery}"`
                    : `No deliverables matching "${searchQuery}"`
                }
                description={
                  lang === 'id'
                    ? 'Coba cari dengan kata kunci lain.'
                    : 'Try searching with different keywords.'
                }
                actionLabel={lang === 'id' ? 'Hapus pencarian' : 'Clear search'}
                onAction={() => setSearchQuery('')}
              />
            ) : filter === 'active' && assignments.length > 0 && activeCount === 0 ? (
              <EmptyState
                title={lang === 'id' ? 'Semua tugas selesai!' : 'All assignments completed!'}
                description={
                  lang === 'id'
                    ? 'Kerja bagus! Periksa tab Selesai untuk melihat riwayat tugasmu.'
                    : 'Great job! Check the Completed tab to view your past assignments.'
                }
                actionLabel={lang === 'id' ? 'Lihat tab Selesai' : 'View Completed tab'}
                onAction={() => setFilter('done')}
              />
            ) : filter === 'done' && doneCount === 0 ? (
              <EmptyState
                title={lang === 'id' ? 'Belum ada tugas selesai' : 'No completed tasks yet'}
                description={
                  lang === 'id'
                    ? 'Tandai tugas yang sudah kamu selesaikan untuk melacak progres belajarmu.'
                    : 'Check off tasks as you finish them to track your academic progress.'
                }
              />
            ) : (
              <EmptyState
                title={lang === 'id' ? 'Belum ada tugas' : 'No assignments found'}
                description={
                  lang === 'id'
                    ? 'Catat tugas kuliah atau pribadimu untuk mengatur jadwal belajarmu.'
                    : 'Get ahead of your coursework by adding your next deliverable.'
                }
                actionLabel={lang === 'id' ? 'Tambah tugas' : 'Add assignment'}
                onAction={() => setShowAdd(true)}
              />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* If in active view and there are overdue tasks, render collapsible Overdue section */}
            {filter === 'active' && overdueCount > 0 && (
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid var(--error-container)',
                  overflow: 'hidden',
                  background: 'var(--surface-container-lowest)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsOverdueManualToggle(!isOverdueOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'var(--error-container)',
                    color: 'var(--on-error-container)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                  aria-expanded={isOverdueOpen}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'var(--error)',
                        color: 'var(--on-error)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      !
                    </span>
                    {lang === 'id'
                      ? `Terlambat (${filtered.filter((a) => a.status !== 'done' && new Date(a.dueDate) < now).length})`
                      : `Overdue (${filtered.filter((a) => a.status !== 'done' && new Date(a.dueDate) < now).length})`}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    {isOverdueOpen
                      ? lang === 'id'
                        ? 'Tutup'
                        : 'Collapse'
                      : lang === 'id'
                        ? 'Tampilkan'
                        : 'Expand'}
                    {isOverdueOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </button>

                {isOverdueOpen && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '0.75rem',
                    }}
                  >
                    {filtered
                      .filter((a) => a.status !== 'done' && new Date(a.dueDate) < now)
                      .map((a) => (
                        <AssignmentRow
                          key={a.id}
                          assignment={a}
                          course={a.courseId ? courseMap.get(a.courseId) : undefined}
                          isOverdue={true}
                          isPinned={pinnedIds.includes(a.id)}
                          onTogglePin={() => ds.togglePinAssignment(a.id)}
                          onToggle={() => toggleStatus(a.id, a.status)}
                          onOpenDetails={() => {
                            setOpenInEditMode(false);
                            setSelectedAssignment(a);
                          }}
                          onEdit={() => {
                            setOpenInEditMode(true);
                            setSelectedAssignment(a);
                          }}
                          onDelete={() => setDeletingAssignment(a)}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Main / Upcoming Tasks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(filter === 'active'
                ? filtered.filter((a) => !(a.status !== 'done' && new Date(a.dueDate) < now))
                : filtered
              ).map((a) => (
                <AssignmentRow
                  key={a.id}
                  assignment={a}
                  course={a.courseId ? courseMap.get(a.courseId) : undefined}
                  isOverdue={a.status !== 'done' && new Date(a.dueDate) < now}
                  isPinned={pinnedIds.includes(a.id)}
                  onTogglePin={() => ds.togglePinAssignment(a.id)}
                  onToggle={() => toggleStatus(a.id, a.status)}
                  onOpenDetails={() => {
                    setOpenInEditMode(false);
                    setSelectedAssignment(a);
                  }}
                  onEdit={() => {
                    setOpenInEditMode(true);
                    setSelectedAssignment(a);
                  }}
                  onDelete={() => setDeletingAssignment(a)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <AddAssignmentModal isOpen={showAdd} onClose={() => setShowAdd(false)} />

      {/* Details & Edit Modal */}
      <AssignmentDetailsModal
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        openInEditMode={openInEditMode}
        onClose={() => {
          setSelectedAssignment(null);
          setOpenInEditMode(false);
        }}
      />

      {/* Confirm Delete Assignment Modal */}
      <ConfirmModal
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        onConfirm={handleDeleteConfirm}
        title={lang === 'id' ? 'Hapus tugas?' : 'Delete assignment?'}
        message={
          lang === 'id'
            ? `Apakah kamu yakin ingin menghapus tugas "${deletingAssignment?.title}"? Tindakan ini dapat diurungkan sesaat.`
            : `Are you sure you want to delete "${deletingAssignment?.title}"? You can undo this action briefly.`
        }
        confirmText={lang === 'id' ? 'Hapus tugas' : 'Delete assignment'}
        cancelText={lang === 'id' ? 'Batal' : 'Cancel'}
        variant="danger"
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
  onDelete,
}: {
  assignment: Assignment;
  course?: { code: string; name: string; color: string };
  isOverdue: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onToggle: () => void;
  onOpenDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lang = useLanguage();
  const now = new Date();
  const countdown = formatDetailedCountdown(assignment.dueDate, now, lang);

  const due = assignment.dueDate.includes('T')
    ? new Date(assignment.dueDate)
    : new Date(`${assignment.dueDate}T23:59:59`);
  const dateFormatted = formatDateShort(due);
  const timeFormatted = formatTime12(
    assignment.dueDate.includes('T') ? assignment.dueDate.split('T')[1].slice(0, 5) : '23:59'
  );

  const isActuallyOverdue = assignment.status !== 'done' && isOverdue;
  const dueText = `${dateFormatted} – ${timeFormatted} (${countdown.label})`;

  return (
    <div
      className="card hover-highlight"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 14,
        background:
          assignment.status === 'done'
            ? 'var(--surface-container-low)'
            : 'var(--surface-container-lowest)',
        border: isActuallyOverdue ? '1px solid var(--error)' : '1px solid var(--outline-variant)',
        boxShadow: 'var(--shadow-xs)',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Accessible Checkbox with comfortable 36x36 tap area */}
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={assignment.status === 'done'}
        aria-label={
          assignment.status === 'done'
            ? `Mark "${assignment.title}" as incomplete`
            : `Mark "${assignment.title}" as complete`
        }
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          marginTop: -2,
          marginLeft: -2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        className="btn-ghost"
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: assignment.status === 'done' ? 'none' : '1.5px solid var(--outline)',
            background: assignment.status === 'done' ? 'var(--primary)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.12s ease, border-color 0.12s ease',
          }}
        >
          {assignment.status === 'done' && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </button>

      {/* Content — clicking opens AssignmentDetailsModal */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
        onClick={onOpenDetails}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            textDecoration: assignment.status === 'done' ? 'line-through' : 'none',
            opacity: assignment.status === 'done' ? 0.6 : 1,
            color: 'var(--on-surface)',
            marginBottom: '0.25rem',
          }}
        >
          {assignment.title}
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.375rem',
            opacity: assignment.status === 'done' ? 0.7 : 1,
          }}
        >
          {/* Due Date & Completion Badge */}
          {assignment.status === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontWeight: 500 }}>{dateFormatted}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: 9999,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  background: 'var(--primary-container, #d1e7dd)',
                  color: 'var(--on-primary-container, #0f5132)',
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {lang === 'id' ? 'Selesai' : 'Completed'}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: isActuallyOverdue ? 'var(--error)' : 'inherit',
              }}
            >
              {isActuallyOverdue ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              )}
              <span style={{ fontWeight: isActuallyOverdue ? 600 : 500 }}>{dueText}</span>
            </div>
          )}

          <span style={{ opacity: 0.4 }}>·</span>

          {/* Category / Course */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <CategoryIndicator
              shape={
                course ? 'square' : CATEGORY_MAP[assignment.category || 'other']?.shape || 'circle'
              }
              color={
                course
                  ? course.color
                  : CATEGORY_MAP[assignment.category || 'other']?.color ||
                    'var(--on-surface-variant)'
              }
              size={6}
            />
            <span style={{ fontWeight: 500 }}>
              {course
                ? course.code
                : CATEGORY_MAP[assignment.category || 'other']?.label || 'Other'}
            </span>
          </div>

          {/* Pinned badge */}
          {isPinned && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                <Pin size={11} style={{ fill: 'currentColor' }} />
                {lang === 'id' ? 'Disematkan' : 'Pinned'}
              </span>
            </>
          )}

          {/* Urgent / Due Soon Flag (Only if active) */}
          {countdown.isUrgent && !isActuallyOverdue && assignment.status !== 'done' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                style={{
                  background: 'var(--error-container)',
                  color: 'var(--on-error-container)',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  padding: '0.125rem 0.45rem',
                  borderRadius: 4,
                  letterSpacing: '0.01em',
                }}
              >
                {lang === 'id' ? 'Mendesak' : 'Urgent'}
              </span>
            </>
          )}

          {/* Priority */}
          {assignment.priority === 'high' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.125rem',
                  color: 'var(--error)',
                  fontWeight: 600,
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                {lang === 'id' ? 'Prioritas tinggi' : 'High priority'}
              </div>
            </>
          )}

          {/* Status Text (if in progress) */}
          {assignment.status === 'in-progress' && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {lang === 'id' ? 'Sedang dikerjakan' : 'In progress'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons: Pin, Edit, & Delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          type="button"
          onClick={onTogglePin}
          className="btn-ghost min-touch-target"
          style={{
            padding: '0.3rem',
            color: isPinned ? 'var(--primary)' : 'var(--on-surface-variant)',
            background: isPinned
              ? 'color-mix(in srgb, var(--primary) 12%, transparent)'
              : 'transparent',
            borderRadius: 6,
          }}
          aria-label={
            isPinned
              ? lang === 'id'
                ? 'Lepas sematan'
                : 'Unpin from sidebar'
              : lang === 'id'
                ? 'Sematkan ke sidebar'
                : 'Pin to sidebar'
          }
          title={
            isPinned
              ? lang === 'id'
                ? 'Lepas sematan dari sidebar'
                : 'Unpin from sidebar'
              : lang === 'id'
                ? 'Sematkan ke sidebar'
                : 'Pin to sidebar'
          }
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="btn-ghost min-touch-target"
          style={{ padding: '0.3rem', color: 'var(--on-surface-variant)' }}
          aria-label={lang === 'id' ? `Hapus ${assignment.title}` : `Delete ${assignment.title}`}
          title={lang === 'id' ? 'Hapus tugas' : 'Delete assignment'}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
