import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { TransactionModal } from '../components/TransactionModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { formatCurrency, getCurrencyFractionDigits } from '../lib/currency';
import type { Transaction } from '../types';
import { EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../lib/categories';
import { useLanguage } from '../lib/useLanguage';
import { translations } from '../lib/i18n';
import { formatDateNumeric, getTodayDateString } from '../lib/dateUtils';
import { AdjustBudgetModal } from '../features/finance/components/AdjustBudgetModal';
import { SlidersHorizontal } from 'lucide-react';

const CATEGORIES = EXPENSE_CATEGORIES;

export const CATEGORY_NAMES_ID: Record<string, string> = {
  'Food & Groceries': 'Makanan & Minuman',
  'Phone & Internet': 'Pulsa & Internet',
  Transport: 'Transportasi',
  'Academic Supplies': 'Kebutuhan Kuliah',
  'Housing & Utilities': 'Tempat Tinggal & Tagihan',
  Entertainment: 'Hiburan & Gaya Hidup',
  'Health & Wellness': 'Kesehatan',
  Other: 'Lainnya',
};

export function FinancePage() {
  const navigate = useNavigate();
  const lang = useLanguage();
  const t = translations[lang];
  const { showToast } = useToast();
  const transactions = useData(ds.getTransactions);
  const settings = useData(ds.getSettings);
  const currency = settings.currency || 'IDR';
  const formatMoney = (amount: number) => formatCurrency(amount, currency);
  const currencyDigits = getCurrencyFractionDigits(currency);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustFocusSection, setAdjustFocusSection] = useState<'all' | 'budget' | 'balance'>('all');

  useEffect(() => {
    const handleOpenModal = () => {
      setAdjustFocusSection('all');
      setShowAdjustModal(true);
    };
    window.addEventListener('open-adjust-budget-modal', handleOpenModal);
    return () => window.removeEventListener('open-adjust-budget-modal', handleOpenModal);
  }, []);

  // Real filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate financial summaries
  const { incomeThisMonth, spentThisMonth, categoryBreakdown, paymentBreakdown } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catTotals = new Map<string, number>();
    const paymentTotals = new Map<string, number>();

    transactions.forEach((t) => {
      const [year, month, day] = t.date.split('-').map(Number);
      const txDate = new Date(year, month - 1, day);
      const isThisMonth =
        txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

      if (isThisMonth) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expense += t.amount;
          catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount);
          const paymentMethod = t.paymentMethod || 'Tidak dicatat';
          paymentTotals.set(paymentMethod, (paymentTotals.get(paymentMethod) || 0) + t.amount);
        }
      }
    });

    return {
      balance: income - expense,
      incomeThisMonth: income,
      spentThisMonth: expense,
      categoryBreakdown: Array.from(catTotals.entries())
        .map(([cat, amount]) => ({ category: cat, amount }))
        .sort((a, b) => b.amount - a.amount),
      paymentBreakdown: Array.from(paymentTotals.entries())
        .map(([method, amount]) => ({ method, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [transactions, currentMonth, currentYear]);

  const todayStr = getTodayDateString(settings.timeZone);
  const spentToday = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.date === todayStr)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, todayStr]);

  const initialBalance = settings.initialBalance ?? 0;
  const totalIncomeAllTime = useMemo(() => {
    return transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  const totalExpenseAllTime = useMemo(() => {
    return transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  const hasIncomeOrInitialBalance = totalIncomeAllTime > 0 || initialBalance > 0;
  const effectiveCashBalance = initialBalance + totalIncomeAllTime - totalExpenseAllTime;

  const effectiveMonthlyBudget = Math.max(0, settings.monthlyBudget || 0);
  const hasBudgetSet = effectiveMonthlyBudget > 0;
  const budgetPercent = hasBudgetSet ? (spentThisMonth / effectiveMonthlyBudget) * 100 : 0;
  const remaining = hasBudgetSet ? effectiveMonthlyBudget - spentThisMonth : 0;
  const daysLeftInMonth = Math.max(1, 30 - now.getDate());
  const dailyAllowance = hasBudgetSet && remaining > 0 ? remaining / daysLeftInMonth : 0;

  const budgetColor =
    budgetPercent > 100 ? 'var(--error)' : budgetPercent > 80 ? 'var(--warning)' : 'var(--primary)';

  // Sorting state for transactions table
  type SortField = 'date' | 'merchant' | 'category' | 'paymentMethod' | 'amount';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filtered and sorted transactions for the ledger table
  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMerchant = t.merchant.toLowerCase().includes(query);
        const matchesCategory = t.category.toLowerCase().includes(query);
        const matchesNotes = t.notes?.toLowerCase().includes(query);
        if (!matchesMerchant && !matchesCategory && !matchesNotes) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'merchant':
          comparison = a.merchant.localeCompare(b.merchant, undefined, { sensitivity: 'base' });
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
          break;
        case 'paymentMethod':
          comparison = (a.paymentMethod || '').localeCompare(b.paymentMethod || '', undefined, {
            sensitivity: 'base',
          });
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [transactions, typeFilter, categoryFilter, searchQuery, sortField, sortDirection]);

  // Real CSV export
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Date',
      'Type',
      'Merchant',
      'Category',
      'Amount',
      'PaymentMethod',
      'Notes',
    ];
    const rows = filteredTransactions.map((t) => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.merchant.replace(/"/g, '""')}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      t.amount.toFixed(currencyDigits),
      `"${(t.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `omnia-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteTxConfirm = async () => {
    if (!deletingTx) return;
    const toDelete = deletingTx;
    setDeletingTx(null);
    try {
      await ds.deleteTransaction(toDelete.id);
      showToast({
        message:
          lang === 'id'
            ? `Transaksi "${toDelete.merchant}" dihapus`
            : `Transaction "${toDelete.merchant}" deleted`,
        action: {
          label: lang === 'id' ? 'Urungkan' : 'Undo',
          onClick: async () => {
            await ds.restoreTransaction(toDelete);
          },
        },
      });
    } catch {
      // toast error handled in mutateTable
    }
  };

  return (
    <div className="finance-page-container">
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{t.finance.title}</h1>
          </div>
          <div
            className="finance-header-actions"
            style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
          >
            <button className="btn-outline min-touch-target" onClick={() => setShowAddIncome(true)}>
              {t.finance.addIncome}
            </button>
            <button
              className="btn-primary min-touch-target"
              onClick={() => setShowAddExpense(true)}
            >
              {t.finance.addExpense}
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Unified Financial Health Overview */}
        <div
          className="card finance-summary-grid"
          style={{
            padding: 0,
            overflow: 'hidden',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {/* Hero: remaining budget (single hero metric) */}
          <div
            className="finance-summary-item finance-summary-hero"
            style={{
              padding: '1.5rem',
              background: 'var(--surface-container-lowest)',
              borderRight: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gridColumn: 'span 2',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  {lang === 'id' ? 'Sisa Anggaran Bulan Ini' : 'Remaining Monthly Budget'}
                </div>
                <button
                  type="button"
                  className="btn-outline min-touch-target"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  onClick={() => {
                    setAdjustFocusSection('budget');
                    setShowAdjustModal(true);
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>
                    {hasBudgetSet
                      ? lang === 'id'
                        ? 'Ubah Batas'
                        : 'Adjust Limit'
                      : lang === 'id'
                      ? 'Atur Batas'
                      : 'Set Limit'}
                  </span>
                </button>
              </div>

              {!hasBudgetSet ? (
                <div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--on-surface-variant)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatMoney(0)}
                  </div>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    {lang === 'id'
                      ? 'Batas anggaran bulanan belum diatur (Rp 0). Klik tombol "Atur Batas" untuk menentukan kuota belanja.'
                      : 'Monthly budget cap is not set (0). Click "Set Limit" to define your spending quota.'}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      color: remaining >= 0 ? 'var(--on-surface)' : 'var(--error)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatMoney(remaining)}
                  </div>
                  <div
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    {lang === 'id'
                      ? `Rencana pengeluaran bulanan: ${formatMoney(effectiveMonthlyBudget)}. Berkurang ${formatMoney(spentThisMonth)} dari pengeluaran tercatat.`
                      : `Monthly budget cap: ${formatMoney(effectiveMonthlyBudget)}. Reduced by ${formatMoney(spentThisMonth)} from recorded spending.`}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 1: Liquid Cash Balance (supporting card) */}
          <div
            className="finance-summary-item"
            style={{
              padding: '1.5rem',
              background: 'var(--surface-container-lowest)',
              borderRight: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  {lang === 'id' ? 'Saldo Kas & Rekening' : 'Cash & Account Balance'}
                </div>
                <button
                  type="button"
                  className="btn-outline min-touch-target"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  onClick={() => {
                    setAdjustFocusSection('balance');
                    setShowAdjustModal(true);
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>
                    {hasIncomeOrInitialBalance
                      ? lang === 'id'
                        ? 'Atur Saldo'
                        : 'Adjust'
                      : lang === 'id'
                      ? 'Atur Saldo'
                      : 'Set Balance'}
                  </span>
                </button>
              </div>
              {!hasIncomeOrInitialBalance ? (
                <div>
                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'var(--on-surface-variant)',
                      marginBlock: '0.375rem',
                    }}
                  >
                    {lang === 'id' ? 'Belum ada pemasukan tercatat' : 'No income recorded yet'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--on-surface-variant)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {lang === 'id'
                      ? 'Catat uang masuk atau tentukan saldo awal dompet & rekeningmu.'
                      : 'Record income or set your initial cash balance.'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-outline min-touch-target"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                      onClick={() => {
                        setAdjustFocusSection('balance');
                        setShowAdjustModal(true);
                      }}
                    >
                      {lang === 'id' ? 'Atur saldo awal' : 'Set initial balance'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline min-touch-target"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                      onClick={() => setShowAddIncome(true)}
                    >
                      + {lang === 'id' ? 'Catat pemasukan' : 'Add income'}
                    </button>
                  </div>
                </div>
              ) : effectiveCashBalance < 0 ? (
                <div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--error)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatMoney(effectiveCashBalance)}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 4,
                      background: 'var(--error-container)',
                      color: 'var(--on-error-container)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      marginTop: '0.375rem',
                    }}
                  >
                    <span>
                      ⚠️{' '}
                      {lang === 'id'
                        ? 'Pengeluaran lebih besar dari pemasukan tercatat'
                        : 'Expenses exceed recorded income'}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--on-surface)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatMoney(effectiveCashBalance)}
                </div>
              )}
            </div>
            <div
              style={{
                marginTop: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              {lang === 'id' ? 'Uang tunai, e-wallet & rekening' : 'Combined cash, e-wallet & bank'}
            </div>
          </div>

          {/* Section 2: Cash Flow In vs Out */}
          <div
            className="finance-summary-item"
            style={{
              padding: '1.5rem',
              background: 'var(--surface-container-lowest)',
              borderRight: '1px solid var(--outline-variant)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                  marginBottom: '0.5rem',
                }}
              >
                {lang === 'id' ? 'Uang Masuk & Keluar Bulan Ini' : 'Monthly Cash Flow'} (
                {new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                  month: 'short',
                })}
                )
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.375rem',
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  {t.finance.inflow}
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9375rem' }}
                >
                  +{formatMoney(incomeThisMonth)}
                </span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  {t.finance.outflow}
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: '0.9375rem' }}
                >
                  -{formatMoney(spentThisMonth)}
                </span>
              </div>
            </div>
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
              }}
            >
              {lang === 'id' ? 'Selisih bulan ini:' : 'Net this month:'}{' '}
              <strong
                className="tabular-nums"
                style={{
                  color: incomeThisMonth - spentThisMonth >= 0 ? 'var(--primary)' : 'var(--error)',
                }}
              >
                {incomeThisMonth - spentThisMonth >= 0 ? '+' : ''}
                {formatMoney(incomeThisMonth - spentThisMonth)}
              </strong>
            </div>
          </div>

          {/* Section 3: Safe Daily Burn Runway & Today's Spend */}
          <div
            className="finance-summary-item"
            style={{
              padding: '1.5rem',
              background: 'var(--surface-container-lowest)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                  marginBottom: '0.25rem',
                }}
              >
                {lang === 'id' ? 'Alokasi Belanja Aman Harian' : 'Daily Safe Burn Runway'}
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: remaining > 0 ? 'var(--on-surface)' : 'var(--error)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatMoney(dailyAllowance)}{' '}
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  {lang === 'id' ? '/ hari' : '/ day'}
                </span>
              </div>
              <div
                style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--outline-variant)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--on-surface-variant)',
                    marginBottom: '0.125rem',
                  }}
                >
                  {lang === 'id' ? 'Pengeluaran hari ini:' : "Today's spend:"}
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--on-surface)' }}
                >
                  {formatMoney(spentToday)}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
              }}
            >
              {lang === 'id'
                ? `${daysLeftInMonth} hari tersisa bulan ini`
                : `${daysLeftInMonth} days remaining this month`}
            </div>
          </div>
        </div>

        {/* Budget progress bar */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          {!hasBudgetSet ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '0.5rem 0',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0' }}>
                  {lang === 'id' ? 'Batas Anggaran Bulanan Semester' : 'Semester Monthly Budget Cap'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  {lang === 'id'
                    ? 'Batas anggaran bulanan saat ini adalah Rp 0. Tentukan batas untuk melihat progres pemakaian kuota dan peringatan 80%.'
                    : 'Your monthly budget cap is currently 0. Set a limit to track usage progress and 80% threshold warnings.'}
                </p>
              </div>
              <button
                type="button"
                className="btn-primary min-touch-target"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                onClick={() => {
                  setAdjustFocusSection('budget');
                  setShowAdjustModal(true);
                }}
              >
                <SlidersHorizontal size={14} />
                <span>{lang === 'id' ? 'Atur Batas Anggaran' : 'Set Budget Limit'}</span>
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                    {lang === 'id' ? 'Batas Anggaran Bulanan Semester' : 'Semester Monthly Budget Cap'}
                  </h2>
                  <button
                    type="button"
                    className="btn-outline min-touch-target"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                    onClick={() => {
                      setAdjustFocusSection('budget');
                      setShowAdjustModal(true);
                    }}
                  >
                    <SlidersHorizontal size={12} />
                    <span>{lang === 'id' ? 'Ubah Batas' : 'Adjust Limit'}</span>
                  </button>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}
                >
                  {lang === 'id'
                    ? `Terpakai ${formatMoney(spentThisMonth)} dari batas ${formatMoney(effectiveMonthlyBudget)}`
                    : `${formatMoney(spentThisMonth)} spent of ${formatMoney(effectiveMonthlyBudget)} cap`}
                </div>
              </div>
              <div
                style={{
                  height: 12,
                  background: 'var(--surface-container-high)',
                  borderRadius: 999,
                  overflow: 'hidden',
                  marginBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(budgetPercent, 100)}%`,
                    background: budgetColor,
                    borderRadius: 999,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  color: 'var(--on-surface-variant)',
                }}
              >
                <span className="tabular-nums">0% ({formatMoney(0)})</span>
                <span className="tabular-nums">
                  {lang === 'id'
                    ? `Peringatan (80%: ${formatMoney(effectiveMonthlyBudget * 0.8)})`
                    : `Warning (80%: ${formatMoney(effectiveMonthlyBudget * 0.8)})`}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    color: budgetPercent > 100 ? 'var(--error)' : undefined,
                    fontWeight: budgetPercent > 100 ? 600 : 400,
                  }}
                >
                  100% ({formatMoney(effectiveMonthlyBudget)})
                </span>
              </div>
            </>
          )}
        </div>

        {/* Spending by Category + Smart Advisory */}
        <div
          className="finance-breakdown-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Donut chart */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
              {lang === 'id' ? 'Pengeluaran per Kategori' : 'Spending by Category'}
            </h2>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--on-surface-variant)',
                marginBottom: '1.25rem',
              }}
            >
              {lang === 'id'
                ? `Rincian dari total ${formatMoney(spentThisMonth)} pengeluaran`
                : `Breakdown of ${formatMoney(spentThisMonth)} total outlays`}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <DonutChart data={categoryBreakdown} total={spentThisMonth} currency={currency} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  flex: 1,
                  minWidth: 160,
                }}
              >
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: CATEGORY_COLORS[item.category] || 'var(--outline)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, color: 'var(--on-surface)' }}>{item.category}</span>
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>
                      {formatMoney(item.amount)}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}
                    >
                      ({Math.round((item.amount / Math.max(1, spentThisMonth)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment method ratio */}
          <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                {lang === 'id' ? 'Rasio Penggunaan Metode Bayar' : 'Payment Method Usage Ratio'}
              </h2>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--on-surface-variant)',
                  marginBottom: '1rem',
                }}
              >
                {lang === 'id'
                  ? 'Proporsi pengeluaran bulan ini berdasarkan metode pembayaran.'
                  : 'This month’s spending share by payment method.'}
              </p>
              {paymentBreakdown.length > 0 ? (
                paymentBreakdown.map((item) => (
                  <div key={item.method} style={{ marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span>{item.method}</span>
                      <strong>{Math.round((item.amount / spentThisMonth) * 100)}%</strong>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--surface-container-high)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(item.amount / spentThisMonth) * 100}%`,
                          background: 'var(--primary)',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                  {lang === 'id'
                    ? 'Belum ada data metode pembayaran.'
                    : 'No payment method data yet.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ledger & Recent Transactions */}
        <div className="card finance-transactions-card">
          <div
            className="finance-transactions-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.125rem' }}>
                {lang === 'id' ? 'Transaksi Kampus & Keseharian' : 'Campus & Living Transactions'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                {lang === 'id'
                  ? 'Catatan riwayat transaksi keuangan mahasiswa'
                  : 'Auditable log of all student financial records'}
              </p>
            </div>
            <div
              className="finance-transaction-filters"
              style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}
            >
              {/* Type pills */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--surface-container-high)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px',
                }}
              >
                {(['all', 'expense', 'income'] as const).map((tType) => (
                  <button
                    key={tType}
                    onClick={() => setTypeFilter(tType)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'calc(var(--radius-sm) - 2px)',
                      background:
                        typeFilter === tType ? 'var(--surface-container-lowest)' : 'transparent',
                      color:
                        typeFilter === tType ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: typeFilter === tType ? 'var(--shadow-xs)' : 'none',
                      transition:
                        'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tType === 'all'
                      ? lang === 'id'
                        ? 'Semua Tipe'
                        : 'All Types'
                      : tType === 'expense'
                        ? lang === 'id'
                          ? 'Pengeluaran'
                          : 'Expense'
                        : lang === 'id'
                          ? 'Pemasukan'
                          : 'Income'}
                  </button>
                ))}
              </div>

              {/* Category dropdown */}
              <select
                aria-label={
                  lang === 'id'
                    ? 'Filter transaksi berdasarkan kategori'
                    : 'Filter transactions by category'
                }
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.375rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--on-surface)',
                  cursor: 'pointer',
                }}
              >
                <option value="all">{lang === 'id' ? 'Semua Kategori' : 'All Categories'}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Income">{lang === 'id' ? 'Pemasukan' : 'Income'}</option>
              </select>

              {/* Export button */}
              <button
                className="btn-outline"
                onClick={handleExportCSV}
                title={
                  lang === 'id'
                    ? 'Unduh catatan sebagai file CSV'
                    : 'Download ledger as a standard CSV file'
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  padding: '0.375rem 0.75rem',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {lang === 'id' ? 'Ekspor CSV' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="finance-transaction-search" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              aria-label={lang === 'id' ? 'Cari transaksi' : 'Search transactions'}
              placeholder={
                lang === 'id'
                  ? 'Cari tempat, kategori, atau catatan...'
                  : 'Search merchant, category, or notes...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
              }}
            />
          </div>

          <div className="finance-transaction-list" style={{ overflowX: 'auto' }}>
            {filteredTransactions.length > 0 ? (
              <table
                className="finance-transaction-table"
                style={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    {[
                      {
                        field: 'date' as SortField,
                        label: lang === 'id' ? 'Tanggal' : 'Date',
                        width: 110,
                      },
                      {
                        field: 'merchant' as SortField,
                        label: lang === 'id' ? 'Tempat / Pengeluaran' : 'Merchant / Description',
                      },
                      {
                        field: 'category' as SortField,
                        label: lang === 'id' ? 'Kategori' : 'Category',
                        width: 140,
                      },
                      {
                        field: 'paymentMethod' as SortField,
                        label: lang === 'id' ? 'Metode Pembayaran' : 'Payment Method',
                        width: 160,
                      },
                      {
                        field: 'amount' as SortField,
                        label: lang === 'id' ? 'Nominal' : 'Amount',
                        width: 180,
                      },
                    ].map((col) => {
                      const isSortActive = sortField === col.field;
                      const isAmount = col.field === 'amount';
                      return (
                        <th
                          key={col.field}
                          onClick={() => {
                            if (sortField === col.field) {
                              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            } else {
                              setSortField(col.field);
                              setSortDirection(
                                col.field === 'amount'
                                  ? 'desc'
                                  : col.field === 'date'
                                    ? 'desc'
                                    : 'asc'
                              );
                            }
                          }}
                          style={{
                            padding: isAmount
                              ? '0.625rem 2.5rem 0.625rem 0.75rem'
                              : '0.625rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isSortActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                            textAlign: isAmount ? 'right' : 'left',
                            width: col.width,
                            cursor: 'pointer',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.15s ease',
                          }}
                          aria-sort={
                            isSortActive
                              ? sortDirection === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : undefined
                          }
                          title={
                            lang === 'id'
                              ? `Urutkan berdasarkan ${col.label}`
                              : `Sort by ${col.label}`
                          }
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: isAmount ? 'flex-end' : 'flex-start',
                              gap: '0.25rem',
                              width: isAmount ? '100%' : 'auto',
                            }}
                          >
                            {col.label}
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                color: isSortActive
                                  ? 'var(--primary)'
                                  : 'var(--on-surface-variant)',
                                opacity: isSortActive ? 1 : 0.35,
                              }}
                            >
                              {isSortActive ? (
                                sortDirection === 'asc' ? (
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    aria-hidden="true"
                                  >
                                    <polyline points="18 15 12 9 6 15" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    aria-hidden="true"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                )
                              ) : (
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  aria-hidden="true"
                                >
                                  <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
                                </svg>
                              )}
                            </span>
                          </span>
                        </th>
                      );
                    })}
                    <th
                      style={{
                        padding: '0.625rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--on-surface-variant)',
                        textAlign: 'center',
                        width: 90,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lang === 'id' ? 'Aksi' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className="finance-transaction-row tr-interactive"
                      tabIndex={0}
                      onClick={() => {
                        setEditingTx(t);
                        setShowTxModal(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEditingTx(t);
                          setShowTxModal(true);
                        }
                      }}
                      style={{
                        borderBottom: '1px solid var(--outline-variant)',
                      }}
                    >
                      <td
                        data-label={lang === 'id' ? 'Tanggal' : 'Date'}
                        className="finance-transaction-date tabular-nums"
                        style={{
                          padding: '0.75rem',
                          fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                          color: 'var(--on-surface-variant)',
                        }}
                      >
                        {formatDateNumeric(t.date)}
                      </td>
                      <td
                        data-label={lang === 'id' ? 'Tempat' : 'Merchant'}
                        className="finance-transaction-merchant"
                        style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--surface-container-high)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              flexShrink: 0,
                            }}
                          >
                            {t.type === 'income' ? (
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="2"
                              >
                                <line x1="12" y1="19" x2="12" y2="5" />
                                <polyline points="5 12 12 5 19 12" />
                              </svg>
                            ) : (
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--on-surface-variant)"
                                strokeWidth="2"
                              >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <polyline points="19 12 12 19 5 12" />
                              </svg>
                            )}
                          </span>
                          <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--on-surface)',
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word',
                              }}
                              title={t.merchant}
                            >
                              <span>{t.merchant}</span>
                            </div>
                            {t.notes && (
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--on-surface-variant)',
                                  overflowWrap: 'anywhere',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {t.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        data-label={lang === 'id' ? 'Kategori' : 'Category'}
                        className="finance-transaction-category"
                        style={{ padding: '0.75rem', fontSize: '0.8125rem' }}
                      >
                        <span
                          className="badge"
                          style={{
                            background: 'var(--surface-container)',
                            color: 'var(--on-surface)',
                            fontWeight: 500,
                          }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td
                        data-label={lang === 'id' ? 'Metode Pembayaran' : 'Payment Method'}
                        className="finance-transaction-payment"
                        style={{
                          padding: '0.75rem',
                          fontSize: '0.8125rem',
                          color: 'var(--on-surface-variant)',
                        }}
                      >
                        {t.paymentMethod || (lang === 'id' ? 'Tidak dicatat' : 'Not recorded')}
                      </td>
                      <td
                        data-label={lang === 'id' ? 'Nominal' : 'Amount'}
                        className="finance-transaction-amount tabular-nums"
                        style={{
                          padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textAlign: 'right',
                          color: t.type === 'income' ? 'var(--primary)' : 'var(--on-surface)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.type === 'income' ? '+' : '–'}
                        {formatMoney(t.amount)}
                      </td>
                      <td
                        data-label={lang === 'id' ? 'Aksi' : 'Actions'}
                        className="finance-transaction-actions"
                        style={{ padding: '0.75rem', textAlign: 'center' }}
                      >
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTx(t);
                              setShowTxModal(true);
                            }}
                            aria-label={`Edit transaction from ${t.merchant}`}
                            title={lang === 'id' ? 'Ubah transaksi' : 'Edit transaction'}
                            style={{
                              width: 44,
                              height: 44,
                              padding: 0,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--outline-variant)',
                              background: 'var(--surface-container)',
                              cursor: 'pointer',
                              color: 'var(--on-surface-variant)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'border-color 0.15s ease, background-color 0.15s ease',
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingTx(t);
                            }}
                            aria-label={`Delete transaction from ${t.merchant}`}
                            title={lang === 'id' ? 'Hapus transaksi' : 'Delete transaction'}
                            style={{
                              width: 44,
                              height: 44,
                              padding: 0,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--error)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'border-color 0.15s ease, background-color 0.15s ease',
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  border: '1px dashed var(--outline-variant)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                  {lang === 'id' ? 'Belum ada transaksi' : 'No transactions found'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  {lang === 'id'
                    ? 'Coba sesuaikan filter kategori atau tipe Anda.'
                    : 'Try adjusting your category or type filters.'}
                </div>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setCategoryFilter('all');
                    setTypeFilter('all');
                    setSearchQuery('');
                  }}
                >
                  {lang === 'id' ? 'Reset filter' : 'Reset filters'}
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 0.75rem 0',
              fontSize: '0.75rem',
              color: 'var(--on-surface-variant)',
            }}
          >
            <span>
              {lang === 'id'
                ? `Menampilkan ${filteredTransactions.length} dari ${transactions.length} total entri`
                : `Showing ${filteredTransactions.length} of ${transactions.length} total entries`}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        type="expense"
        currency={currency}
        onScanReceipt={() => {
          setShowAddExpense(false);
          navigate('/ask-omni');
        }}
      />
      <AddTransactionModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        type="income"
        currency={currency}
      />
      <TransactionModal
        isOpen={showTxModal}
        onClose={() => {
          setShowTxModal(false);
          setEditingTx(null);
        }}
        transaction={editingTx}
      />

      {/* Confirm Delete Transaction Modal */}
      <ConfirmModal
        isOpen={!!deletingTx}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteTxConfirm}
        title={lang === 'id' ? 'Hapus catatan transaksi?' : 'Delete transaction?'}
        message={
          lang === 'id'
            ? `Apakah kamu yakin ingin menghapus catatan transaksi "${deletingTx?.merchant}" sejumlah ${formatMoney(deletingTx?.amount || 0)}? Tindakan ini dapat diurungkan.`
            : `Are you sure you want to delete "${deletingTx?.merchant}" (${formatMoney(deletingTx?.amount || 0)})? You can undo this action.`
        }
        confirmText={lang === 'id' ? 'Hapus transaksi' : 'Delete transaction'}
        cancelText={lang === 'id' ? 'Batal' : 'Cancel'}
        variant="danger"
      />

      {/* Adjust Budget & Initial Balance Modal */}
      <AdjustBudgetModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        settings={settings}
        lang={lang}
        focusSection={adjustFocusSection}
      />
    </div>
  );
}

