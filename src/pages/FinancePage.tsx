import { useState, useMemo, useRef } from 'react';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { Modal } from '../components/Modal';
import { TransactionModal } from '../components/TransactionModal';
import { formatCurrency, getCurrencyFractionDigits, getCurrencySymbol } from '../lib/currency';
import type { Transaction, TransactionType } from '../types';

const CATEGORIES = [
  'Food & Groceries',
  'Books & Supplies',
  'Rent & Utilities',
  'Transport',
  'Entertainment',
  'Health',
  'Other Discretionary',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Groceries': '#4a7c59',
  'Food & Dining': '#4a7c59',
  'Books & Supplies': '#886e38',
  'Rent & Utilities': '#316342',
  'Rent & Housing': '#316342',
  Transport: '#655d52',
  Entertainment: '#6d5622',
  Health: '#1a6b5a',
  'Other Discretionary': '#717971',
  Income: '#316342',
};

export function FinancePage() {
  const transactions = useData(ds.getTransactions);
  const settings = useData(ds.getSettings);
  const currency = settings.currency || 'IDR';
  const formatMoney = (amount: number) => formatCurrency(amount, currency);
  const currencyDigits = getCurrencyFractionDigits(currency);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showScanReceipt, setShowScanReceipt] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);

  // Real filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate financial summaries
  const { balance, incomeThisMonth, spentThisMonth, categoryBreakdown } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catTotals = new Map<string, number>();

    transactions.forEach((t) => {
      const txDate = new Date(t.date);
      const isThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

      if (isThisMonth) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expense += t.amount;
          catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount);
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
    };
  }, [transactions, currentMonth, currentYear]);

  const budgetPercent = (spentThisMonth / settings.monthlyBudget) * 100;
  const remaining = settings.monthlyBudget - spentThisMonth;
  const daysLeftInMonth = Math.max(1, 30 - now.getDate());
  const dailyAllowance = remaining > 0 ? remaining / daysLeftInMonth : 0;

  const budgetColor =
    budgetPercent > 100 ? 'var(--error)' :
      budgetPercent > 80 ? 'var(--warning)' :
        'var(--primary)';

  // Filtered transactions for the ledger table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
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
  }, [transactions, typeFilter, categoryFilter, searchQuery]);

  // Real CSV export
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Merchant', 'Category', 'Amount', 'Notes'];
    const rows = filteredTransactions.map((t) => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.merchant.replace(/"/g, '""')}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      t.amount.toFixed(currencyDigits),
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

  return (
    <div>
      <div className="page-header">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.375rem',
            }}>
              <span className="badge" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                Fall Semester 2026
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                Active Student Account
              </span>
            </div>
            <h1>Finance & Ledger</h1>
            <p className="subtitle">
              Budget pacing, categorical expenses, and receipt intelligence
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={() => setShowScanReceipt(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scan receipt
            </button>
            <button className="btn-outline" onClick={() => setShowAddIncome(true)}>
              + Add income
            </button>
            <button className="btn-primary" onClick={() => setShowAddExpense(true)}>
              + Add expense
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Unified Financial Health Overview */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}>
          {/* Section 1: Liquid Balance */}
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-container-lowest)',
            borderRight: '1px solid var(--outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                Liquid Available Balance
              </div>
              <div className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--on-surface)' }}>
                {formatMoney(balance)}
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Primary Checking (••••4291)
            </div>
          </div>

          {/* Section 2: Cash Flow In vs Out */}
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-container-lowest)',
            borderRight: '1px solid var(--outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>
                Monthly Flow ({new Date().toLocaleDateString('en-US', { month: 'short' })})
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Inflow</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9375rem' }}>
                  +{formatMoney(incomeThisMonth)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Outflow</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: '0.9375rem' }}>
                  -{formatMoney(spentThisMonth)}
                </span>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              Net flow: <strong className="tabular-nums" style={{ color: (incomeThisMonth - spentThisMonth) >= 0 ? 'var(--primary)' : 'var(--error)' }}>
                {(incomeThisMonth - spentThisMonth) >= 0 ? '+' : ''}{formatMoney(incomeThisMonth - spentThisMonth)}
              </strong>
            </div>
          </div>

          {/* Section 3: Safe Daily Burn Runway */}
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-container-lowest)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                Daily Safe Burn Runway
              </div>
              <div className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: remaining > 0 ? 'var(--on-surface)' : 'var(--error)' }}>
                {formatMoney(dailyAllowance)} <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--on-surface-variant)' }}>/ day</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {daysLeftInMonth} days remaining until next allowance refresh
            </div>
          </div>
        </div>

        {/* Budget progress bar */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>
              Semester Monthly Budget Cap
            </h2>
            <div className="tabular-nums" style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              {formatMoney(spentThisMonth)} spent of {formatMoney(settings.monthlyBudget)} cap
            </div>
          </div>
          <div style={{
            height: 12,
            background: 'var(--surface-container-high)',
            borderRadius: 999,
            overflow: 'hidden',
            marginBottom: '0.5rem',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(budgetPercent, 100)}%`,
              background: budgetColor,
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '0.75rem', color: 'var(--on-surface-variant)',
          }}>
            <span className="tabular-nums">0% ({formatMoney(0)})</span>
            <span className="tabular-nums">Warning (80%: {formatMoney(settings.monthlyBudget * 0.8)})</span>
            <span className="tabular-nums" style={{ color: budgetPercent > 100 ? 'var(--error)' : undefined, fontWeight: budgetPercent > 100 ? 600 : 400 }}>
              100% ({formatMoney(settings.monthlyBudget)})
            </span>
          </div>
        </div>

        {/* Spending by Category + Smart Advisory */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {/* Donut chart */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Spending by Category</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>
              Breakdown of {formatMoney(spentThisMonth)} total outlays
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <DonutChart data={categoryBreakdown} total={spentThisMonth} currency={currency} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 160 }}>
                {categoryBreakdown.map((item) => (
                  <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: CATEGORY_COLORS[item.category] || 'var(--outline)',
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, color: 'var(--on-surface)' }}>{item.category}</span>
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatMoney(item.amount)}</span>
                    <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      ({Math.round((item.amount / Math.max(1, spentThisMonth)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Advisory */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                <span className="badge" style={{
                  background: budgetPercent > 100 ? 'color-mix(in srgb, var(--error) 15%, transparent)' : 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  color: budgetPercent > 100 ? 'var(--error)' : 'var(--primary)',
                  fontWeight: 600,
                }}>
                  {budgetPercent > 100 ? 'Attention Needed' : 'On Track'}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                {budgetPercent > 100 ? 'Over Projected Monthly Limit' : 'Pacing is Well Within Target'}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                You have an estimated daily allowance of <strong>{formatMoney(dailyAllowance)}</strong> for the remaining {daysLeftInMonth} days of {new Date().toLocaleDateString('en-US', { month: 'long' })} without breaching your {formatMoney(settings.monthlyBudget)} ceiling.
              </p>
            </div>
            <div style={{
              marginTop: '1.5rem',
              padding: '0.875rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-container)',
              fontSize: '0.8125rem',
              color: 'var(--on-surface-variant)',
            }}>
              💡 <em>Scholar Tip:</em> Grocery shopping on Wednesdays typically yields campus co-op discounts, helping protect your discretionary cushion.
            </div>
          </div>
        </div>

        {/* Ledger & Recent Transactions */}
        <div className="card">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '1rem',
            marginBottom: '1rem',
          }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.125rem' }}>Campus & Living Transactions</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                Auditable log of all student financial records
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Type pills */}
              <div style={{
                display: 'flex',
                background: 'var(--surface-container-high)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px',
              }}>
                {(['all', 'expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'calc(var(--radius-sm) - 2px)',
                      background: typeFilter === t ? 'var(--surface-container-lowest)' : 'transparent',
                      color: typeFilter === t ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: typeFilter === t ? 'var(--shadow-xs)' : 'none',
                      transition: 'all 0.15s ease',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t === 'all' ? 'All Types' : t}
                  </button>
                ))}
              </div>

              {/* Category dropdown */}
              <select
                aria-label="Filter transactions by category"
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
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Income">Income</option>
              </select>

              {/* Export button */}
              <button
                className="btn-outline"
                onClick={handleExportCSV}
                title="Download ledger as a standard CSV file"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Search merchant, category, or notes..."
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

          <div style={{ overflowX: 'auto' }}>
            {filteredTransactions.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                    {['Date', 'Merchant / Description', 'Category', 'Amount', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.625rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--on-surface-variant)',
                          textAlign: h === 'Amount' ? 'right' : h === 'Actions' ? 'center' : 'left',
                          width: h === 'Actions' ? 90 : undefined,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className="tr-interactive"
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
                      <td className="tabular-nums" style={{ padding: '0.75rem', fontSize: '0.8125rem', whiteSpace: 'nowrap', color: 'var(--on-surface-variant)' }}>
                        {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <span style={{
                            width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-container-high)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.875rem',
                            flexShrink: 0,
                          }}>
                            {t.type === 'income' ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
                            )}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{t.merchant}</div>
                            {t.notes && <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{t.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>
                        <span className="badge" style={{
                          background: 'var(--surface-container)',
                          color: 'var(--on-surface)',
                          fontWeight: 500,
                        }}>
                          {t.category}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{
                        padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600,
                        textAlign: 'right',
                        color: t.type === 'income' ? 'var(--primary)' : 'var(--on-surface)',
                      }}>
                        {t.type === 'income' ? '+' : '–'}{formatMoney(t.amount)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTx(t);
                              setShowTxModal(true);
                            }}
                            aria-label={`Edit transaction from ${t.merchant}`}
                            title="Edit transaction"
                            style={{
                              width: 32, height: 32,
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete transaction from "${t.merchant}" (${formatMoney(t.amount)})?`)) {
                                ds.deleteTransaction(t.id);
                              }
                            }}
                            aria-label={`Delete transaction from ${t.merchant}`}
                            title="Delete transaction"
                            style={{
                              width: 32, height: 32,
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <div style={{
                textAlign: 'center', padding: '3rem 2rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                border: '1px dashed var(--outline-variant)', borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>No transactions found</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Try adjusting your category or type filters.</div>
                <button className="btn-outline" onClick={() => { setCategoryFilter('all'); setTypeFilter('all'); setSearchQuery(''); }}>
                  Reset filters
                </button>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 0.75rem 0',
            fontSize: '0.75rem', color: 'var(--on-surface-variant)',
          }}>
            <span>Showing {filteredTransactions.length} of {transactions.length} total entries</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        type="expense"
        currency={currency}
        onScanReceipt={() => { setShowAddExpense(false); setShowScanReceipt(true); }}
      />
      <AddTransactionModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        type="income"
        currency={currency}
      />
      <ScanReceiptModal
        isOpen={showScanReceipt}
        onClose={() => setShowScanReceipt(false)}
        currency={currency}
        onExtracted={(data) => {
          setShowScanReceipt(false);
          ds.addTransaction({
            amount: data.total,
            merchant: data.merchant,
            category: data.category,
            date: data.date,
            type: 'expense',
          });
        }}
      />
      <TransactionModal
        isOpen={showTxModal}
        onClose={() => {
          setShowTxModal(false);
          setEditingTx(null);
        }}
        transaction={editingTx}
      />
    </div>
  );
}

