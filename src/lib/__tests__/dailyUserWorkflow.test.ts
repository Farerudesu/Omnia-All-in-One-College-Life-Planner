import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { translations, getLanguage, setLanguage, type Language } from '../i18n';
import {
  parseProposalFromText,
  parseUserPromptToData,
  validateProposal,
} from '../aiIntentParser';
import type { Assignment, ClassSession, Course, SessionException, Transaction } from '../../types';

// Polyfill localStorage & window for Node test environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
// @ts-expect-error Node environment polyfill
globalThis.localStorage = mockStorage;
if (typeof globalThis.window === 'undefined') {
  // @ts-expect-error Node environment polyfill
  globalThis.window = {
    localStorage: mockStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

describe('Daily Student User Workflow Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  afterEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. Daily Schedule & Timetable Calculations
  // ==========================================
  describe('Schedule & Timetable Daily Flow', () => {
    const mockCourses: Course[] = [
      {
        id: 'course-1',
        name: 'Struktur Data & Algoritma',
        code: 'CS201',
        professor: 'Dr. Handoko',
        room: 'Lab Komputer 3',
        color: '#0284c7',
      },
      {
        id: 'course-2',
        name: 'Matematika Diskrit',
        code: 'MATH105',
        professor: 'Prof. Sri',
        room: 'Gedung A 204',
        color: '#10b981',
      },
    ];

    const mockSessions: ClassSession[] = [
      {
        id: 'session-mon-1',
        courseId: 'course-1',
        dayOfWeek: 1, // Monday
        startTime: '08:00',
        endTime: '10:30',
        room: 'Lab Komputer 3',
      },
      {
        id: 'session-wed-1',
        courseId: 'course-2',
        dayOfWeek: 3, // Wednesday
        startTime: '13:00',
        endTime: '15:30',
        room: 'Gedung A 204',
      },
    ];

    it('filters classes for current day correctly', () => {
      // Simulate today is Monday (dayOfWeek = 1)
      const todayDayOfWeek = 1;
      const todaySessions = mockSessions.filter((s) => s.dayOfWeek === todayDayOfWeek);

      expect(todaySessions.length).toBe(1);
      expect(todaySessions[0].id).toBe('session-mon-1');

      const course = mockCourses.find((c) => c.id === todaySessions[0].courseId);
      expect(course?.name).toBe('Struktur Data & Algoritma');
      expect(course?.room).toBe('Lab Komputer 3');
    });

    it('identifies if a class is currently active based on current time', () => {
      function isClassActive(session: ClassSession, currentTime: string): boolean {
        return currentTime >= session.startTime && currentTime <= session.endTime;
      }

      const morningSession = mockSessions[0]; // 08:00 - 10:30
      expect(isClassActive(morningSession, '07:45')).toBe(false);
      expect(isClassActive(morningSession, '08:00')).toBe(true);
      expect(isClassActive(morningSession, '09:15')).toBe(true);
      expect(isClassActive(morningSession, '10:30')).toBe(true);
      expect(isClassActive(morningSession, '10:31')).toBe(false);
    });

    it('respects holiday/rescheduled session exceptions for today', () => {
      const mockExceptions: SessionException[] = [
        {
          id: 'exc-1',
          classSessionId: 'session-mon-1',
          date: '2026-10-26',
          isCancelled: true,
          reason: 'Hari Libur Nasional',
        },
      ];

      function isSessionHeld(sessionId: string, dateStr: string): boolean {
        const exception = mockExceptions.find(
          (e) => e.classSessionId === sessionId && e.date === dateStr
        );
        return !exception?.isCancelled;
      }

      expect(isSessionHeld('session-mon-1', '2026-10-26')).toBe(false);
      expect(isSessionHeld('session-mon-1', '2026-11-02')).toBe(true);
    });
  });

  // ==========================================
  // 2. Finance & Daily Safe Burn Runway Flow
  // ==========================================
  describe('Finance & Daily Safe Burn Runway Calculations', () => {
    it('accurately calculates remaining budget, days left, and daily safe allowance', () => {
      const monthlyBudget = 3_000_000; // Rp 3.000.000
      const spentThisMonth = 1_200_000; // Rp 1.200.000
      const remainingBudget = monthlyBudget - spentThisMonth; // Rp 1.800.000

      // Say today is day 12 of a 30-day month
      const currentDay = 12;
      const totalDays = 30;
      const daysLeft = Math.max(1, totalDays - currentDay); // 18 days left

      const dailyAllowance = remainingBudget / daysLeft; // 1.800.000 / 18 = 100.000
      expect(remainingBudget).toBe(1_800_000);
      expect(daysLeft).toBe(18);
      expect(dailyAllowance).toBe(100_000);
    });

    it('recalculates daily runway dynamically after an expense is logged', () => {
      let spent = 1_200_000;
      const monthlyBudget = 3_000_000;
      const daysLeft = 18;

      const initialRunway = (monthlyBudget - spent) / daysLeft;
      expect(initialRunway).toBe(100_000);

      // Student logs lunch expense of Rp 25.000
      const lunchTxn: Omit<Transaction, 'id'> = {
        amount: 25_000,
        type: 'expense',
        category: 'Food',
        merchant: 'Kantin Kampus',
        date: '2026-10-25',
        paymentMethod: 'qris',
      };

      spent += lunchTxn.amount;
      const updatedRunway = (monthlyBudget - spent) / daysLeft;
      expect(updatedRunway).toBe((1_800_000 - 25_000) / 18);
      expect(Math.floor(updatedRunway)).toBe(98_611);
    });

    it('evaluates budget pacing thresholds (under budget vs warning vs over budget)', () => {
      function getBudgetStatus(spent: number, budget: number): 'normal' | 'warning' | 'over' {
        const percent = (spent / budget) * 100;
        if (percent > 100) return 'over';
        if (percent > 80) return 'warning';
        return 'normal';
      }

      const budget = 2_000_000;
      expect(getBudgetStatus(1_000_000, budget)).toBe('normal');
      expect(getBudgetStatus(1_650_000, budget)).toBe('warning');
      expect(getBudgetStatus(2_100_000, budget)).toBe('over');
    });
  });

  // ==========================================
  // 3. Assignments & Task Urgency Flow
  // ==========================================
  describe('Assignments & Task Urgency Management', () => {
    const assignments: Assignment[] = [
      {
        id: 'task-1',
        title: 'Tugas Kalkulus Lanjutan',
        dueDate: '2026-10-25T14:00:00Z', // Today
        status: 'todo',
        priority: 'high',
        category: 'classes',
        courseId: 'course-2',
      },
      {
        id: 'task-2',
        title: 'Laporan Praktikum Fisika',
        dueDate: '2026-10-24T12:00:00Z', // Yesterday (Overdue)
        status: 'todo',
        priority: 'medium',
        category: 'classes',
        courseId: 'course-1',
      },
      {
        id: 'task-3',
        title: 'Resume Paper AI',
        dueDate: '2026-10-29T23:59:00Z', // Later this week
        status: 'in-progress',
        priority: 'low',
        category: 'classes',
      },
      {
        id: 'task-4',
        title: 'Daftar Ulang KRS',
        dueDate: '2026-10-20T10:00:00Z',
        status: 'done', // Completed
        priority: 'high',
        category: 'personal',
      },
    ];

    it('identifies overdue and pending tasks correctly', () => {
      const referenceNow = new Date('2026-10-25T10:00:00Z');

      const overdueTasks = assignments.filter((a) => {
        return a.status !== 'done' && new Date(a.dueDate).getTime() < referenceNow.getTime();
      });

      expect(overdueTasks.length).toBe(1);
      expect(overdueTasks[0].id).toBe('task-2');
    });

    it('handles task completion status transition from todo to done', () => {
      let task = { ...assignments[0] };
      expect(task.status).toBe('todo');

      task = { ...task, status: 'done' };
      expect(task.status).toBe('done');

      const remainingPending = assignments.filter((a) => a.id !== task.id && a.status !== 'done');
      expect(remainingPending.length).toBe(2);
    });
  });

  // ==========================================
  // 4. Daily Ask Omni Conversational Assistant
  // ==========================================
  describe('Ask Omni Daily Conversational Assistant Parser', () => {
    it('parses natural language daily expense request into structured transaction proposal', () => {
      const prompt = 'Catat pengeluaran makan siang ayam geprek 25rb';
      const parsed = parseUserPromptToData(prompt);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe('expense');
      expect(parsed?.amount).toBe(25000);
      expect(parsed?.category).toBe('Food & Groceries');

      const validation = validateProposal(parsed!);
      expect(validation.valid).toBe(true);
    });

    it('parses natural language daily study event / deadline into structured calendar proposal', () => {
      const text =
        'Proposal event: Title: Belajar Kelompok UAS Date: 2026-10-28 Start: 19:00 End: 21:00 Location: Perpustakaan Pusat';
      const proposal = parseProposalFromText(text);

      expect(proposal).not.toBeNull();
      expect(proposal?.title).toBe('Belajar Kelompok UAS');
      expect(proposal?.date).toBe('2026-10-28');
      expect(proposal?.startTime).toBe('19:00');
      expect(proposal?.endTime).toBe('21:00');
      expect(proposal?.location).toBe('Perpustakaan Pusat');

      const validation = validateProposal(proposal!);
      expect(validation.valid).toBe(true);
    });
  });

  // ==========================================
  // 5. Authentication i18n & Preferences
  // ==========================================
  describe('Authentication i18n & Localization', () => {
    it('defaults language to Indonesian (id) when no preference is set', () => {
      expect(getLanguage()).toBe('id');
    });

    it('persists language change to English and retrieves it correctly', () => {
      setLanguage('en');
      expect(getLanguage()).toBe('en');
      expect(mockStorage.getItem('omnia_language')).toBe('en');

      setLanguage('id');
      expect(getLanguage()).toBe('id');
      expect(mockStorage.getItem('omnia_language')).toBe('id');
    });

    it('provides complete and valid auth translation sets for both English and Indonesian', () => {
      const requiredAuthKeys = [
        'welcomeBack',
        'welcomeDesc',
        'createAccountTitle',
        'createAccountDesc',
        'emailTab',
        'smsTab',
        'emailLabel',
        'passwordLabel',
        'phoneLabel',
        'signInButton',
        'createAccountButton',
        'sendCodeButton',
        'verifyCodeButton',
        'helpTitle',
        'footerTagline',
      ] as const;

      for (const lang of ['en', 'id'] as const) {
        const auth = translations[lang].auth;
        expect(auth).toBeDefined();
        for (const key of requiredAuthKeys) {
          expect(typeof auth[key]).toBe('string');
          expect((auth[key] as string).length).toBeGreaterThan(0);
        }
        // Test function interpolations
        expect(auth.enterSmsCodeDesc('+628123456789')).toContain('+628123456789');
        expect(auth.smsSentSuccess('+628123456789')).toContain('+628123456789');
      }
    });
  });
});
