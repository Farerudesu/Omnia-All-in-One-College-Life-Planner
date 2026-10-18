import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthName } from '@/lib/dateUtils';
import * as ds from '@/lib/dataService';
import type { AppNotification } from '@/lib/dataService';
import type { ScheduleSearchResult } from './ScheduleHeader';

interface ScheduleDesktopHeaderProps {
  isId: boolean;
  mondayDate?: Date;
  viewMode: 'today' | 'week';
  setViewMode: (mode: 'today' | 'week') => void;
  prevWeek: () => void;
  nextWeek: () => void;
  goToToday: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: ScheduleSearchResult[];
  notifications: AppNotification[];
}

export function ScheduleDesktopHeader({
  isId,
  mondayDate,
  viewMode,
  setViewMode,
  prevWeek,
  nextWeek,
  goToToday,
  searchQuery,
  setSearchQuery,
  searchResults,
  notifications,
}: ScheduleDesktopHeaderProps) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="hidden-mobile"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 2rem',
        borderBottom: '1px solid var(--outline-variant)',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        background: 'var(--surface-container-lowest)',
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button type="button" className="btn-ghost min-touch-target" onClick={prevWeek} aria-label="Previous week">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button type="button" className="btn-ghost min-touch-target" onClick={goToToday}>
          Today
        </button>
        <button type="button" className="btn-ghost min-touch-target" onClick={nextWeek} aria-label="Next week">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <span
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.125rem',
            fontWeight: 600,
            marginLeft: '0.5rem',
          }}
        >
          {mondayDate ? `${getMonthName(mondayDate.getMonth())} ${mondayDate.getFullYear()}` : ''}
        </span>
      </div>

      {/* Universal Schedule Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <div style={{ position: 'relative' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--on-surface-variant)"
            strokeWidth="2.5"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search schedule, courses, rooms... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              fontSize: '0.8125rem',
              padding: '0.45rem 2rem 0.45rem 2rem',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
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

        {searchQuery.trim() && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              maxHeight: 340,
              overflowY: 'auto',
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-modal)',
              zIndex: 100,
              padding: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--on-surface-variant)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>
              {searchResults.length} Match{searchResults.length !== 1 ? 'es' : ''}
            </div>
            {searchResults.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                No courses or events matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={item.action}
                  style={{
                    padding: '0.5rem 0.625rem',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  className="hover-highlight"
                >
                  <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* View Switcher & Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-container)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {[
            { label: isId ? 'Hari' : 'Day', action: () => setViewMode('today'), active: viewMode === 'today' },
            { label: isId ? 'Minggu' : 'Week', action: () => setViewMode('week'), active: viewMode === 'week' },
            { label: isId ? 'Agenda' : 'Agenda', action: () => navigate('/calendar'), active: false },
          ].map((v) => (
            <button
              key={v.label}
              type="button"
              onClick={v.action}
              style={{
                padding: '0.375rem 0.875rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: v.active ? 'var(--primary)' : 'transparent',
                color: v.active ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                borderRadius: v.active ? 8 : 0,
                transition: 'background 0.15s',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn-ghost min-touch-target"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative', padding: '0.45rem', borderRadius: '50%' }}
            aria-label={isId ? 'Notifikasi' : 'Notifications'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--error)',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 320,
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-modal)',
                zIndex: 100,
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--outline-variant)', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{isId ? 'Pemberitahuan' : 'Notifications'}</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => ds.markAllNotificationsRead()}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', color: 'var(--primary)', fontWeight: 600 }}
                  >
                    {isId ? 'Tandai sudah dibaca' : 'Mark all read'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--on-surface-variant)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      <path d="M9 11l2 2 4-4" />
                    </svg>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
                      {isId ? 'Tidak ada pemberitahuan baru' : 'No new notifications'}
                    </div>
                    <div style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                      {isId ? 'Semua jadwal dan tugasmu sudah beres!' : 'You are all caught up with your classes and tasks.'}
                    </div>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        ds.markNotificationRead(n.id);
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                      }}
                      style={{
                        padding: '0.5rem 0.625rem',
                        borderRadius: 8,
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start',
                        opacity: n.read ? 0.65 : 1,
                      }}
                      className="hover-highlight"
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: n.read ? 'transparent' : 'var(--primary)',
                          marginTop: '0.375rem',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.125rem' }}>
                          <span style={{ fontWeight: n.read ? 600 : 700, fontSize: '0.8125rem', color: 'var(--on-surface)' }}>{n.title}</span>
                          <span style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)', flexShrink: 0, marginLeft: '0.5rem' }}>{n.time}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{n.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