// ─── Donut Chart ───
function DonutChart({ data, total, currency }: { data: Array<{ category: string; amount: number }>; total: number; currency: string }) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pure slice pre-calculation avoiding mutation during render
  const slices = useMemo(() => {
    return data.reduce<Array<{ item: (typeof data)[0]; dash: number; gap: number; currentOffset: number }>>(
      (acc, item) => {
        const lastOffset = acc.length > 0 ? acc[acc.length - 1].currentOffset + acc[acc.length - 1].dash : 0;
        const pct = total > 0 ? item.amount / total : 0;
        const dash = pct * circumference;
        const gap = circumference - dash;
        acc.push({ item, dash, gap, currentOffset: lastOffset });
        return acc;
      },
      []
    );
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
        <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>SPENT</div>
        <div className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          {formatCurrency(total, currency)}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
          {data.length} categories
        </div>
      </div>
    </div>
  );
}

// ─── Add Transaction Modal ───
function AddTransactionModal({
  isOpen,
  onClose,
  type,
  currency,
  onScanReceipt,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  currency: string;
  onScanReceipt?: () => void;
}) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!merchant || !amount) return;
    ds.addTransaction({
      merchant,
      amount: parseFloat(amount),
      category: type === 'income' ? 'Income' : category,
      date,
      type,
      notes: notes || undefined,
    });
    setMerchant('');
    setAmount('');
    setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'expense' ? 'Add expense' : 'Add income'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {type === 'expense' && onScanReceipt && (
          <button
            className="btn-outline"
            onClick={onScanReceipt}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Scan receipt instead
          </button>
        )}

        <div>
          <label htmlFor="tx-merchant" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {type === 'income' ? 'Source' : 'Merchant'}
          </label>
          <input id="tx-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder={type === 'income' ? 'e.g. Stipend' : "e.g. Trader Joe's"} style={{ width: '100%' }} />
        </div>

        <div>
          <label htmlFor="tx-amount" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Amount ({getCurrencySymbol(currency)})</label>
          <input id="tx-amount" type="number" step={String(1 / (10 ** getCurrencyFractionDigits(currency)))} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={getCurrencyFractionDigits(currency) === 0 ? '0' : '0.00'} style={{ width: '100%' }} />
        </div>

        {type === 'expense' && (
          <div>
            <label htmlFor="tx-category" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Category</label>
            <select id="tx-category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="tx-date" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Date</label>
          <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div>
          <label htmlFor="tx-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Notes (optional)</label>
          <textarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ width: '100%', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {type === 'expense' ? 'Add expense' : 'Add income'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Scan Receipt Modal (Gemini Flash) ───
function ScanReceiptModal({
  isOpen,
  onClose,
  currency,
  onExtracted,
}: {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onExtracted: (data: { merchant: string; date: string; total: number; category: string }) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'reading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<{ merchant: string; date: string; total: number; category: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageDataRef = useRef<string | null>(null);

  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [keyInput, setKeyInput] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      imageDataRef.current = base64;
      setPreview(reader.result as string);
      await processImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string, mimeType: string) => {
    const key = apiKey || localStorage.getItem('gemini_api_key');
    if (!key) {
      setStatus('error');
      setErrorMsg('No Gemini API key provided. Please enter your API key above.');
      return;
    }

    setStatus('reading');
    setErrorMsg('');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: 'Extract the following from this receipt image and return ONLY valid JSON with no markdown formatting: { "merchant": "<store name>", "date": "<YYYY-MM-DD>", "total": <number>, "category": "<one of: Food & Groceries, Books & Supplies, Rent & Utilities, Transport, Entertainment, Health, Other Discretionary>" }. If you cannot extract a field, use reasonable defaults.',
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.merchant || !parsed.total) {
        throw new Error('Missing required fields in response');
      }

      setExtracted({
        merchant: parsed.merchant,
        date: parsed.date || new Date().toISOString().split('T')[0],
        total: Number(parsed.total),
        category: parsed.category || 'Other Discretionary',
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process receipt');
    } finally {
      // Discard the image from memory
      imageDataRef.current = null;
    }
  };

  const handleConfirm = () => {
    if (extracted) {
      onExtracted(extracted);
      // Clean up
      setPreview(null);
      setExtracted(null);
      setStatus('idle');
    }
  };

  const handleClose = () => {
    setPreview(null);
    setExtracted(null);
    imageDataRef.current = null;
    setStatus('idle');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan receipt">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!apiKey ? (
          <div style={{
            padding: '0.875rem', borderRadius: 8,
            background: 'var(--surface-container-high)',
            border: '1px solid var(--outline-variant)',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
              </svg>
              Gemini API key required for AI receipt parsing
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0 }}>
              Stored locally in your browser. Never sent to any third-party servers.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste Gemini API key"
                style={{ flex: 1, fontSize: '0.8125rem' }}
              />
              <button
                type="button"
                className="btn-primary min-touch-target"
                onClick={() => {
                  if (keyInput.trim()) {
                    localStorage.setItem('gemini_api_key', keyInput.trim());
                    setApiKey(keyInput.trim());
                  }
                }}
                disabled={!keyInput.trim()}
                style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
              >
                Save key
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Gemini API key connected
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem' }}
              onClick={() => {
                localStorage.removeItem('gemini_api_key');
                setApiKey('');
                setKeyInput('');
              }}
            >
              Change key
            </button>
          </div>
        )}

        <div style={{
          fontSize: '0.8125rem', color: 'var(--on-surface-variant)',
          marginBottom: '0.25rem',
        }}>
          Take a photo or select a receipt image. Only the extracted numbers will be saved - the image is never stored.
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {!preview ? (
          <button
            className="btn-outline"
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', justifyContent: 'center',
              padding: '2rem',
              borderStyle: 'dashed',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Pick or take a photo
          </button>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <img
              src={preview}
              alt="Receipt preview"
              className="image-outline"
              style={{
                maxWidth: '100%', maxHeight: 200, borderRadius: 8,
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {status === 'reading' && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1rem', borderRadius: 8,
              background: 'var(--surface-container)',
            }}
          >
            <div style={{
              width: 24, height: 24, border: '3px solid var(--outline-variant)',
              borderTop: '3px solid var(--primary)',
              borderRadius: '50%', animation: 'spin 1s linear infinite',
            }} aria-hidden="true" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Reading receipt…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            style={{
              padding: '0.75rem', borderRadius: 8,
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              fontSize: '0.8125rem',
            }}
          >
            ⚠ {errorMsg}
            <div style={{ marginTop: '0.5rem' }}>
              You can fill in the expense form manually instead.
            </div>
          </div>
        )}

        {status === 'done' && extracted && (
          <div style={{
            padding: '1rem', borderRadius: 8,
            background: 'var(--surface-container)',
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              color: 'var(--primary)', marginBottom: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              ✓ Only the extracted numbers were saved
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Merchant</div>
                <div style={{ fontWeight: 600 }}>{extracted.merchant}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Date</div>
                <div className="tabular-nums" style={{ fontWeight: 600 }}>{extracted.date}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Total</div>
                <div className="tabular-nums" style={{ fontWeight: 600 }}>{formatCurrency(extracted.total, currency)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Category</div>
                <div style={{ fontWeight: 600 }}>{extracted.category}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" className="btn-outline" onClick={handleClose}>Cancel</button>
          {status === 'done' && extracted && (
            <button type="button" className="btn-primary" onClick={handleConfirm}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirm & save
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