// ─── Donut Chart ───
function DonutChart({
  data,
  total,
  currency,
}: {
  data: Array<{ category: string; amount: number }>;
  total: number;
  currency: string;
}) {
  const lang = useLanguage();
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pure slice pre-calculation avoiding mutation during render
  const slices = useMemo(() => {
    return data.reduce<
      Array<{ item: (typeof data)[0]; dash: number; gap: number; currentOffset: number }>
    >((acc, item) => {
      const lastOffset =
        acc.length > 0 ? acc[acc.length - 1].currentOffset + acc[acc.length - 1].dash : 0;
      const pct = total > 0 ? item.amount / total : 0;
      const dash = pct * circumference;
      const gap = circumference - dash;
      acc.push({ item, dash, gap, currentOffset: lastOffset });
      return acc;
    }, []);
  }, [data, total, circumference]);

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {slices.map((slice, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={CATEGORY_COLORS[slice.item.category] || 'var(--outline)'}
            strokeWidth={strokeWidth}
            strokeDasharray={`${slice.dash} ${slice.gap}`}
            strokeDashoffset={-slice.currentOffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="donut-center">
        <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
          {lang === 'id' ? 'PENGELUARAN' : 'SPENT'}
        </div>
        <div
          className="tabular-nums"
          style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}
        >
          {formatCurrency(total, currency)}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
          {data.length} {lang === 'id' ? 'kategori' : 'categories'}
        </div>
      </div>
    </div>
  );
}
