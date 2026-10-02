import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Calendar, ClipboardList, CreditCard, Settings, Plus, Pin, Clipboard, GraduationCap, AlertTriangle, Hourglass, DollarSign, Search } from 'lucide-react';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import { formatCurrency } from '../lib/currency';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddClass?: () => void;
  onOpenAddEvent?: () => void;
  onOpenAddAssignment?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Pages' | 'Courses' | 'Deliverables' | 'Events' | 'Finance' | 'Actions';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenAddClass,
  onOpenAddEvent,
  onOpenAddAssignment,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const courses = useData(ds.getCourses);
  const assignments = useData(ds.getAssignments);
  const events = useData(ds.getEvents);
  const transactions = useData(ds.getTransactions);
  const settings = useData(ds.getSettings);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteItem[] = [];

    // Navigation items
    const navItems: PaletteItem[] = [
      {
        id: 'nav-schedule',
        category: 'Pages',
        title: 'Timetable & Schedule',
        subtitle: 'View weekly grid, class locations and study gaps',
        icon: <CalendarDays size={18} />,
        action: () => { navigate('/schedule'); onClose(); },
      },
      {
        id: 'nav-calendar',
        category: 'Pages',
        title: 'Academic Calendar',
        subtitle: 'Monthly overview, exam dates and deadlines',
        icon: <Calendar size={18} />,
        action: () => { navigate('/calendar'); onClose(); },
      },
      {
        id: 'nav-assignments',
        category: 'Pages',
        title: 'Assignments & Deliverables',
        subtitle: 'Problem sets, projects, and submission tracker',
        icon: <ClipboardList size={18} />,
        action: () => { navigate('/assignments'); onClose(); },
      },
      {
        id: 'nav-finance',
        category: 'Pages',
        title: 'Finance & Ledger',
        subtitle: 'Student budget pacing and expenses',
        icon: <CreditCard size={18} />,
        action: () => { navigate('/finance'); onClose(); },
      },
      {
        id: 'nav-settings',
        category: 'Pages',
        title: 'Settings & Curriculum',
        subtitle: 'Account preferences, themes, data export',
        icon: <Settings size={18} />,
        action: () => { navigate('/settings'); onClose(); },
      },
    ];

    // Quick Actions
    const actionItems: PaletteItem[] = [
      {
        id: 'act-add-class',
        category: 'Actions',
        title: 'Add New Course / Session',
        subtitle: 'Enroll a new course into timetable',
        icon: <Plus size={18} />,
        action: () => {
          navigate('/schedule');
          onClose();
          if (onOpenAddClass) onOpenAddClass();
        },
      },
      {
        id: 'act-add-event',
        category: 'Actions',
        title: 'Add New Calendar Event',
        subtitle: 'Schedule an exam, deadline, or reminder',
        icon: <Pin size={18} />,
        action: () => {
          onClose();
          if (onOpenAddEvent) onOpenAddEvent();
          else navigate('/calendar');
        },
      },
      {
        id: 'act-add-assignment',
        category: 'Actions',
        title: 'Add New Deliverable / Task',
        subtitle: 'Track a new homework assignment',
        icon: <Clipboard size={18} />,
        action: () => {
          navigate('/assignments');
          onClose();
          if (onOpenAddAssignment) onOpenAddAssignment();
        },
      },
    ];

    if (!q) {
      // Default: show pages and quick actions
      return [...navItems, ...actionItems];
    }

    // Filter pages
    navItems.forEach((item) => {
      if (item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)) {
        result.push(item);
      }
    });

    // Courses
    courses.forEach((c) => {
      if (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.professor?.toLowerCase().includes(q) ||
        c.room?.toLowerCase().includes(q)
      ) {
        result.push({
          id: `course-${c.id}`,
          category: 'Courses',
          title: `${c.code} – ${c.name}`,
          subtitle: `Prof. ${c.professor || 'Staff'} · Room ${c.room || 'TBA'} · ${c.credits} Credits`,
          icon: <GraduationCap size={18} />,
          action: () => { navigate('/schedule'); onClose(); },
        });
      }
    });

    // Deliverables
    assignments.forEach((a) => {
      if (a.title.toLowerCase().includes(q) || a.notes?.toLowerCase().includes(q)) {
        result.push({
          id: `assignment-${a.id}`,
          category: 'Deliverables',
          title: a.title,
          subtitle: `Due ${new Date(a.dueDate).toLocaleDateString()} · ${a.priority} priority · ${a.status}`,
          icon: <ClipboardList size={18} />,
          action: () => { navigate('/assignments'); onClose(); },
        });
      }
    });

    // Events
    events.forEach((ev) => {
      if (ev.title.toLowerCase().includes(q) || ev.notes?.toLowerCase().includes(q)) {
        result.push({
          id: `event-${ev.id}`,
          category: 'Events',
          title: ev.title,
          subtitle: `${ev.date} ${ev.startTime ? `at ${ev.startTime}` : ''} · ${ev.type.toUpperCase()}`,
          icon: ev.type === 'exam' ? <AlertTriangle size={18} /> : ev.type === 'deadline' ? <Hourglass size={18} /> : <CalendarDays size={18} />,
          action: () => { navigate('/calendar'); onClose(); },
        });
      }
    });

    // Transactions
    transactions.forEach((t) => {
      if (
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      ) {
        result.push({
          id: `txn-${t.id}`,
          category: 'Finance',
          title: `${t.merchant} (${formatCurrency(t.amount, settings.currency)})`,
          subtitle: `${t.category} · ${t.date} ${t.notes ? `· ${t.notes}` : ''}`,
          icon: <DollarSign size={18} />,
          action: () => { navigate('/finance'); onClose(); },
        });
      }
    });

    // Actions matching query
    actionItems.forEach((item) => {
      if (item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)) {
        result.push(item);
      }
    });

    return result;
  }, [query, courses, assignments, events, transactions, settings.currency, navigate, onClose, onOpenAddClass, onOpenAddEvent, onOpenAddAssignment]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--surface-container-lowest)',
          borderRadius: 14,
          border: '1px solid var(--outline-variant)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
          animation: 'paletteIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-lowest)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--on-surface-variant)"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search courses, professors, assignments, events, ledger..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1rem',
              color: 'var(--on-surface)',
              fontFamily: 'inherit',
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="btn-ghost"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            >
              Clear
            </button>
          ) : (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--on-surface-variant)',
                padding: '0.2rem 0.4rem',
                borderRadius: 4,
                background: 'var(--surface-container)',
              }}
            >
              ESC to exit
            </span>
          )}
        </div>

        {/* Results list */}
        <div
          style={{
            overflowY: 'auto',
            padding: '0.5rem',
            flex: 1,
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: 'var(--on-surface-variant)',
              }}
            >
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', color: 'var(--on-surface-variant)' }}><Search size={32} /></div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                No results found for &ldquo;{query}&rdquo;
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                Try searching for course codes (e.g. CS189), assignments, exams, or transactions.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {items.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected
                        ? 'var(--surface-container-high)'
                        : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--on-surface)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--on-surface-variant)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: 'var(--on-surface-variant)',
                        opacity: 0.7,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-low)',
            fontSize: '0.75rem',
            color: 'var(--on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div>Omnia Universal Search</div>
        </div>
      </div>
    </div>
  );
}
