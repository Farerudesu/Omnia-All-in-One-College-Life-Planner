import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';
import { getCurrencyFractionDigits, getCurrencySymbol } from '../lib/currency';
import { EXPENSE_CATEGORIES, normalizeTransactionCategory } from '../lib/categories';
import { CATEGORY_NAMES_ID } from '../pages/FinancePage';
import { useLanguage } from '../lib/useLanguage';
import type { Transaction, TransactionType } from '../types';

interface TransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionModal({ transaction, isOpen, onClose }: TransactionModalProps) {
  const lang = useLanguage();
  const isEditing = !!transaction;
  const currency = useData(ds.getSettings).currency || 'IDR';
  const currencyDigits = getCurrencyFractionDigits(currency);
  const paymentMethods = useData(ds.getPaymentMethods);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [merchantError, setMerchantError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setMerchant(transaction.merchant);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setCategory(normalizeTransactionCategory(transaction.category, transaction.type));
      setDate(transaction.date);
      setNotes(transaction.notes || '');
      setPaymentMethod(transaction.paymentMethod || paymentMethods[0] || 'QRIS');
      setCustomPaymentMethod('');
    } else {
      setMerchant('');
      setAmount('');
      setType('expense');
      setCategory(EXPENSE_CATEGORIES[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setPaymentMethod(paymentMethods[0] || 'QRIS');
      setCustomPaymentMethod('');
    }
    setMerchantError('');
    setAmountError('');
    setIsSubmitting(false);
  }, [transaction, isOpen]);

