import { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { updateSettings } from '../../settings/data/profileService';
import { useToast } from '../../../components/Toast';
import { formatCurrency } from '../../../lib/currency';
import type { UserSettings } from '../../../types';
import { SlidersHorizontal, Wallet, Check, AlertCircle } from 'lucide-react';

interface AdjustBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  lang?: 'en' | 'id';
  focusSection?: 'all' | 'budget' | 'balance';
  onSaved?: () => void;
}

export function AdjustBudgetModal({
  isOpen,
  onClose,
  settings,
  lang = 'id',
  focusSection = 'all',
  onSaved,
}: AdjustBudgetModalProps) {
  const { showToast } = useToast();
  const currency = settings.currency || 'IDR';
  const isId = lang === 'id';

  const [monthlyBudgetValue, setMonthlyBudgetValue] = useState('');
  const [initialBalanceValue, setInitialBalanceValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMonthlyBudgetValue(
        settings.monthlyBudget !== undefined && settings.monthlyBudget !== null
          ? String(settings.monthlyBudget)
          : '0'
      );
      setInitialBalanceValue(
        settings.initialBalance !== undefined && settings.initialBalance !== null
          ? String(settings.initialBalance)
          : '0'
      );
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, settings.monthlyBudget, settings.initialBalance]);

  const presetBudgets =
    currency === 'IDR'
      ? [1000000, 1500000, 2000000, 2500000, 3000000]
      : [100, 200, 300, 500, 800];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = parseFloat(monthlyBudgetValue);
    const balanceNum = parseFloat(initialBalanceValue);

    if (isNaN(budgetNum) || budgetNum < 0) {
      setErrorMsg(
        isId
          ? 'Batas anggaran bulanan harus berupa angka non-negatif.'
          : 'Monthly budget must be a non-negative number.'
      );
      return;
    }
    if (isNaN(balanceNum)) {
      setErrorMsg(
        isId
          ? 'Saldo awal harus berupa angka valid.'
          : 'Initial balance must be a valid number.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      updateSettings({
        monthlyBudget: Math.round(budgetNum),
        initialBalance: Math.round(balanceNum),
      });

      // Mark onboarding as completed
      localStorage.setItem('omnia_finance_onboarded', 'true');

      showToast({
        type: 'success',
        message: isId
          ? 'Batas anggaran dan saldo awal berhasil diperbarui.'
          : 'Budget limit and initial balance have been updated.',
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isId
          ? 'Gagal menyimpan pengaturan.'
          : 'Failed to save settings.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        focusSection === 'balance'
          ? isId
            ? 'Atur Saldo Kas Awal'
            : 'Adjust Initial Balance'
          : focusSection === 'budget'
          ? isId
            ? 'Atur Batas Anggaran Bulanan'
            : 'Adjust Monthly Budget Cap'
          : isId
          ? 'Pengaturan Batas & Saldo Keuangan'
          : 'Finance Limits & Balance Setup'
      }
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          {isId
            ? 'Tentukan target anggaran dan saldo kas untuk memantau pengeluaran kuliahmu secara akurat dan mencegah overspending.'
            : 'Set your budget target and cash balance to accurately track student expenses and prevent overspending.'}
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              color: 'var(--error)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Monthly Budget Cap */}
        {(focusSection === 'all' || focusSection === 'budget') && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <SlidersHorizontal size={18} style={{ color: 'var(--primary)' }} />
              <label
                htmlFor="modal-monthly-budget"
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--on-surface)' }}
              >
                {isId ? 'Batas Anggaran Bulanan' : 'Monthly Budget Cap'}
              </label>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {isId
                ? 'Target maksimal pengeluaran per bulan kalender. Atur ke 0 jika belum ingin menetapkan batas.'
                : 'Maximum monthly spending target. Set to 0 if you do not want a limit yet.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                {currency}
              </span>
              <input
                id="modal-monthly-budget"
                type="number"
                min="0"
                step="1000"
                className="input min-touch-target tabular-nums"
                value={monthlyBudgetValue}
                onChange={(e) => setMonthlyBudgetValue(e.target.value)}
                placeholder="0"
                style={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}
              />
            </div>

            {/* Quick Presets */}
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginBottom: '0.375rem' }}>
                {isId ? 'Pilihan Cepat:' : 'Quick Presets:'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setMonthlyBudgetValue('0')}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    borderColor: monthlyBudgetValue === '0' ? 'var(--primary)' : undefined,
                    color: monthlyBudgetValue === '0' ? 'var(--primary)' : undefined,
                  }}
                >
                  {isId ? 'Tanpa Batas (Rp 0)' : 'No Limit (0)'}
                </button>
                {presetBudgets.map((amt) => {
                  const isSelected = parseFloat(monthlyBudgetValue) === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      className="btn-outline"
                      onClick={() => setMonthlyBudgetValue(String(amt))}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        borderColor: isSelected ? 'var(--primary)' : undefined,
                        color: isSelected ? 'var(--primary)' : undefined,
                        background: isSelected ? 'var(--surface-container-high)' : undefined,
                      }}
                    >
                      {formatCurrency(amt, currency)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Initial Cash Balance */}
        {(focusSection === 'all' || focusSection === 'balance') && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Wallet size={18} style={{ color: 'var(--primary)' }} />
              <label
                htmlFor="modal-initial-balance"
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--on-surface)' }}
              >
                {isId ? 'Saldo Kas / Rekening Awal' : 'Initial Cash / Account Balance'}
              </label>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {isId
                ? 'Total uang kas di dompet, rekening bank, atau e-wallet kamu saat ini sebelum pencatatan transaksi.'
                : 'Current total money in your wallet, bank, or e-wallet before tracking new transactions.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                {currency}
              </span>
              <input
                id="modal-initial-balance"
                type="number"
                step="1000"
                className="input min-touch-target tabular-nums"
                value={initialBalanceValue}
                onChange={(e) => setInitialBalanceValue(e.target.value)}
                placeholder="0"
                style={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-outline min-touch-target"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {isId ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn-primary min-touch-target"
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Check size={16} />
            <span>{isSubmitting ? (isId ? 'Menyimpan...' : 'Saving...') : isId ? 'Simpan & Terapkan' : 'Save & Apply'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
