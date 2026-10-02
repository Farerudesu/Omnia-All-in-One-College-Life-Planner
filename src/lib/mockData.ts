import type {
  Course,
  ClassSession,
  SessionException,
  CalendarEvent,
  Assignment,
  Transaction,
  UserSettings,
} from '../types';

// ─── Courses ───
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    name: 'Data Structures & Algorithms',
    code: 'CS201',
    professor: 'Prof. Sarah Jenkins',
    color: '#316342',
    room: 'Room B-204',
    credits: 4,
    semesterId: 'fall-2026',
  },
  {
    id: 'course-2',
    name: 'Molecular Biology',
    code: 'BIO110',
    professor: 'Dr. Rachel Kim',
    color: '#1a6b5a',
    room: 'BioTech 108',
    credits: 3,
    semesterId: 'fall-2026',
  },
  {
    id: 'course-3',
    name: 'Linear Algebra',
    code: 'MATH220',
    professor: 'Dr. David Chen',
    color: '#6d5622',
    room: 'Sci Hall 302',
    credits: 3,
    semesterId: 'fall-2026',
  },
  {
    id: 'course-4',
    name: 'Academic Writing',
    code: 'ENG102',
    professor: 'Dr. Claire Miller',
    color: '#655d52',
    room: 'Humanities 104',
    credits: 3,
    semesterId: 'fall-2026',
  },
  {
    id: 'course-5',
    name: 'Inorganic Chemistry',
    code: 'CHEM105',
    professor: 'Prof. M. Zhao',
    color: '#7a3b2e',
    room: 'West Annex Lab 3',
    credits: 4,
    semesterId: 'fall-2026',
  },
];

// ─── Class Sessions (recurring) ───
export const mockClassSessions: ClassSession[] = [
  // CS201 - Mon & Wed 10:00–11:30
  {
    id: 'session-1',
    courseId: 'course-1',
    daysOfWeek: [1, 3],
    startTime: '10:00',
    endTime: '11:30',
    room: 'Room B-204',
    type: 'lecture',
  },
  // BIO110 - Tue 9:30–11:00
  {
    id: 'session-2',
    courseId: 'course-2',
    daysOfWeek: [2],
    startTime: '09:30',
    endTime: '11:00',
    room: 'BioTech 108',
    type: 'lecture',
  },
  // MATH220 - Mon & Thu 12:00–13:15
  {
    id: 'session-3',
    courseId: 'course-3',
    daysOfWeek: [1, 4],
    startTime: '12:00',
    endTime: '13:15',
    room: 'Sci Hall 302',
    type: 'lecture',
  },
  // ENG102 - Mon 15:00–16:30
  {
    id: 'session-4',
    courseId: 'course-4',
    daysOfWeek: [1],
    startTime: '15:00',
    endTime: '16:30',
    room: 'Humanities 104',
    type: 'lecture',
  },
  // CHEM105 - Tue & Thu 13:30–15:30
  {
    id: 'session-5',
    courseId: 'course-5',
    daysOfWeek: [2, 4],
    startTime: '13:30',
    endTime: '15:30',
    room: 'West Annex Lab 3',
    type: 'lab',
  },
  // CS201 Lab - Fri 10:00–12:00
  {
    id: 'session-6',
    courseId: 'course-1',
    daysOfWeek: [5],
    startTime: '10:00',
    endTime: '12:00',
    room: 'CS Lab 201',
    type: 'lab',
  },
];

// ─── Session Exceptions ───
export const mockSessionExceptions: SessionException[] = [
  {
    id: 'exc-1',
    classSessionId: 'session-3', // MATH220 Mon
    date: '2026-09-28',
    type: 'room-changed',
    newRoom: 'A-103',
    note: 'Room change for this week only',
  },
  {
    id: 'exc-2',
    classSessionId: 'session-2', // BIO110 Tue
    date: '2026-10-06',
    type: 'cancelled',
    note: 'Professor at conference',
  },
];

// ─── Calendar Events ───
export const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Linear Algebra Midterm',
    date: '2026-10-01',
    startTime: '14:00',
    endTime: '16:00',
    type: 'exam',
    courseId: 'course-3',
    notes: 'Covers chapters 1-5',
    reminderMinutesBefore: 1440,
  },
  {
    id: 'event-2',
    title: 'CS201 Problem Set 4 Due',
    date: '2026-10-03',
    type: 'deadline',
    courseId: 'course-1',
    notes: 'Dynamic programming & graph traversals',
  },
  {
    id: 'event-3',
    title: 'Campus Social',
    date: '2026-10-02',
    startTime: '18:00',
    endTime: '20:00',
    type: 'personal',
    notes: 'Student union mixer',
  },
  {
    id: 'event-4',
    title: 'Essay Draft Due',
    date: '2026-10-05',
    type: 'deadline',
    courseId: 'course-4',
  },
  {
    id: 'event-5',
    title: 'Physics Quiz',
    date: '2026-10-08',
    startTime: '09:00',
    endTime: '10:00',
    type: 'exam',
  },
  {
    id: 'event-6',
    title: 'Study Group',
    date: '2026-09-30',
    startTime: '16:00',
    endTime: '18:00',
    type: 'personal',
  },
  {
    id: 'event-7',
    title: 'Project Proposal',
    date: '2026-10-09',
    type: 'deadline',
    courseId: 'course-1',
  },
  {
    id: 'event-8',
    title: 'Midterm Review',
    date: '2026-10-15',
    startTime: '14:00',
    endTime: '16:00',
    type: 'exam',
    courseId: 'course-3',
  },
];

