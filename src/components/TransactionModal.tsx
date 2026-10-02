import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { getCurrencyFractionDigits, getCurrencySymbol } from '../lib/currency';
import type { Transaction, TransactionType } from '../types';

interface TransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Dining & Coffee',
  'Groceries',
  'Books & Course Packs',
  'Campus Printing',
  'Tech Subscriptions',
  'Transportation',
  'Entertainment',
  'Stipend & Income',
  'Housing & Utilities',
  'Other',
];

export function TransactionModal({ transaction, isOpen, onClose }: TransactionModalProps) {
  const isEditing = !!transaction;
  const currency = useData(ds.getSettings).currency || 'IDR';
  const currencyDigits = getCurrencyFractionDigits(currency);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (transaction) {
      setMerchant(transaction.merchant);
      setAmount(String(transaction.amount));
      setCategory(transaction.category);
      setType(transaction.type);
      setDate(transaction.date);
      setNotes(transaction.notes || '');
    } else {
      setMerchant('');
      setAmount('');
      setCategory(CATEGORIES[0]);
      setType('expense');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [transaction, isOpen]);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!merchant.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (transaction) {
      ds.updateTransaction(transaction.id, {
        merchant,
        amount: parsedAmount,
        category,
        type,
        date,
        notes: notes || undefined,
      });
    } else {
      ds.addTransaction({
        merchant,
        amount: parsedAmount,
        category,
        type,
        date,
        notes: notes || undefined,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (transaction && window.confirm(`Delete transaction for "${transaction.merchant}"?`)) {
      ds.deleteTransaction(transaction.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Ledger Entry' : 'Add Ledger Entry'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <button
            type="button"
            className="chip"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: type === 'expense' ? 'var(--error-container)' : 'var(--surface-container)',
              color: type === 'expense' ? 'var(--on-error-container)' : 'var(--on-surface-variant)',
              fontWeight: 600,
            }}
            onClick={() => setType('expense')}
          >
            Expense (–)
          </button>
          <button
            type="button"
            className="chip"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: type === 'income' ? 'var(--primary-container)' : 'var(--surface-container)',
              color: type === 'income' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              fontWeight: 600,
            }}
            onClick={() => setType('income')}
          >
            Income / Deposit (+)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Merchant / Source *</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Campus Dining, Bookstore, Paycheck"
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label className="label">Amount ({getCurrencySymbol(currency)}) *</label>
            <input
              type="number"
              step={String(1 / (10 ** currencyDigits))}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%' }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Notes / Reference</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Receipt info, split with roommates, course book receipt, etc."
            rows={2}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          {isEditing ? (
            <button
              type="button"
              className="btn-outline"
              onClick={handleDelete}
              style={{ color: 'var(--error)', borderColor: 'var(--error-container)' }}
            >
              Delete Entry
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
