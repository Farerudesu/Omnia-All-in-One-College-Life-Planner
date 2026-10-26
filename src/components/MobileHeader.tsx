import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Laptop,
  LogOut,
  Settings as SettingsIcon,
  CheckSquare,
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  StickyNote,
} from 'lucide-react';
import { OmniaLogo } from './OmniaLogo';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { Modal } from './Modal';
import { AddAssignmentModal } from './AddAssignmentModal';
import { AddTransactionModal } from './AddTransactionModal';
import type { EventType } from '../types';
import { EXPENSE_CATEGORIES, type ExpenseCategory, CATEGORY_NAMES_ID } from '../lib/categories';


import { useLanguage } from '../lib/useLanguage';
import { useToast } from './Toast';
import { getTodayDateString } from '../lib/dateUtils';

export function MobileHeader() {
  const navigate = useNavigate();
  const lang = useLanguage();
  const { showToast } = useToast();
  const { user, signOut } = useAuth();
  const profile = useData(ds.getProfile);
  const settings = useData(ds.getSettings);
  const courses = useData(ds.getCourses);

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'menu' | 'task' | 'event' | 'expense'>('menu');

  // Quick Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(() => getTodayDateString());

  // Quick Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => getTodayDateString());
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventType, setEventType] = useState<EventType>('exam');

  // Quick Expense form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Food & Groceries');

  useEffect(() => {
    const openQuickAdd = (event: Event) => {
      const type = (event as CustomEvent<'menu' | 'task' | 'event' | 'expense'>).detail || 'menu';
      const today = getTodayDateString(settings.timeZone);
      setTaskDueDate(today);
      setEventDate(today);
      setQuickAddType(type);
      setShowQuickAddModal(true);
    };
    window.addEventListener('open-quick-add', openQuickAdd);
    return () => window.removeEventListener('open-quick-add', openQuickAdd);
  }, [settings.timeZone]);

  const displayName = profile?.fullName || user?.email?.split('@')[0] || 'Omnia Student';
  const displayEmail = profile?.universityEmail || user?.email || '';
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'OM';

  // Trigger universal command palette search
  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const handleThemeChange = (theme: 'system' | 'light' | 'dark') => {
    ds.updateSettings({ theme });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await ds.addAssignment({
        title: taskTitle.trim(),
        courseId: taskCourseId || (courses[0]?.id ?? 'course-1'),
        dueDate: `${taskDueDate}T23:59`,
        status: 'not-started',
        priority: 'medium',
        category: 'classes',
      });
      showToast({
        message: lang === 'id' ? 'Tugas berhasil ditambahkan' : 'Task created successfully',
        type: 'success',
      });
      setTaskTitle('');
      setShowQuickAddModal(false);
      setQuickAddType('menu');
    } catch {
      // handled
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    try {
      await ds.addEvent({
        title: eventTitle.trim(),
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        type: eventType,
        location: 'Campus',
      });
      showToast({
        message: lang === 'id' ? 'Acara berhasil ditambahkan' : 'Event created successfully',
        type: 'success',
      });
      setEventTitle('');
      setShowQuickAddModal(false);
      setQuickAddType('menu');
    } catch {
      // handled
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(num) || num <= 0) return;
    try {
      await ds.addTransaction({
        merchant: expenseTitle.trim(),
        amount: num,
        type: 'expense',
        category: expenseCategory,
        date: getTodayDateString(settings.timeZone),
      });
      showToast({
        message: lang === 'id' ? 'Pengeluaran berhasil dicatat' : 'Expense recorded successfully',
        type: 'success',
      });
      setExpenseTitle('');
      setExpenseAmount('');
      setShowQuickAddModal(false);
      setQuickAddType('menu');
    } catch {
      // handled
    }
  };

  return (
    <>
      <header className="app-mobile-header" aria-label="Mobile header navigation">
        <div className="app-mobile-header__inner">
          {/* Brand & Active Screen Chip */}
          <div
            className="app-mobile-header__brand"
            onClick={() => navigate('/schedule')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/schedule')}
          >
            <span className="app-mobile-header__logo" aria-hidden="true">
              <OmniaLogo size={24} />
            </span>
            <div className="app-mobile-header__brand-text">
              <span className="app-mobile-header__title">Omnia</span>
            </div>
          </div>

          {/* Quick Action Icons */}
          <div className="app-mobile-header__actions">
            {/* Search Trigger */}
            <button
              type="button"
              className="app-mobile-header__icon-btn min-touch-target"
              onClick={openSearch}
              aria-label="Search schedule, courses, and tasks (Ctrl+K)"
            >
              <Search size={19} strokeWidth={2.2} />
            </button>

            {/* Quick Add Button */}
            <button
              type="button"
              className="app-mobile-header__icon-btn app-mobile-header__icon-btn--primary min-touch-target"
              onClick={() => {
                setQuickAddType('menu');
                setShowQuickAddModal(true);
              }}
              aria-label="Quick add item"
            >
              <Plus size={19} strokeWidth={2.4} />
            </button>

            {/* User Profile Avatar Trigger */}
            <button
              type="button"
              className="app-mobile-header__avatar min-touch-target"
              onClick={() => setShowProfileDrawer(true)}
              aria-label={`Open profile menu for ${displayName}`}
              style={{ overflow: 'hidden' }}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Quick Add Bottom Sheet Modal */}
      <Modal
        isOpen={showQuickAddModal}
        onClose={() => {
          setShowQuickAddModal(false);
          setQuickAddType('menu');
        }}
        title={
          quickAddType === 'menu'
            ? lang === 'id'
              ? 'Tindakan Cepat'
              : 'Quick Action'
            : quickAddType === 'task'
              ? lang === 'id'
                ? 'Tambah Tugas'
                : 'New Task'
              : quickAddType === 'event'
                ? lang === 'id'
                  ? 'Tambah Acara'
                  : 'New Event'
                : lang === 'id'
                  ? 'Tambah Pengeluaran'
                  : 'New Expense'
        }
      >
        {quickAddType === 'menu' && (
          <div className="mobile-quick-add-grid">
            <button
              type="button"
              className="mobile-quick-add-tile"
              onClick={() => {
                setShowQuickAddModal(false);
                setShowAddTaskModal(true);
              }}
            >
              <div
                className="mobile-quick-add-tile__icon"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
              >
                <CheckSquare size={20} />
              </div>
              <div className="mobile-quick-add-tile__info">
                <strong>{lang === 'id' ? 'Tambah Tugas' : 'Add Task'}</strong>
                <span>
                  {lang === 'id' ? 'PR, tugas kuliah, bacaan' : 'Homework, deliverable, reading'}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-add-tile"
              onClick={() => {
                setEventDate(getTodayDateString(settings.timeZone));
                setQuickAddType('event');
              }}
            >
              <div
                className="mobile-quick-add-tile__icon"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
              >
                <CalendarIcon size={20} />
              </div>
              <div className="mobile-quick-add-tile__info">
                <strong>{lang === 'id' ? 'Tambah Acara' : 'Add Event'}</strong>
                <span>
                  {lang === 'id'
                    ? 'Ujian, belajar bersama, pribadi'
                    : 'Exam, study session, personal'}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-add-tile"
              onClick={() => {
                setShowQuickAddModal(false);
                setShowAddExpenseModal(true);
              }}
            >
              <div
                className="mobile-quick-add-tile__icon"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
              >
                <DollarSign size={20} />
              </div>
              <div className="mobile-quick-add-tile__info">
                <strong>{lang === 'id' ? 'Catat Pengeluaran' : 'Log Expense'}</strong>
                <span>
                  {lang === 'id'
                    ? 'Makanan, buku, transportasi'
                    : 'Food, books, transport, supplies'}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-add-tile"
              onClick={() => {
                setShowQuickAddModal(false);
                navigate('/notes');
              }}
            >
              <div
                className="mobile-quick-add-tile__icon"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
              >
                <StickyNote size={20} />
              </div>
              <div className="mobile-quick-add-tile__info">
                <strong>{lang === 'id' ? 'Catatan Baru' : 'New Note'}</strong>
                <span>
                  {lang === 'id'
                    ? 'Ringkasan materi, catatan kuliah'
                    : 'Lecture notes, study summary'}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="mobile-quick-add-tile"
              onClick={() => {
                setShowQuickAddModal(false);
                navigate('/ask-omni');
              }}
            >
              <div
                className="mobile-quick-add-tile__icon"
                style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
              >
                <Clock size={20} />
              </div>
              <div className="mobile-quick-add-tile__info">
                <strong>{lang === 'id' ? 'Tanya Omni AI' : 'Ask Omni AI'}</strong>
                <span>
                  {lang === 'id' ? 'Jadwal & asisten bahasa alami' : 'Natural language scheduling'}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Quick Add Task Form */}
        {quickAddType === 'task' && (
          <form
            onSubmit={handleCreateTask}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                }}
              >
                {lang === 'id' ? 'Judul Tugas *' : 'Task Title *'}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={
                  lang === 'id'
                    ? 'Contoh: Tugas Mandiri 3, Bab 5'
                    : 'e.g., Problem Set 3, Reading ch. 5'
                }
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                }}
              >
                {lang === 'id' ? 'Mata Kuliah' : 'Course'}
              </label>
              <select
                value={taskCourseId}
                onChange={(e) => setTaskCourseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.9375rem',
                }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                }}
              >
                {lang === 'id' ? 'Tenggat Waktu' : 'Due Date'}
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div className="modal-actions-sticky" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-outline"
                style={{ flex: 1, minHeight: 44 }}
                onClick={() => setQuickAddType('menu')}
              >
                {lang === 'id' ? 'Kembali' : 'Back'}
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, minHeight: 44 }}>
                {lang === 'id' ? 'Simpan' : 'Create Task'}
              </button>
            </div>
          </form>
        )}

        {/* Quick Add Event Form */}
        {quickAddType === 'event' && (
          <form
            onSubmit={handleCreateEvent}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                }}
              >
                {lang === 'id' ? 'Judul Acara *' : 'Event Title *'}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={
                  lang === 'id' ? 'Contoh: UTS, Belajar Bersama' : 'e.g., Midterm Exam, Group Study'
                }
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div className="modal-form-grid-2col">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                  }}
                >
                  {lang === 'id' ? 'Kategori' : 'Category'}
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                  }}
                >
                  <option value="exam">{lang === 'id' ? 'Ujian' : 'Exam'}</option>
                  <option value="deadline">{lang === 'id' ? 'Tenggat' : 'Deadline'}</option>
                  <option value="class">{lang === 'id' ? 'Kelas' : 'Class'}</option>
                  <option value="personal">{lang === 'id' ? 'Pribadi' : 'Personal'}</option>
                  <option value="other">{lang === 'id' ? 'Lainnya' : 'Other'}</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                  }}
                >
                  {lang === 'id' ? 'Tanggal' : 'Date'}
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            <div className="modal-form-grid-2col">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                  }}
                >
                  {lang === 'id' ? 'Waktu Mulai' : 'Start Time'}
                </label>
                <input
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                  }}
                >
                  {lang === 'id' ? 'Waktu Selesai' : 'End Time'}
                </label>
                <input
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            <div className="modal-actions-sticky" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-outline"
                style={{ flex: 1, minHeight: 44 }}
                onClick={() => setQuickAddType('menu')}
              >
                {lang === 'id' ? 'Kembali' : 'Back'}
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, minHeight: 44 }}>
                {lang === 'id' ? 'Simpan' : 'Create Event'}
              </button>
            </div>
          </form>
        )}

        {/* Quick Add Expense Form */}
        {quickAddType === 'expense' && (
          <form
            onSubmit={handleCreateExpense}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                }}
              >
                {lang === 'id' ? 'Keterangan *' : 'Description *'}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={
                  lang === 'id'
                    ? 'Contoh: Kantin kampus, Buku teks, Fotokopi'
                    : 'e.g., Campus Cafe, Textbooks, Coffee'
                }
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.9375rem',
                }}
              />
            </div>

            <div className="modal-form-grid-2col">
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                  }}
                >
                  {lang === 'id' ? 'Nominal (Rp) *' : 'Amount (Rp) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    marginBottom: '0.375rem',
                  }}
                >
                  {lang === 'id' ? 'Kategori' : 'Category'}
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9375rem',
                  }}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {lang === 'id' && CATEGORY_NAMES_ID[cat] ? CATEGORY_NAMES_ID[cat] : cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions-sticky" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-outline"
                style={{ flex: 1, minHeight: 44 }}
                onClick={() => setQuickAddType('menu')}
              >
                {lang === 'id' ? 'Kembali' : 'Back'}
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, minHeight: 44 }}>
                {lang === 'id' ? 'Simpan' : 'Log Expense'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Mobile Profile & Quick Settings Drawer */}
      <Modal
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        title={lang === 'id' ? 'Profil Mahasiswa' : 'Student Profile'}
      >
        <div className="mobile-profile-modal-body">
          {/* User ID card */}
          <div className="mobile-profile-badge">
            <div className="mobile-profile-badge__avatar" style={{ overflow: 'hidden' }}>
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="mobile-profile-badge__info">
              <h4 className="mobile-profile-badge__name">{displayName}</h4>
              <p className="mobile-profile-badge__email">{displayEmail}</p>
              <span
                className="badge"
                style={{
                  background: 'var(--primary-container)',
                  color: 'var(--primary)',
                  marginTop: '0.375rem',
                  width: 'fit-content',
                }}
              >
                Fall Semester 2026
              </span>
            </div>
          </div>

          {/* Theme Quick Switcher */}
          <div className="mobile-profile-section">
            <div className="mobile-profile-section__title">
              {lang === 'id' ? 'Tema Tampilan' : 'Display Theme'}
            </div>
            <div className="mobile-theme-selector">
              <button
                type="button"
                className={`mobile-theme-btn ${settings.theme === 'light' ? 'mobile-theme-btn--active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={16} />
                <span>{lang === 'id' ? 'Terang' : 'Light'}</span>
              </button>
              <button
                type="button"
                className={`mobile-theme-btn ${settings.theme === 'dark' ? 'mobile-theme-btn--active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={16} />
                <span>{lang === 'id' ? 'Gelap' : 'Dark'}</span>
              </button>
              <button
                type="button"
                className={`mobile-theme-btn ${settings.theme === 'system' ? 'mobile-theme-btn--active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <Laptop size={16} />
                <span>{lang === 'id' ? 'Sistem' : 'System'}</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mobile-profile-section">
            <div className="mobile-profile-section__title">
              {lang === 'id' ? 'Preferensi & Alat' : 'Preferences & Tools'}
            </div>
            <div className="mobile-profile-links">
              <button
                type="button"
                className="mobile-profile-link-row min-touch-target"
                onClick={() => {
                  setShowProfileDrawer(false);
                  navigate('/settings');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <SettingsIcon size={18} color="var(--on-surface-variant)" />
                  <span>
                    {lang === 'id'
                      ? 'Pengaturan Akun & Kurikulum'
                      : 'Account & Curriculum Settings'}
                  </span>
                </div>
                <span style={{ color: 'var(--on-surface-variant)', fontSize: '1.25rem' }}>›</span>
              </button>
            </div>
          </div>

          {/* Sign Out Action */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--outline-variant)',
            }}
          >
            <button
              type="button"
              className="btn-outline min-touch-target"
              onClick={async () => {
                setShowProfileDrawer(false);
                await signOut();
                navigate('/signin');
              }}
              style={{
                width: '100%',
                justifyContent: 'center',
                color: 'var(--error)',
                borderColor: 'var(--outline-variant)',
              }}
            >
              <LogOut size={16} style={{ marginRight: '0.375rem' }} />
              {lang === 'id' ? 'Keluar' : 'Sign Out'}
            </button>
          </div>
        </div>
      </Modal>

      <AddAssignmentModal isOpen={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} />

      <AddTransactionModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        type="expense"
        currency={settings.currency || 'IDR'}
      />
    </>
  );
}
