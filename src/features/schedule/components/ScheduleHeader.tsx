import React from 'react';
import type { AppNotification } from '@/lib/dataService';
import { ScheduleDesktopHeader } from './ScheduleDesktopHeader';
import { ScheduleMobileHeader } from './ScheduleMobileHeader';
import { ScheduleControlsBar } from './ScheduleControlsBar';

export interface ScheduleSearchResult {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

interface ScheduleHeaderProps {
  lang: 'id' | 'en';
  currentDate: Date;
  mondayDate?: Date;
  viewMode: 'today' | 'week';
  setViewMode: (mode: 'today' | 'week') => void;
  prevPeriod: () => void;
  nextPeriod: () => void;
  prevWeek: () => void;
  nextWeek: () => void;
  goToToday: () => void;
  scrollToCurrentTime: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: ScheduleSearchResult[];
  notifications: AppNotification[];
  onOpenAddClass: () => void;
  onOpenAddEvent: () => void;
  onOpenShare: () => void;
}

export function ScheduleHeader({
  lang,
  currentDate,
  mondayDate,
  viewMode,
  setViewMode,
  prevPeriod,
  nextPeriod,
  prevWeek,
  nextWeek,
  goToToday,
  scrollToCurrentTime,
  searchQuery,
  setSearchQuery,
  searchResults,
  notifications,
  onOpenAddClass,
  onOpenAddEvent,
  onOpenShare,
}: ScheduleHeaderProps) {
  const isId = lang === 'id';

  return (
    <>
      <ScheduleDesktopHeader
        isId={isId}
        mondayDate={mondayDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        goToToday={goToToday}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        notifications={notifications}
      />

      <ScheduleMobileHeader
        lang={lang}
        currentDate={currentDate}
        mondayDate={mondayDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        prevPeriod={prevPeriod}
        nextPeriod={nextPeriod}
        goToToday={goToToday}
        onOpenAddClass={onOpenAddClass}
        onOpenShare={onOpenShare}
      />

      <ScheduleControlsBar
        lang={lang}
        currentDate={currentDate}
        mondayDate={mondayDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        scrollToCurrentTime={scrollToCurrentTime}
        onOpenAddClass={onOpenAddClass}
        onOpenAddEvent={onOpenAddEvent}
        onOpenShare={onOpenShare}
      />
    </>
  );
}
