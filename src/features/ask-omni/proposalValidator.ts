import type { PrefilledData } from '@/types';
import { normalizeTransactionCategory, type ExpenseCategory } from '@/lib/categories';
import { getCurrencySymbol } from '@/lib/currency';
import { translations, type Language } from '@/lib/i18n';
import type { ProposedAction } from './askOmni';

export function formatPrefilledSummary(data: PrefilledData): string {
  if (data.type === 'expense') {
    const currencySymbol = getCurrencySymbol(undefined);
    const formatted = data.amount
      ? `${currencySymbol}${data.amount.toLocaleString()}`
      : '(no amount)';
    return `Log Expense: ${formatted} for "${data.title}" (${data.category || 'other'}) on ${data.date}`;
  }
  if (data.type === 'task') {
    return `Add Task: "${data.title}" due ${data.date}${data.dueTime ? ` at ${data.dueTime}` : ''}`;
  }
  return `Schedule Event: "${data.title}" on ${data.date}${data.startTime ? ` at ${data.startTime}${data.endTime ? `–${data.endTime}` : ''}` : ''}${data.location && data.location !== 'Campus' ? ` • ${data.location}` : ''}`;
}

/**
 * Checks if the user is confirming a pending proposal (e.g. "tambahkan", "add", "oke", "ya").
 */
export function isConfirmationIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^(tambahkan|tambah|add|oke|ok|yes|ya|simpan|save|confirm|deal|lanjut|gas|yep|iya|setuju|bisa)$/i.test(
      t
    ) || /^(tambahkan\s+(ini|itu|jadwal|acara|event)|add\s+(this|it|event))$/i.test(t)
  );
}

/**
 * Validates a proposal before client-side saving.
 * Rejects invalid proposals with clear i18n messages.
 */
export function validateProposal(
  data: PrefilledData,
  lang: Language = 'id'
): { valid: boolean; error?: string } {
  const t = translations[lang].proposalValidation;

  // 1. Title is non-empty
  if (!data.title || !data.title.trim()) {
    return { valid: false, error: t.titleRequired };
  }

  // 2. Date format YYYY-MM-DD valid
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { valid: false, error: t.invalidDateFormat };
  }
  const [y, m, d] = data.date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (dateObj.getFullYear() !== y || dateObj.getMonth() !== m - 1 || dateObj.getDate() !== d) {
    return { valid: false, error: t.invalidDateFormat };
  }

  // 3. Start time format HH:mm if provided
  if (data.startTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.startTime)) {
    return { valid: false, error: t.invalidStartTimeFormat };
  }

  // 4. End time format HH:mm and endTime >= startTime
  if (data.endTime) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.endTime)) {
      return { valid: false, error: t.invalidEndTimeFormat };
    }
    if (data.startTime && data.endTime < data.startTime) {
      return { valid: false, error: t.endTimeBeforeStartTime };
    }
  }

  // 5. Positive integer amount for expenses
  if (data.type === 'expense') {
    if (typeof data.amount !== 'number' || !Number.isInteger(data.amount) || data.amount <= 0) {
      return { valid: false, error: t.invalidExpenseAmount };
    }
  }

  return { valid: true };
}

/**
 * Maps a structured ProposedAction from AskOmniResponse to PrefilledData.
 */
export function mapProposedActionToPrefilled(action: ProposedAction): PrefilledData {
  if (action.type === 'event') {
    return {
      type: 'event',
      title: action.title,
      date: action.date,
      startTime: action.startTime,
      endTime: action.endTime,
      location: action.location,
      notes: action.notes,
      eventType: 'personal',
    };
  }
  if (action.type === 'task') {
    return {
      type: 'task',
      title: action.title,
      date: action.date,
      dueTime: action.dueTime,
      courseId: action.courseId,
      priority: action.priority,
      notes: action.notes,
    };
  }
  return {
    type: 'expense',
    title: action.title,
    date: action.date,
    amount: action.amount,
    category: (action.category
      ? normalizeTransactionCategory(action.category)
      : 'Food & Groceries') as ExpenseCategory,
    paymentMethod: action.paymentMethod || 'QRIS',
    notes: action.notes,
  };
}
