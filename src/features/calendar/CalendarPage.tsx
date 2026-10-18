import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/useLanguage';
import { toDateString } from '@/lib/dateUtils';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EventDetailsModal } from '@/components/EventDetailsModal';
import { AssignmentDetailsModal } from '@/components/AssignmentDetailsModal';

import type { CalendarEvent, Assignment, ClassSession, Course } from '@/types';
import type { ViewMode, QuickActionMenuState, RescheduleItemState, CalendarItem } from './types';
import { useCalendarData } from './hooks/useCalendarData';
import { CalendarToolbar } from './components/CalendarToolbar';
import { CalendarLegend } from './components/CalendarLegend';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { AgendaView } from './components/AgendaView';
import { CalendarDetailPanel } from './components/CalendarDetailPanel';
import { CalendarQuickActionMenu } from './components/CalendarQuickActionMenu';
import { CalendarAddEventModal } from './components/CalendarAddEventModal';
import { RescheduleModal } from './components/RescheduleModal';
import { ClassSessionModal } from './components/ClassSessionModal';

export function CalendarPage() {
  const lang = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    window.matchMedia('(max-width: 819px)').matches ? 'Agenda' : 'Month'
  );

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState<CalendarEvent | null>(null);
  const [openEventInEditMode, setOpenEventInEditMode] = useState(false);
  const [selectedAssignmentForModal, setSelectedAssignmentForModal] = useState<Assignment | null>(null);
  const [openAssignmentInEditMode, setOpenAssignmentInEditMode] = useState(false);
  const [selectedClassSessionForModal, setSelectedClassSessionForModal] = useState<{
    course: Course;
    session: ClassSession;
    date: Date;
  } | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<RescheduleItemState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickActionMenu, setQuickActionMenu] = useState<QuickActionMenuState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  const closeQuickActionMenu = () => {
    if (!quickActionMenu) return;
    setQuickActionMenu((prev) => (prev ? { ...prev, isExiting: true } : null));
    setTimeout(() => {
      setQuickActionMenu(null);
    }, 160);
  };

  const {
    year,
    month,
    monthGrid,
    filters,
    isGcalConnected,
    isGcalSyncing,
    handleGoogleCalendarSync,
    getItemsForDate,
    searchResults,
    agendaDates,
    weekDates,
    prevPeriod,
    nextPeriod,
    goToToday,
    toggleFilter,
  } = useCalendarData({
    lang,
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    viewMode,
    searchQuery,
  });

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : [];

  const handleItemClick = (item: CalendarItem) => {
    if (item.rawEvent) {
      setOpenEventInEditMode(false);
      setSelectedEventForModal(item.rawEvent);
    } else if (item.rawAssignment) {
      setOpenAssignmentInEditMode(false);
      setSelectedAssignmentForModal(item.rawAssignment);
    } else if (item.rawSession && item.rawCourse) {
      setSelectedClassSessionForModal({
        course: item.rawCourse,
        session: item.rawSession,
        date: selectedDate || currentDate,
      });
    } else if (item.id && item.id.startsWith('course-')) {
      navigate('/schedule');
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        prevPeriod();
      } else if (e.key === 'ArrowRight') {
        nextPeriod();
      } else if (e.key === 't' || e.key === 'T') {
        goToToday();
      } else if (e.key === 'm' || e.key === 'M') {
        setViewMode('Month');
      } else if (e.key === 'w' || e.key === 'W') {
        setViewMode('Week');
      } else if (e.key === 'd' || e.key === 'D') {
        setViewMode('Day');
      } else if (e.key === 'a' || e.key === 'A') {
        setViewMode('Agenda');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevPeriod, nextPeriod, goToToday]);

  return (
    <div className="calendar-page-container">
      {/* Top bar toolbar */}
      <CalendarToolbar
        lang={lang}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        year={year}
        month={month}
        prevPeriod={prevPeriod}
        nextPeriod={nextPeriod}
        goToToday={goToToday}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isGcalSyncing={isGcalSyncing}
        isGcalConnected={isGcalConnected}
        handleGoogleCalendarSync={handleGoogleCalendarSync}
        handleItemClick={handleItemClick}
      />

      {/* Main Container */}
      <div className="calendar-main-layout" style={{ display: 'flex' }}>
        <div className="page-content" style={{ flex: 1, minWidth: 0 }}>
          <CalendarLegend
            lang={lang}
            viewMode={viewMode}
            selectedDate={selectedDate}
            weekStartDate={weekDates[0]}
            filters={filters}
            toggleFilter={toggleFilter}
          />

          {viewMode === 'Month' && (
            <MonthView
              lang={lang}
              month={month}
              monthGrid={monthGrid}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              setViewMode={setViewMode}
              searchQuery={searchQuery}
              getItemsForDate={getItemsForDate}
              handleItemClick={handleItemClick}
              detailPanelRef={detailPanelRef}
              quickActionMenu={quickActionMenu}
              setQuickActionMenu={setQuickActionMenu}
              closeQuickActionMenu={closeQuickActionMenu}
            />
          )}

          {viewMode === 'Week' && (
            <WeekView
              lang={lang}
              weekDates={weekDates}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              getItemsForDate={getItemsForDate}
              handleItemClick={handleItemClick}
            />
          )}

          {viewMode === 'Day' && (
            <DayView
              lang={lang}
              selectedDate={selectedDate}
              selectedItems={selectedItems}
              onOpenAddEvent={() => setShowAddEvent(true)}
              handleItemClick={handleItemClick}
            />
          )}

          {viewMode === 'Agenda' && (
            <AgendaView
              lang={lang}
              agendaDates={agendaDates}
              handleItemClick={handleItemClick}
            />
          )}
        </div>

        {/* Selected date side panel (desktop only for Month mode) */}
        {viewMode === 'Month' && selectedDate && (
          <CalendarDetailPanel
            lang={lang}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedItems={selectedItems}
            detailPanelRef={detailPanelRef}
            handleItemClick={handleItemClick}
          />
        )}
      </div>

      {/* Quick Action Context Menu Portal */}
      <CalendarQuickActionMenu
        lang={lang}
        quickActionMenu={quickActionMenu}
        closeQuickActionMenu={closeQuickActionMenu}
        setOpenEventInEditMode={setOpenEventInEditMode}
        setSelectedEventForModal={setSelectedEventForModal}
        setOpenAssignmentInEditMode={setOpenAssignmentInEditMode}
        setSelectedAssignmentForModal={setSelectedAssignmentForModal}
        setSelectedClassSessionForModal={setSelectedClassSessionForModal}
        setRescheduleItem={setRescheduleItem}
        setConfirmDialog={setConfirmDialog}
        showToast={showToast}
      />

      {/* Modals */}
      <CalendarAddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        defaultDate={selectedDate ? toDateString(selectedDate) : toDateString(new Date())}
      />

      <EventDetailsModal
        event={selectedEventForModal}
        isOpen={!!selectedEventForModal}
        openInEditMode={openEventInEditMode}
        onClose={() => {
          setSelectedEventForModal(null);
          setOpenEventInEditMode(false);
        }}
      />

      <AssignmentDetailsModal
        assignment={selectedAssignmentForModal}
        isOpen={!!selectedAssignmentForModal}
        openInEditMode={openAssignmentInEditMode}
        onClose={() => {
          setSelectedAssignmentForModal(null);
          setOpenAssignmentInEditMode(false);
        }}
      />

      <RescheduleModal
        item={rescheduleItem}
        isOpen={!!rescheduleItem}
        onClose={() => setRescheduleItem(null)}
      />

      <ClassSessionModal
        data={selectedClassSessionForModal}
        isOpen={!!selectedClassSessionForModal}
        onClose={() => setSelectedClassSessionForModal(null)}
      />

      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={async () => {
            const action = confirmDialog.onConfirm;
            setConfirmDialog(null);
            await action();
          }}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={lang === 'id' ? 'Hapus' : 'Delete'}
          cancelText={lang === 'id' ? 'Batal' : 'Cancel'}
          danger
        />
      )}
    </div>
  );
}

export default CalendarPage;
