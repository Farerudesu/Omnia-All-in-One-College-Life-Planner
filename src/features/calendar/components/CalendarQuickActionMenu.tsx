import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pin, PinOff } from 'lucide-react';
import { formatDateLong, formatTime12, toDateString } from '@/lib/dateUtils';
import { CategoryIndicator } from '@/components/CategoryIndicator';
import * as ds from '@/lib/dataService';
import { exportItemToICS } from '../utils/calendarUtils';
import type { QuickActionMenuState, RescheduleItemState } from '../types';
import type { CalendarEvent, Assignment, ClassSession, Course } from '@/types';

interface CalendarQuickActionMenuProps {
  lang: 'id' | 'en';
  quickActionMenu: QuickActionMenuState | null;
  closeQuickActionMenu: () => void;
  setOpenEventInEditMode: (v: boolean) => void;
  setSelectedEventForModal: (e: CalendarEvent | null) => void;
  setOpenAssignmentInEditMode: (v: boolean) => void;
  setSelectedAssignmentForModal: (a: Assignment | null) => void;
  setSelectedClassSessionForModal: (
    v: { course: Course; session: ClassSession; date: Date } | null
  ) => void;
  setRescheduleItem: (v: RescheduleItemState | null) => void;
  setConfirmDialog: (
    v: {
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
    } | null
  ) => void;
  showToast: (opts: {
    message: string;
    type?: 'success' | 'error' | 'info';
    action?: { label: string; onClick: () => void };
  }) => void;
}

