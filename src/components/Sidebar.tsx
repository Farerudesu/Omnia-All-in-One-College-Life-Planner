import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { CategoryIndicator } from './CategoryIndicator';
import { OmniaLogo } from './OmniaLogo';
import { PanelLeft, Plus, Calendar, CheckSquare, Clock, DollarSign, Settings, Eye, EyeOff, Search, LogOut, Sparkles } from 'lucide-react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import type { CategoryKey } from '../lib/dataService';
import { Modal } from './Modal';
import type { EventType } from '../types';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/useLanguage';
import { translations } from '../lib/i18n';
import { formatDateShort, formatTime12 } from '../lib/dateUtils';

const categories = [
  { key: 'classes' as CategoryKey, label: 'Classes', shape: 'square' as const, color: 'var(--classes)' },
  { key: 'exams' as CategoryKey, label: 'Exams', shape: 'diamond' as const, color: 'var(--exams)' },
  { key: 'deadlines' as CategoryKey, label: 'Deadlines', shape: 'outline-square' as const, color: 'var(--deadlines)' },
  { key: 'personal' as CategoryKey, label: 'Personal', shape: 'circle' as const, color: 'var(--personal)' },
];

export function Sidebar({ isCollapsed, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const lang = useLanguage();
  const t = translations[lang].nav;
  const isScheduleOrCalendar = location.pathname.startsWith('/schedule') || location.pathname.startsWith('/calendar');

  const navItems = [
    { to: '/schedule', label: t.schedule, icon: Clock },
    { to: '/assignments', label: t.assignments, icon: CheckSquare },
    { to: '/calendar', label: t.calendar, icon: Calendar },
    { to: '/finance', label: t.finance, icon: DollarSign },
    { to: '/ask-omni', label: t.askOmni, icon: Sparkles },
    { to: '/settings', label: t.settings, icon: Settings },
  ];

  const events = useData(ds.getEvents);
  const assignments = useData(ds.getAssignments);
  const categoryVisibility = useData(ds.getCategoryVisibility);
  const profile = useData(ds.getProfile);
  const settings = useData(ds.getSettings);
  const { user, signOut } = useAuth();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const displayName = profile?.fullName || user?.email?.split('@')[0] || 'Omnia account';
  const displayEmail = profile?.universityEmail || user?.email || '';
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfile]);

  const upcomingEvents = events
    .filter(e => new Date(e.date + 'T' + (e.startTime || '00:00')) >= new Date())
    .sort((a, b) => new Date(a.date + 'T' + (a.startTime || '00:00')).getTime() - new Date(b.date + 'T' + (b.startTime || '00:00')).getTime())
    .slice(0, 2);

  const pinnedAssignments = assignments
    .filter(a => a.status !== 'done')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 1);

  return (
    <>
      <aside
        className="app-sidebar"
        aria-label="Main navigation sidebar"
        style={{ overflowX: 'hidden' }}
      >
        {/* Brand and sidebar controls */}
        <div style={{
          padding: '1rem 0.875rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '0.625rem',
          borderBottom: '1px solid var(--outline-variant)',
        }}>
          <button
            className="btn-ghost"
            style={{ width: 34, height: 34, padding: 0, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            onClick={onToggle}
          >
            <PanelLeft size={18} color="var(--on-surface-variant)" aria-hidden="true" />
          </button>

          {!isCollapsed && (
            <NavLink
              to="/schedule"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--on-surface)',
                letterSpacing: '-0.02em',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', color: 'var(--primary)' }}>
                <OmniaLogo size={28} />
              </span>
              <span>Omnia</span>
            </NavLink>
          )}
        </div>

        {/* Primary Action Button: Active & Functional (hidden on schedule/calendar to avoid redundant add buttons) */}
        {!isScheduleOrCalendar && (
          <div style={{ padding: '0.875rem 0.875rem 0.5rem', display: 'flex', justifyContent: 'center' }}>
            {isCollapsed ? (
              <button
                className="btn-primary"
                style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}
                aria-label={lang === 'id' ? 'Tambah acara' : 'Create event'}
                onClick={() => setShowQuickAdd(true)}
              >
                <Plus size={18} />
              </button>
            ) : (
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', borderRadius: 8 }}
                onClick={() => setShowQuickAdd(true)}
              >
                <Plus size={16} />
                <span>{lang === 'id' ? 'Tambah acara' : 'Create event'}</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation list */}
        <nav style={{ padding: '0.5rem 0.625rem', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: '0.75rem',
                  padding: isCollapsed ? '0.625rem' : '0.5625rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                  background: isActive ? 'var(--surface-container)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                })}
              >
                <Icon size={18} />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {!isCollapsed && (
          <>
            {/* Calendars / Categories */}
            <div style={{
              padding: '1rem 0.875rem 0.75rem',
              borderTop: '1px solid var(--outline-variant)',
              marginTop: '0.5rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                padding: '0 0.25rem',
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                }}>
                  {lang === 'id' ? 'Kalender' : 'Calendars'}
                </span>
              </div>
              {categories.map((cat) => {
                const isVisible = categoryVisibility[cat.key] !== false;
                const catLabel = cat.key === 'classes'
                  ? (lang === 'id' ? 'Kelas' : 'Classes')
                  : cat.key === 'exams'
                  ? (lang === 'id' ? 'Ujian' : 'Exams')
                  : cat.key === 'deadlines'
                  ? (lang === 'id' ? 'Tenggat' : 'Deadlines')
                  : (lang === 'id' ? 'Pribadi' : 'Personal');
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => ds.toggleCategoryVisibility(cat.key)}
                    title={isVisible ? (lang === 'id' ? `Sembunyikan ${catLabel}` : `Hide ${catLabel}`) : (lang === 'id' ? `Tampilkan ${catLabel}` : `Show ${catLabel}`)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.375rem 0.5rem',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      color: isVisible ? 'var(--on-surface)' : 'var(--outline)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease, opacity 0.15s ease',
                      opacity: isVisible ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-container)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <CategoryIndicator shape={cat.shape} color={cat.color} size={8} />
                    <span style={{
                      flex: 1,
                      textDecoration: isVisible ? 'none' : 'line-through',
                      fontWeight: isVisible ? 500 : 400,
                    }}>
                      {catLabel}
                    </span>
                    {isVisible ? (
                      <Eye size={14} color="var(--outline)" />
                    ) : (
                      <EyeOff size={14} color="var(--outline)" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Upcoming & Pinned Feed (Interactive, not dead UI) */}
            <div style={{
              padding: '0.875rem',
              borderTop: '1px solid var(--outline-variant)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                padding: '0 0.25rem',
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                }}>
                  {lang === 'id' ? 'Mendatang & Disematkan' : 'Upcoming & Pinned'}
                </span>
              </div>

              {upcomingEvents.length > 0 ? upcomingEvents.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => navigate('/schedule')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate('/schedule'); }}
                  style={{
                    padding: '0.5rem 0.625rem',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 8,
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}>
                      {lang === 'id' ? 'Selanjutnya' : 'Next up'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.title}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {formatDateShort(new Date(ev.date))}{ev.startTime ? ` · ${formatTime12(ev.startTime)}` : ''}
                  </div>
                </div>
              )) : (
                <div style={{ padding: '0.75rem 0.5rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 8, border: '1px dashed var(--outline-variant)', marginBottom: '0.5rem' }}>
                  <Calendar size={18} style={{ color: 'var(--on-surface-variant)', opacity: 0.6, margin: '0 auto 0.25rem', display: 'block' }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.375rem' }}>
                    {lang === 'id' ? 'Belum ada acara mendatang' : 'No upcoming events'}
                  </div>
                  <button
                    onClick={() => setShowQuickAdd(true)}
                    className="btn-ghost"
                    style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', color: 'var(--primary)', fontWeight: 600, width: '100%', justifyContent: 'center' }}
                  >
                    + {lang === 'id' ? 'Tambah acara' : 'Add event'}
                  </button>
                </div>
              )}

              {pinnedAssignments.length > 0 && pinnedAssignments.map(a => (
                <div
                  key={a.id}
                  onClick={() => navigate('/assignments')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate('/assignments'); }}
                  style={{
                    padding: '0.5rem 0.625rem',
                    background: 'var(--surface-container-lowest)',
                    border: '1px solid var(--outline-variant)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--exams)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}>
                      {lang === 'id' ? 'Tugas disematkan' : 'Pinned task'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.title}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'id' ? 'Tenggat ' : 'Due '}{formatDateShort(new Date(a.dueDate))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* User profile section */}
        <div ref={profileRef} style={{ position: 'relative', marginTop: 'auto' }}>
          <div
            onClick={() => setShowProfile(!showProfile)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setShowProfile(!showProfile); }}
            style={{
              padding: '0.75rem 0.875rem',
              borderTop: '1px solid var(--outline-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              cursor: 'pointer',
              background: showProfile ? 'var(--surface-container)' : 'var(--surface-container-low)',
              transition: 'background 0.15s',
            }}
            title="Account menu"
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--on-primary)',
              fontWeight: 700, fontSize: '0.8125rem',
              flexShrink: 0,
            }}>
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
            </div>
            {!isCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                  {settings.termName || 'Personal planner'}
                </div>
              </div>
            )}
          </div>

          {showProfile && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '0.875rem',
                width: 240,
                background: 'var(--surface-container-lowest)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-modal)',
                zIndex: 100,
                padding: '1rem',
              }}
            >
              <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--outline-variant)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>{displayName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{displayEmail}</div>
                {settings.termName && <div style={{ fontSize: '0.6875rem', marginTop: '0.25rem', color: 'var(--primary)', fontWeight: 600 }}>{settings.termName}</div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/settings');
                    setShowProfile(false);
                  }}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem', padding: '0.5rem', gap: '0.5rem' }}
                >
                  <Settings size={16} style={{ color: 'var(--on-surface-variant)' }} /> Settings & Preferences
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-command-palette'));
                    setShowProfile(false);
                  }}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem', padding: '0.5rem', gap: '0.5rem' }}
                >
                  <Search size={16} style={{ color: 'var(--on-surface-variant)' }} /> Quick Search (Ctrl+K)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    void signOut().catch((error: unknown) => console.error('Unable to sign out:', error));
                  }}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8125rem', padding: '0.5rem', color: 'var(--error)', gap: '0.5rem' }}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddModal isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
      )}
    </>
  );
}