  const handleClose = () => {
    setMerchantError('');
    setAmountError('');
    setCustomPaymentMethod('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSave = () => {
    let hasError = false;
    if (!merchant.trim()) {
      setMerchantError(
        lang === 'id'
          ? (type === 'income' ? 'Sumber pemasukan tidak boleh kosong' : 'Nama pengeluaran tidak boleh kosong')
          : (type === 'income' ? 'Source is required' : 'Merchant description is required')
      );
      hasError = true;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError(
        lang === 'id'
          ? (currency === 'IDR' ? 'Nominal harus lebih dari Rp0' : `Nominal harus lebih dari ${getCurrencySymbol(currency)}0`)
          : `Amount must be greater than ${getCurrencySymbol(currency)}0`
      );
      hasError = true;
    }

    if (hasError) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const resolvedPaymentMethod = paymentMethod === 'custom' ? customPaymentMethod.trim() : paymentMethod;
      if (paymentMethod === 'custom' && customPaymentMethod.trim()) {
        ds.addPaymentMethod(customPaymentMethod.trim());
      }
      const finalCategory = type === 'income' ? 'Income' : (category || EXPENSE_CATEGORIES[0]);
      if (transaction) {
        ds.updateTransaction(transaction.id, {
          merchant: merchant.trim(),
          amount: parsedAmount,
          category: finalCategory,
          type,
          date,
          notes: notes.trim() || undefined,
          paymentMethod: type === 'expense' ? (resolvedPaymentMethod || undefined) : undefined,
        });
      } else {
        ds.addTransaction({
          merchant: merchant.trim(),
          amount: parsedAmount,
          category: finalCategory,
          type,
          date,
          notes: notes.trim() || undefined,
          paymentMethod: type === 'expense' ? (resolvedPaymentMethod || undefined) : undefined,
        });
      }
      setMerchantError('');
      setAmountError('');
      setCustomPaymentMethod('');
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (transaction && window.confirm(lang === 'id' ? `Hapus transaksi "${transaction.merchant}"?` : `Delete transaction for "${transaction.merchant}"?`)) {
      ds.deleteTransaction(transaction.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? (lang === 'id' ? 'Ubah Catatan Keuangan' : 'Edit Ledger Entry') : (lang === 'id' ? 'Tambah Catatan Keuangan' : 'Add Ledger Entry')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div role="group" aria-label="Transaction type" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <button
            type="button"
            className="chip"
            aria-pressed={type === 'expense'}
            style={{
              flex: 1,
              justifyContent: 'center',
              background: type === 'expense' ? 'var(--error-container)' : 'var(--surface-container)',
              color: type === 'expense' ? 'var(--on-error-container)' : 'var(--on-surface-variant)',
              fontWeight: 600,
            }}
            onClick={() => setType('expense')}
          >
            {lang === 'id' ? 'Pengeluaran (–)' : 'Expense (–)'}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={type === 'income'}
            style={{
              flex: 1,
              justifyContent: 'center',
              background: type === 'income' ? 'var(--primary-container)' : 'var(--surface-container)',
              color: type === 'income' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
              fontWeight: 600,
            }}
            onClick={() => setType('income')}
          >
            {lang === 'id' ? 'Pemasukan / Setoran (+)' : 'Income / Deposit (+)'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">
              {type === 'income' ? (lang === 'id' ? 'Sumber dana *' : 'Source *') : (lang === 'id' ? 'Tempat / Pengeluaran *' : 'Merchant / Source *')}
            </label>
            <input
              type="text"
              value={merchant}
              aria-invalid={merchantError ? 'true' : 'false'}
              aria-describedby={merchantError ? 'edit-tx-merchant-error' : undefined}
              onChange={(e) => {
                setMerchant(e.target.value);
                if (merchantError && e.target.value.trim()) setMerchantError('');
              }}
              placeholder={type === 'income' ? (lang === 'id' ? 'Contoh: Beasiswa, Gaji' : 'e.g. Stipend, Paycheck') : (lang === 'id' ? 'Contoh: Kantin, Buku, Kopi' : 'e.g. Campus Dining, Bookstore')}
              style={{
                width: '100%',
                borderColor: merchantError ? 'var(--error)' : undefined,
                boxShadow: merchantError ? '0 0 0 2px var(--error-container)' : undefined,
              }}
              required
            />
            {merchantError && (
              <div id="edit-tx-merchant-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
                {merchantError}
              </div>
            )}
          </div>
          <div>
            <label className="label">
              {lang === 'id' ? `Nominal (${getCurrencySymbol(currency)}) *` : `Amount (${getCurrencySymbol(currency)}) *`}
            </label>
            <input
              type="number"
              step={String(1 / (10 ** currencyDigits))}
              value={amount}
              aria-invalid={amountError ? 'true' : 'false'}
              aria-describedby={amountError ? 'edit-tx-amount-error' : undefined}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError('');
              }}
              placeholder={currencyDigits === 0 ? '0' : '0.00'}
              style={{
                width: '100%',
                borderColor: amountError ? 'var(--error)' : undefined,
                boxShadow: amountError ? '0 0 0 2px var(--error-container)' : undefined,
              }}
              required
            />
            {amountError && (
              <div id="edit-tx-amount-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
                {amountError}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">
              {lang === 'id' ? 'Kategori' : 'Category'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%' }}
            >
              {type === 'income' ? (
                <option value="Income">{lang === 'id' ? 'Pemasukan' : 'Income'}</option>
              ) : (
                EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {lang === 'id' ? (CATEGORY_NAMES_ID[cat] || cat) : cat}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="label">
              {lang === 'id' ? 'Tanggal *' : 'Date *'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
              required
            />
          </div>
        </div>

        {type === 'expense' && (
          <div>
            <label className="label">
              {lang === 'id' ? 'Metode Pembayaran' : 'Payment Method'}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%', marginBottom: paymentMethod === 'custom' ? '0.5rem' : 0 }}
            >
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
              <option value="custom">{lang === 'id' ? 'Lainnya (Kustom)...' : 'Custom...'}</option>
            </select>
            {paymentMethod === 'custom' && (
              <input
                type="text"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                placeholder={lang === 'id' ? 'Masukkan nama metode pembayaran' : 'Enter payment method name'}
                style={{ width: '100%' }}
                autoFocus
              />
            )}
          </div>
        )}

        <div>
          <label className="label">
            {lang === 'id' ? 'Catatan / Keterangan' : 'Notes / Reference'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === 'id' ? 'Catatan struk, nomor referensi...' : 'Receipt info, split with roommates, etc.'}
            rows={2}
            style={{ width: '100%' }}
          />
        </div>

        <div className="modal-actions-sticky" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {isEditing ? (
            <button
              type="button"
              className="btn-outline"
              onClick={handleDelete}
              disabled={isSubmitting}
              style={{ color: 'var(--error)', borderColor: 'var(--error-container)' }}
            >
              {lang === 'id' ? 'Hapus Transaksi' : 'Delete Entry'}
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-ghost" onClick={handleClose} disabled={isSubmitting}>
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting
                ? (lang === 'id' ? 'Menyimpan…' : 'Saving…')
                : isEditing
                  ? (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes')
                  : (lang === 'id' ? 'Catat Transaksi' : 'Record Transaction')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