export function CalendarQuickActionMenu({
  lang,
  quickActionMenu,
  closeQuickActionMenu,
  setOpenEventInEditMode,
  setSelectedEventForModal,
  setOpenAssignmentInEditMode,
  setSelectedAssignmentForModal,
  setSelectedClassSessionForModal,
  setRescheduleItem,
  setConfirmDialog,
  showToast,
}: CalendarQuickActionMenuProps) {
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const isId = lang === 'id';

  useEffect(() => {
    if (contextMenuRef.current && quickActionMenu && !quickActionMenu.isExiting) {
      const menu = contextMenuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = quickActionMenu.originY + 6;
      let left = quickActionMenu.originX + 6;
      if (left + rect.width > viewportWidth - 12)
        left = Math.max(12, quickActionMenu.originX - rect.width - 6);
      if (top + rect.height > viewportHeight - 12)
        top = Math.max(12, viewportHeight - rect.height - 12);

      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.transformOrigin = `${quickActionMenu.originX - left}px ${quickActionMenu.originY - top}px`;
    }
  }, [quickActionMenu]);

  if (!quickActionMenu) return null;

  const item = quickActionMenu.item;
  const isAssign = !!item.rawAssignment || item.id.startsWith('assign-');
  const assignId = item.rawAssignment?.id || item.id.replace('assign-', '');
  const eventId = item.rawEvent?.id;
  const isPinned = isAssign
    ? ds.isAssignmentPinned(assignId)
    : eventId
      ? ds.isEventPinned(eventId)
      : false;

  const handleDelete = () => {
    closeQuickActionMenu();
    if (item.id.startsWith('assign-') || item.rawAssignment) {
      const aId = item.rawAssignment?.id || item.id.replace('assign-', '');
      const rawAssign = item.rawAssignment;
      setConfirmDialog({
        isOpen: true,
        title: isId ? 'Hapus Tugas?' : 'Delete Task?',
        message: isId
          ? `Apakah kamu yakin ingin menghapus tugas "${item.title}"?`
          : `Are you sure you want to delete task "${item.title}"?`,
        onConfirm: async () => {
          await ds.deleteAssignment(aId);
          showToast({
            message: isId ? `Tugas "${item.title}" dihapus` : `Task "${item.title}" deleted`,
            type: 'success',
            action: rawAssign
              ? {
                  label: isId ? 'Urungkan' : 'Undo',
                  onClick: async () => {
                    await ds.restoreAssignment(rawAssign);
                  },
                }
              : undefined,
          });
        },
      });
    } else if (item.rawEvent) {
      const rawEv = item.rawEvent;
      setConfirmDialog({
        isOpen: true,
        title: isId ? 'Hapus Acara?' : 'Delete Event?',
        message: isId
          ? `Apakah kamu yakin ingin menghapus acara "${item.title}"?`
          : `Are you sure you want to delete event "${item.title}"?`,
        onConfirm: async () => {
          await ds.deleteEvent(rawEv.id);
          showToast({
            message: isId ? `Acara "${item.title}" dihapus` : `Event "${item.title}" deleted`,
            type: 'success',
            action: {
              label: isId ? 'Urungkan' : 'Undo',
              onClick: async () => {
                await ds.restoreEvent(rawEv);
              },
            },
          });
        },
      });
    } else if (item.rawSession) {
      const dStr = toDateString(quickActionMenu.date);
      setConfirmDialog({
        isOpen: true,
        title: isId ? 'Batalkan Pertemuan Kelas?' : 'Cancel Class Session?',
        message: isId
          ? `Batalkan sesi kuliah "${item.title}" pada ${dStr}?`
          : `Cancel class session "${item.title}" on ${dStr}?`,
        onConfirm: async () => {
          await ds.addSessionException({
            classSessionId: item.rawSession!.id,
            date: dStr,
            type: 'cancelled',
          });
          showToast({
            message: isId
              ? 'Sesi kelas dibatalkan untuk hari ini'
              : 'Class session cancelled for today',
            type: 'success',
          });
        },
      });
    }
  };

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 ${quickActionMenu.isExiting ? 'context-scrim-exit' : 'context-scrim-enter'}`}
        onClick={(e) => {
          e.stopPropagation();
          closeQuickActionMenu();
        }}
      />
      <div
        ref={contextMenuRef}
        className={`fixed z-50 w-64 apple-context-menu flex flex-col cursor-default ${quickActionMenu.isExiting ? 'context-menu-exit' : 'context-menu-enter'}`}
        style={{ top: quickActionMenu.originY + 6, left: quickActionMenu.originX + 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="context-item apple-context-menu-header">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: 'var(--on-surface)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.title}
            </div>
            <span
              className="apple-context-badge"
              style={{
                background: 'color-mix(in srgb, var(--on-surface) 6%, transparent)',
                color: 'var(--on-surface-variant)',
              }}
            >
              {item.type === 'classes'
                ? isId
                  ? 'Kelas'
                  : 'Class'
                : item.type === 'exam'
                  ? isId
                    ? 'Ujian'
                    : 'Exam'
                  : item.type === 'deadline'
                    ? isId
                      ? 'Tugas'
                      : 'Task'
                    : item.type === 'personal'
                      ? isId
                        ? 'Pribadi'
                        : 'Personal'
                      : item.type}
            </span>
          </div>
          <div
            style={{
              fontSize: '0.6875rem',
              color: 'var(--on-surface-variant)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatDateLong(quickActionMenu.date)} {item.time && `· ${formatTime12(item.time)}`}
          </div>
        </div>

        <div
          style={{
            padding: '0.3125rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem',
          }}
        >
          {/* Pin */}
          <button
            className="apple-context-item context-item"
            onClick={(e) => {
              e.stopPropagation();
              if (isAssign) ds.togglePinAssignment(assignId);
              else if (eventId) ds.togglePinEvent(eventId);
              closeQuickActionMenu();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isPinned ? <PinOff size={14} color="var(--primary)" /> : <Pin size={14} />}
              <span>
                {isPinned
                  ? isId
                    ? 'Lepas Sematan Sidebar'
                    : 'Unpin from Sidebar'
                  : isId
                    ? 'Sematkan ke Sidebar'
                    : 'Pin to Sidebar'}
              </span>
            </div>
          </button>

          {/* Edit */}
          <button
            className="apple-context-item context-item"
            onClick={(e) => {
              e.stopPropagation();
              closeQuickActionMenu();
              if (item.rawEvent) {
                setOpenEventInEditMode(true);
                setSelectedEventForModal(item.rawEvent);
              } else if (item.rawAssignment) {
                setOpenAssignmentInEditMode(true);
                setSelectedAssignmentForModal(item.rawAssignment);
              } else if (item.rawSession && item.rawCourse) {
                setSelectedClassSessionForModal({
                  course: item.rawCourse,
                  session: item.rawSession,
                  date: quickActionMenu.date,
                });
              }
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
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{isId ? 'Ubah Rincian' : 'Edit Details'}</span>
            </div>
          </button>

          {/* Reschedule */}
          <button
            className="apple-context-item context-item"
            onClick={(e) => {
              e.stopPropagation();
              setRescheduleItem({
                id: item.id,
                title: item.title,
                type: item.rawAssignment ? 'assignment' : 'event',
                date: toDateString(quickActionMenu.date),
                time: item.time || '10:00',
                rawEvent: item.rawEvent,
                rawAssignment: item.rawAssignment,
              });
              closeQuickActionMenu();
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
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{isId ? 'Pindahkan Jadwal' : 'Reschedule / Move'}</span>
            </div>
          </button>

          {/* Duplicate */}
          <button
            className="apple-context-item context-item"
            onClick={(e) => {
              e.stopPropagation();
              if (item.rawEvent) {
                ds.addEvent({
                  ...item.rawEvent,
                  title: `${item.rawEvent.title} (${isId ? 'Salinan' : 'Copy'})`,
                });
              } else if (item.rawAssignment) {
                const { id: _unusedId, ...rest } = item.rawAssignment;
                ds.addAssignment({
                  ...rest,
                  title: `${item.rawAssignment.title} (${isId ? 'Salinan' : 'Copy'})`,
                });
              }
              closeQuickActionMenu();
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
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{isId ? 'Duplikat Kegiatan' : 'Duplicate Item'}</span>
            </div>
          </button>

          <div className="apple-context-divider" />

          {/* Category */}
          <div
            className="context-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.375rem 0.625rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--on-surface)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              {isId ? 'Kategori' : 'Category'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <button
                type="button"
                title={isId ? 'Kelas' : 'Classes'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'class' });
                  else if (item.rawAssignment)
                    ds.updateAssignment(item.rawAssignment.id, { category: 'classes' });
                  closeQuickActionMenu();
                }}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
                className="hover-highlight"
              >
                <CategoryIndicator shape="square" color="var(--classes)" size={9} />
              </button>
              <button
                type="button"
                title={isId ? 'Ujian' : 'Exam'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'exam' });
                  else if (item.rawAssignment)
                    ds.updateAssignment(item.rawAssignment.id, { category: 'exam' });
                  closeQuickActionMenu();
                }}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
                className="hover-highlight"
              >
                <CategoryIndicator shape="diamond" color="var(--exams)" size={9} />
              </button>
              <button
                type="button"
                title={isId ? 'Tenggat' : 'Deadline'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'deadline' });
                  else if (item.rawAssignment)
                    ds.updateAssignment(item.rawAssignment.id, { category: 'deadline' });
                  closeQuickActionMenu();
                }}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
                className="hover-highlight"
              >
                <CategoryIndicator shape="outline-square" color="var(--deadlines)" size={9} />
              </button>
              <button
                type="button"
                title={isId ? 'Pribadi' : 'Personal'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.rawEvent) ds.updateEvent(item.rawEvent.id, { type: 'personal' });
                  else if (item.rawAssignment)
                    ds.updateAssignment(item.rawAssignment.id, { category: 'personal' });
                  closeQuickActionMenu();
                }}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
                className="hover-highlight"
              >
                <CategoryIndicator shape="circle" color="var(--personal)" size={9} />
              </button>
            </div>
          </div>

          {/* Export to ICS */}
          <button
            className="apple-context-item context-item"
            onClick={(e) => {
              e.stopPropagation();
              closeQuickActionMenu();
              exportItemToICS(item, quickActionMenu.date);
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
                style={{ color: 'var(--on-surface-variant)' }}
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>{isId ? 'Ekspor Kalender (.ics)' : 'Share / Export .ics'}</span>
            </div>
          </button>

          <div className="apple-context-divider" />

          {/* Delete */}
          <button
            className="apple-context-item apple-context-item--danger context-item"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
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
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>
                {item.rawSession
                  ? isId
                    ? 'Batalkan Hari Ini'
                    : 'Cancel for Today'
                  : isId
                    ? 'Hapus'
                    : 'Delete'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