// ─── Quick Add Event/Task Modal ───
function QuickAddModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const lang = useLanguage();
  const [tab, setTab] = useState<'event' | 'task'>('event');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState<EventType>('personal');

  const handleSave = () => {
    if (!title.trim()) return;
    if (tab === 'event') {
      ds.addEvent({
        title: title.trim(),
        date,
        startTime: time || undefined,
        type,
      });
    } else {
      ds.addAssignment({
        title: title.trim(),
        courseId: 'course-1',
        dueDate: `${date}T${time || '23:59'}:00`,
        status: 'not-started',
        priority: 'medium',
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang === 'id' ? 'Buat Baru' : 'Create New'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div role="group" aria-label="Item type" style={{ display: 'flex', background: 'var(--surface-container-low)', padding: 4, borderRadius: 8, gap: 4 }}>
          <button
            type="button"
            className={tab === 'event' ? 'chip active' : 'chip'}
            aria-pressed={tab === 'event'}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setTab('event')}
          >
            {lang === 'id' ? 'Acara Kalender' : 'Calendar Event'}
          </button>
          <button
            type="button"
            className={tab === 'task' ? 'chip active' : 'chip'}
            aria-pressed={tab === 'task'}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setTab('task')}
          >
            {lang === 'id' ? 'Tugas Kuliah' : 'Assignment / Task'}
          </button>
        </div>

        <div>
          <label htmlFor="quick-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Judul' : 'Title'}
          </label>
          <input
            id="quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === 'id' ? (tab === 'event' ? 'cth. Belajar Bersama' : 'cth. Tugas Mandiri 3') : (tab === 'event' ? 'e.g. Study Group Session' : 'e.g. Problem Set 3')}
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        {tab === 'event' && (
          <div>
            <div id="quick-category-label" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Kategori' : 'Category'}
            </div>
            <div role="group" aria-labelledby="quick-category-label" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {(['exam', 'deadline', 'personal', 'other'] as EventType[]).map((t) => {
                const chipLabel = lang === 'id'
                  ? (t === 'exam' ? 'Ujian' : t === 'deadline' ? 'Tenggat' : t === 'personal' ? 'Pribadi' : 'Lainnya')
                  : (t.charAt(0).toUpperCase() + t.slice(1));
                return (
                  <button
                    key={t}
                    type="button"
                    className={type === t ? 'chip active' : 'chip'}
                    aria-pressed={type === t}
                    onClick={() => setType(t)}
                  >
                    {chipLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="quick-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Tanggal' : 'Date'}
            </label>
            <input
              id="quick-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label htmlFor="quick-time" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Waktu' : 'Time'}
            </label>
            <input
              id="quick-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose}>
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={!title.trim()}>
            {lang === 'id' ? 'Simpan' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
