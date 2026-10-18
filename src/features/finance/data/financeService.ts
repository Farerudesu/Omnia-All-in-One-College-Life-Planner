import type { Transaction } from '@/types';
import {
  transactions,
  setTransactions,
  settings,
  setSettings,
  activeUserId,
  genId,
  notify,
  getClient,
  ownedRow,
  mutateTable,
  transactionRow,
  refreshTable,
} from '@/lib/dataStore';

// ─── Transactions ───
export function getTransactions(): Transaction[] {
  return transactions;
}

export function addTransaction(txn: Omit<Transaction, 'id'>): Transaction {
  const newTxn = { ...txn, id: genId() };
  void mutateTable('transactions', () =>
    getClient()
      .from('transactions')
      .insert(ownedRow(transactionRow(txn)))
  );
  return newTxn;
}

export function updateTransaction(id: string, data: Partial<Transaction>): void {
  void mutateTable('transactions', () =>
    getClient()
      .from('transactions')
      .update(transactionRow(data))
      .eq('id', id)
      .eq('user_id', activeUserId)
  );
}

export async function deleteTransaction(id: string): Promise<Transaction | null> {
  const existing = transactions.find((t) => t.id === id);
  if (!existing) return null;

  setTransactions(transactions.filter((t) => t.id !== id));
  notify();

  try {
    const res = await mutateTable('transactions', () =>
      getClient().from('transactions').delete().eq('id', id).eq('user_id', activeUserId)
    );
    if (!res.success) {
      setTransactions([existing, ...transactions]);
      notify();
      throw new Error(res.error || 'Gagal menghapus transaksi');
    }
    return existing;
  } catch (err) {
    if (!transactions.some((t) => t.id === id)) {
      setTransactions([existing, ...transactions]);
      notify();
    }
    throw err;
  }
}

export async function restoreTransaction(transaction: Transaction): Promise<Transaction> {
  if (!transactions.some((t) => t.id === transaction.id)) {
    setTransactions([transaction, ...transactions]);
    notify();
  }
  const { error } = await getClient()
    .from('transactions')
    .insert(ownedRow(transactionRow(transaction)));
  if (error) {
    setTransactions(transactions.filter((t) => t.id !== transaction.id));
    notify();
    throw error;
  }
  await refreshTable('transactions');
  return transaction;
}

// ─── Payment Methods ───
export const DEFAULT_PAYMENT_METHODS = ['QRIS', 'Debit', 'Cash', 'Transfer'];
let cachedPaymentMethods: string[] | null = null;

export function getPaymentMethods(): string[] {
  if (cachedPaymentMethods) return cachedPaymentMethods;
  const stored = localStorage.getItem('omnia_payment_methods');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedPaymentMethods = parsed;
        return cachedPaymentMethods;
      }
    } catch {}
  }
  cachedPaymentMethods =
    settings.paymentMethods && settings.paymentMethods.length > 0
      ? settings.paymentMethods
      : DEFAULT_PAYMENT_METHODS;
  return cachedPaymentMethods;
}

export function savePaymentMethods(methods: string[]): void {
  const filtered = Array.from(new Set(methods.map((m) => m.trim()).filter(Boolean)));
  cachedPaymentMethods = filtered;
  localStorage.setItem('omnia_payment_methods', JSON.stringify(filtered));
  setSettings({ ...settings, paymentMethods: filtered });
  notify();
  void mutateTable('user_settings', async () => {
    const client = getClient();
    return client
      .from('user_settings')
      .update({ payment_methods: filtered })
      .eq('user_id', activeUserId);
  });
}

export function addPaymentMethod(method: string): string[] {
  const trimmed = method.trim();
  if (!trimmed) return getPaymentMethods();
  const current = getPaymentMethods();
  if (!current.includes(trimmed)) {
    const next = [...current, trimmed];
    savePaymentMethods(next);
    return next;
  }
  return current;
}

export function deletePaymentMethod(method: string): string[] {
  const current = getPaymentMethods();
  const next = current.filter((m) => m !== method);
  savePaymentMethods(next.length > 0 ? next : DEFAULT_PAYMENT_METHODS);
  return next.length > 0 ? next : DEFAULT_PAYMENT_METHODS;
}
