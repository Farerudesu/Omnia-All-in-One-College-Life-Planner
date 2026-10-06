import { useState } from 'react';
import { Modal } from './Modal';
import * as ds from '../lib/dataService';
import { useData } from '../lib/useData';
import type { TransactionType } from '../types';
import { EXPENSE_CATEGORIES } from '../lib/categories';
import { useLanguage } from '../lib/useLanguage';
import { getCurrencySymbol, getCurrencyFractionDigits } from '../lib/currency';
import { formatDateNumeric } from '../lib/dateUtils';

const CATEGORIES = EXPENSE_CATEGORIES;

export const CATEGORY_NAMES_ID: Record<string, string> = {
  'Food & Groceries': 'Food & Groceries',
  'Transport': 'Transportasi',
  'Academic Supplies': 'Kebutuhan Kuliah',
  'Housing & Utilities': 'Tempat Tinggal & Tagihan',
  'Entertainment': 'Hiburan & Gaya Hidup',
  'Health & Wellness': 'Kesehatan',
  'Other': 'Lainnya',
};

export interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  currency: string;
  onScanReceipt?: () => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  type,
  currency,
  onScanReceipt,
}: AddTransactionModalProps) {
  const lang = useLanguage();
  const paymentMethods = useData(ds.getPaymentMethods);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [isManualDate, setIsManualDate] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0] || 'QRIS');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [merchantError, setMerchantError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setMerchantError('');
    setAmountError('');
    setCustomPaymentMethod('');
    setIsManualDate(false);
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

      const finalDate = isManualDate && date ? date : new Date().toISOString().split('T')[0];

      ds.addTransaction({
        merchant: merchant.trim(),
        amount: parsedAmount,
        category: type === 'income' ? 'Income' : (category || CATEGORIES[0]),
        date: finalDate,
        type,
        notes: notes.trim() || undefined,
        paymentMethod: type === 'expense' ? (resolvedPaymentMethod || undefined) : undefined,
      });
      setMerchant('');
      setAmount('');
      setNotes('');
      setCustomPaymentMethod('');
      setMerchantError('');
      setAmountError('');
      setIsManualDate(false);
      setIsSubmitting(false);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={type === 'expense' ? (lang === 'id' ? 'Tambah pengeluaran' : 'Add expense') : (lang === 'id' ? 'Tambah pemasukan' : 'Add income')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {type === 'expense' && onScanReceipt && (
          <div style={{
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.875rem 1rem',
            border: '1px solid var(--outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                {lang === 'id' ? 'Pindai Struk dengan Omni' : 'Scan Receipt with Omni'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                {lang === 'id' ? 'Ekstraksi otomatis via AI' : 'Extract merchant, amount & category instantly'}
              </div>
            </div>
            <button
              type="button"
              className="btn-outline min-touch-target"
              onClick={onScanReceipt}
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', flexShrink: 0 }}
            >
              {lang === 'id' ? 'Buka Kamera' : 'Scan'}
            </button>
          </div>
        )}

        <div>
          <label htmlFor="tx-merchant" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {type === 'income' ? (lang === 'id' ? 'Sumber Pemasukan *' : 'Income Source *') : (lang === 'id' ? 'Nama Pengeluaran / Tempat *' : 'Merchant / Description *')}
          </label>
          <input
            id="tx-merchant"
            autoFocus
            data-autofocus
            value={merchant}
            aria-invalid={merchantError ? 'true' : 'false'}
            aria-describedby={merchantError ? 'tx-merchant-error' : undefined}
            onChange={(e) => {
              setMerchant(e.target.value);
              if (merchantError && e.target.value.trim()) setMerchantError('');
            }}
            placeholder={type === 'income' ? (lang === 'id' ? 'contoh: Beasiswa, Kiriman Orang Tua, Gaji Asisten' : 'e.g. Scholarship, Allowance, Tutoring') : (lang === 'id' ? 'contoh: Kantin Teknik, Kopi Kenangan, Fotokopi' : 'e.g. Campus Cafeteria, Bookstore, Coffee')}
            style={{
              width: '100%',
              borderColor: merchantError ? 'var(--error)' : undefined,
              boxShadow: merchantError ? '0 0 0 2px var(--error-container)' : undefined,
            }}
          />
          {merchantError && (
            <div id="tx-merchant-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
              {merchantError}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="tx-amount" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Nominal *' : 'Amount *'} ({getCurrencySymbol(currency)})
          </label>
          <input
            id="tx-amount"
            className="tabular-nums"
            type="number"
            step="any"
            value={amount}
            aria-invalid={amountError ? 'true' : 'false'}
            aria-describedby={amountError ? 'tx-amount-error' : undefined}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError && e.target.value.trim()) setAmountError('');
            }}
            placeholder={getCurrencyFractionDigits(currency) === 0 ? '0' : '0.00'}
            style={{
              width: '100%',
              borderColor: amountError ? 'var(--error)' : undefined,
              boxShadow: amountError ? '0 0 0 2px var(--error-container)' : undefined,
            }}
          />
          {amountError && (
            <div id="tx-amount-error" role="alert" style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.375rem', fontWeight: 500 }}>
              {amountError}
            </div>
          )}
        </div>

        {type === 'expense' && (
          <div>
            <label htmlFor="tx-category" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Kategori' : 'Category'}
            </label>
            <select id="tx-category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_NAMES_ID[c] || c}</option>
              ))}
            </select>
          </div>
        )}

        {type === 'expense' && (
          <div>
            <label htmlFor="tx-payment-method" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              {lang === 'id' ? 'Metode Pembayaran' : 'Payment Method'}
            </label>
            <select
              id="tx-payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%', marginBottom: paymentMethod === 'custom' ? '0.5rem' : 0 }}
            >
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <label htmlFor="tx-date" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              {lang === 'id' ? 'Waktu Transaksi' : 'Transaction Time'}
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setIsManualDate(!isManualDate)}
              style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', color: 'var(--primary)' }}
            >
              {isManualDate
                ? (lang === 'id' ? 'Gunakan waktu saat ini' : 'Use current time')
                : (lang === 'id' ? 'Catat transaksi lalu' : 'Pick past date')}
            </button>
          </div>
          {!isManualDate ? (
            <div style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              fontSize: '0.8125rem',
              color: 'var(--on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                {lang === 'id' ? 'Otomatis (Saat ini):' : 'Auto (Now):'}
              </span>
              <span className="tabular-nums">
                {formatDateNumeric(new Date())} {time}
              </span>
            </div>
          ) : (
            <div className="modal-form-grid-2col">
              <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
              <input id="tx-time" className="tabular-nums" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%' }} />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="tx-notes" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
            {lang === 'id' ? 'Catatan (opsional)' : 'Notes (optional)'}
          </label>
          <textarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={lang === 'id' ? 'Catatan transaksi...' : 'Notes...'} rows={2} style={{ width: '100%', resize: 'vertical' }} />
        </div>

        <div className="modal-actions-sticky">
          <button type="button" className="btn-outline" onClick={handleClose} disabled={isSubmitting}>
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? (lang === 'id' ? 'Menyimpan…' : 'Saving…') : type === 'expense' ? (lang === 'id' ? 'Tambah pengeluaran' : 'Add expense') : (lang === 'id' ? 'Tambah pemasukan' : 'Add income')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
