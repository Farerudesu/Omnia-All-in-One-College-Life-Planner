import type { TransactionType } from '../types';

export const EXPENSE_CATEGORIES = [
  'Food & Groceries',
  'Books & Supplies',
  'Rent & Utilities',
  'Transport',
  'Entertainment',
  'Health',
  'Other Discretionary',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const ALL_TRANSACTION_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  'Income',
] as const;

export type TransactionCategory = typeof ALL_TRANSACTION_CATEGORIES[number];

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Groceries': '#4a7c59',
  'Books & Supplies': '#886e38',
  'Rent & Utilities': '#316342',
  Transport: '#655d52',
  Entertainment: '#6d5622',
  Health: '#1a6b5a',
  'Other Discretionary': '#717971',
  Income: '#316342',
};

/**
 * Normalizes any category string (including legacy values, free-text from AI, etc.)
 * to the strict single source of truth vocabulary.
 */
export function normalizeTransactionCategory(
  category?: string | null,
  type: TransactionType = 'expense'
): TransactionCategory {
  if (type === 'income') return 'Income';
  if (!category) return 'Other Discretionary';

  const trimmed = category.trim();
  if (trimmed === 'Income') return 'Income';

  // Exact match
  if (EXPENSE_CATEGORIES.includes(trimmed as ExpenseCategory)) {
    return trimmed as ExpenseCategory;
  }

  const lower = trimmed.toLowerCase();

  if (/^(food|food & dining|dining & coffee|groceries|dining|makan|makanan|minum|minuman|coffee|cafe|snack|jajan)$/i.test(lower) || lower.includes('food') || lower.includes('makan') || lower.includes('dining')) {
    return 'Food & Groceries';
  }
  if (/^(books|books & supplies|books & course packs|supplies|campus printing|buku|alat\s*tulis|fotokopi|print)$/i.test(lower) || lower.includes('book') || lower.includes('buku')) {
    return 'Books & Supplies';
  }
  if (/^(rent & utilities|rent & housing|housing & utilities|utilities|rent|housing|kost|kos|sewa|listrik|air|wifi)$/i.test(lower) || lower.includes('rent') || lower.includes('utilit')) {
    return 'Rent & Utilities';
  }
  if (/^(transport|transportation|travel|bensin|ojol|gojek|grab|kereta|bus|angkot|taxi|subway|fuel)$/i.test(lower) || lower.includes('transport')) {
    return 'Transport';
  }
  if (/^(entertainment|tech subscriptions|games|game|movie|bioskop|nonton|tiket|hiburan|spotify|netflix)$/i.test(lower) || lower.includes('entertain')) {
    return 'Entertainment';
  }
  if (/^(health|healthcare|medical|medicine|obat|dokter|klinik|kesehatan)$/i.test(lower) || lower.includes('health')) {
    return 'Health';
  }

  return 'Other Discretionary';
}