// ─── Assignments ───
export const mockAssignments: Assignment[] = [
  {
    id: 'assign-1',
    courseId: 'course-1',
    title: 'Algorithms Problem Set 4: Dynamic Programming & Graph Traversals',
    dueDate: '2026-10-03T23:59',
    priority: 'high',
    status: 'in-progress',
    notes: 'Include time complexity analysis for each solution',
  },
  {
    id: 'assign-2',
    courseId: 'course-1',
    title: 'Research Paper Draft on Neural Networks & Attention Mechanisms',
    dueDate: '2026-10-07T17:00',
    priority: 'high',
    status: 'in-progress',
  },
  {
    id: 'assign-3',
    courseId: 'course-3',
    title: 'Linear Algebra Problem Set 5: Eigenvalues and Spectral Theorem',
    dueDate: '2026-10-09T23:59',
    priority: 'medium',
    status: 'not-started',
  },
  {
    id: 'assign-4',
    courseId: 'course-5',
    title: 'CHEM105 Lab Report: Transition Metal Complexes',
    dueDate: '2026-10-06T17:00',
    priority: 'medium',
    status: 'not-started',
  },
  {
    id: 'assign-5',
    courseId: 'course-4',
    title: 'ENG102 Essay: Analysis of Contemporary Rhetoric',
    dueDate: '2026-09-25T23:59',
    priority: 'low',
    status: 'done',
    notes: 'Submitted on time',
  },
  {
    id: 'assign-6',
    category: 'personal',
    title: 'Register for Spring Semester Housing',
    dueDate: '2026-10-10T12:00',
    priority: 'high',
    status: 'not-started',
    notes: 'Need to submit housing deposit beforehand',
  },
  {
    id: 'assign-7',
    category: 'other',
    title: 'Complete Campus Safety Module',
    dueDate: '2026-10-15T23:59',
    priority: 'low',
    status: 'in-progress',
  },
];

// ─── Transactions ───
export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    amount: 78.50,
    merchant: 'University Bookstore',
    category: 'Books & Supplies',
    date: '2026-10-04',
    type: 'expense',
  },
  {
    id: 'txn-2',
    amount: 46.20,
    merchant: "Trader Joe's Campus",
    category: 'Food & Groceries',
    date: '2026-10-03',
    type: 'expense',
  },
  {
    id: 'txn-3',
    amount: 360.00,
    merchant: 'Campus Housing Sept',
    category: 'Rent & Utilities',
    date: '2026-10-01',
    type: 'expense',
  },
  {
    id: 'txn-4',
    amount: 1850.00,
    merchant: 'Student Teaching Stipend',
    category: 'Income',
    date: '2026-09-30',
    type: 'income',
  },
  {
    id: 'txn-5',
    amount: 30.00,
    merchant: 'Metro Transit Card Reload',
    category: 'Transport',
    date: '2026-09-29',
    type: 'expense',
  },
  {
    id: 'txn-6',
    amount: 6.75,
    merchant: 'Blue Bottle Coffee',
    category: 'Food & Groceries',
    date: '2026-09-28',
    type: 'expense',
  },
  {
    id: 'txn-7',
    amount: 156.45,
    merchant: 'Campus Tech Store',
    category: 'Books & Supplies',
    date: '2026-09-26',
    type: 'expense',
  },
  {
    id: 'txn-8',
    amount: 112.00,
    merchant: 'Uber / Lyft',
    category: 'Transport',
    date: '2026-09-24',
    type: 'expense',
  },
  {
    id: 'txn-9',
    amount: 67.00,
    merchant: 'Amazon Student',
    category: 'Other Discretionary',
    date: '2026-09-22',
    type: 'expense',
  },
];

// ─── Settings ───
export const mockSettings: UserSettings = {
  semesterStart: '2026-08-24',
  semesterEnd: '2026-12-18',
  breakWeeks: [
    { start: '2026-10-12', end: '2026-10-16' },
    { start: '2026-11-23', end: '2026-11-27' },
  ],
  monthlyBudget: 1850,
  currency: 'IDR',
  theme: 'light',
};

