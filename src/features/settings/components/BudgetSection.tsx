import { getCurrencySymbol, getCurrencyFractionDigits } from '@/lib/currency';
import type { Language } from '@/lib/i18n';

interface BudgetSectionProps {
  language: Language;
  currency: string;
  setCurrency: (c: string) => void;
  currencyError: string;
  setCurrencyError: (e: string) => void;
  monthlyBudget: string;
  setMonthlyBudget: (b: string) => void;
  initialBalance: string;
  setInitialBalance: (b: string) => void;
  timeZone: string;
  setTimeZone: (tz: string) => void;
  paymentMethodsList: string[];
  newPaymentMethod: string;
  setNewPaymentMethod: (pm: string) => void;
  handleAddPaymentMethod: () => void;
  handleDeletePaymentMethod: (pm: string) => void;
}

const CURRENCY_CODES = [
  'IDR',
  'USD',
  'EUR',
  'GBP',
  'SGD',
  'MYR',
  'AUD',
  'CAD',
  'JPY',
  'CNY',
  'INR',
  'KRW',
  'THB',
  'PHP',
  'VND',
  'NZD',
  'CHF',
  'HKD',
  'TWD',
  'AED',
  'SAR',
  'BRL',
  'MXN',
  'ZAR',
  'TRY',
  'PLN',
  'SEK',
  'NOK',
  'DKK',
  'RUB',
  'PKR',
  'BDT',
  'EGP',
  'NGN',
  'KES',
  'LKR',
  'NPR',
  'CLP',
  'COP',
  'ARS',
  'KWD',
  'QAR',
  'BHD',
  'OMR',
  'JOD',
  'ILS',
  'HUF',
  'CZK',
  'RON',
  'BGN',
];

export function BudgetSection({
  language,
  currency,
  setCurrency,
  currencyError,
  setCurrencyError,
  monthlyBudget,
  setMonthlyBudget,
  initialBalance,
  setInitialBalance,
  timeZone,
  setTimeZone,
  paymentMethodsList,
  newPaymentMethod,
  setNewPaymentMethod,
  handleAddPaymentMethod,
  handleDeletePaymentMethod,
}: BudgetSectionProps) {
  const isId = language === 'id';

  return (
    <>
      {/* Monthly Budget */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--surface-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3>{isId ? 'Anggaran Bulanan' : 'Monthly budget'}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              {isId
                ? 'Tetapkan batas pengeluaran bulanan untuk pelacakan anggaran langsung.'
                : 'Set your monthly spending cap for live budget tracking and expense alerts.'}
            </p>
          </div>
        </div>
        <div
          className="settings-budget-row"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {getCurrencySymbol(currency)}
          </span>
          <label htmlFor="monthly-budget-input" className="sr-only">
            {isId ? 'Jumlah anggaran bulanan' : 'Monthly budget amount'}
          </label>
          <input
            id="monthly-budget-input"
            type="number"
            step={String(1 / 10 ** getCurrencyFractionDigits(currency))}
            className="tabular-nums"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            style={{ width: 'min(100%, 200px)', minWidth: 90 }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            {isId ? 'per bulan kalender' : 'per calendar month'}
          </span>
        </div>
      </div>

      {/* Currency */}
      <div className="card">
        <h3 style={{ marginBottom: '0.5rem' }}>{isId ? 'Mata Uang' : 'Currency'}</h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--on-surface-variant)',
            marginBottom: '0.75rem',
          }}
        >
          {isId
            ? 'Pilih mata uang untuk anggaran dan transaksi. Mengubahnya tidak mengonversi nominal sebelumnya.'
            : 'Choose the currency used for your budget and transactions. Changing it does not convert existing amounts.'}
        </p>
        <label htmlFor="currency-setting" className="label">
          {isId ? 'Mata uang' : 'Currency'}
        </label>
        <input
          id="currency-setting"
          list="currency-code-suggestions"
          value={currency}
          maxLength={3}
          onChange={(event) => {
            setCurrency(event.target.value.toUpperCase());
            setCurrencyError('');
          }}
          placeholder="IDR"
          aria-invalid={!!currencyError}
          aria-describedby={currencyError ? 'currency-error' : undefined}
          style={{ width: '100%', textTransform: 'uppercase' }}
        />
        <datalist id="currency-code-suggestions">
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>
        {currencyError && (
          <div
            id="currency-error"
            role="alert"
            style={{ marginTop: '0.375rem', color: 'var(--error)', fontSize: '0.75rem' }}
          >
            {currencyError}
          </div>
        )}
      </div>

      {/* Saldo Kas Awal (Initial Balance) */}
      <div className="card">
        <h3 style={{ marginBottom: '0.5rem' }}>
          {isId ? 'Saldo Kas Awal (Opsional)' : 'Initial Cash Balance (Optional)'}
        </h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--on-surface-variant)',
            marginBottom: '0.75rem',
          }}
        >
          {isId
            ? 'Catat saldo awal uang tunai, e-wallet, atau rekening bank kamu sebelum mulai mencatat pengeluaran di Omnia.'
            : 'Record starting balance across cash and accounts before logging expenses in Omnia.'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {getCurrencySymbol(currency)}
          </span>
          <label htmlFor="initial-balance-input" className="sr-only">
            {isId ? 'Saldo kas awal' : 'Initial cash balance'}
          </label>
          <input
            id="initial-balance-input"
            type="number"
            step="1000"
            className="tabular-nums"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="0"
            style={{ width: 'min(100%, 200px)', minWidth: 90 }}
          />
        </div>
      </div>

      {/* Timezone */}
      <div className="card">
        <h3 style={{ marginBottom: '0.5rem' }}>{isId ? 'Zona Waktu' : 'Timezone'}</h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--on-surface-variant)',
            marginBottom: '0.75rem',
          }}
        >
          {isId
            ? 'Pilih zona waktu untuk jadwal kuliah, tenggat tugas, dan catatan pengeluaran.'
            : 'Select your preferred timezone for schedule timeline, assignment countdowns, and transactions.'}
        </p>
        <label htmlFor="timezone-setting" className="sr-only">
          {isId ? 'Pilih zona waktu' : 'Select timezone'}
        </label>
        <select
          id="timezone-setting"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          <option value="Asia/Jakarta">WIB — Asia/Jakarta (Waktu Indonesia Barat, UTC+7)</option>
          <option value="Asia/Makassar">
            WITA — Asia/Makassar (Waktu Indonesia Tengah, UTC+8)
          </option>
          <option value="Asia/Jayapura">WIT — Asia/Jayapura (Waktu Indonesia Timur, UTC+9)</option>
          <option value="UTC">UTC / GMT+0</option>
        </select>
      </div>

      {/* Payment Methods Management Card */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--surface-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>
              {isId ? 'Metode Pembayaran' : 'Payment Methods'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              {isId
                ? 'Kelola metode pembayaran yang tersedia pada formulir pencatatan pengeluaran dan Omni AI.'
                : 'Manage available payment methods for expense logging and Omni AI prefill.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {paymentMethodsList.map((pm) => (
            <span
              key={pm}
              className="badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.625rem',
                background: 'var(--surface-container-high)',
                color: 'var(--on-surface)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {pm}
              {paymentMethodsList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeletePaymentMethod(pm)}
                  aria-label={`${isId ? 'Hapus' : 'Delete'} ${pm}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--on-surface-variant)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newPaymentMethod}
            onChange={(e) => setNewPaymentMethod(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddPaymentMethod();
              }
            }}
            placeholder={isId ? 'Tambah metode (cth. GoPay, OVO)' : 'Add method (e.g. Card, Venmo)'}
            style={{ flex: 1, fontSize: '0.8125rem' }}
          />
          <button
            type="button"
            className="btn-outline"
            onClick={handleAddPaymentMethod}
            disabled={!newPaymentMethod.trim()}
            style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
          >
            {isId ? '+ Tambah' : '+ Add'}
          </button>
        </div>
      </div>
    </>
  );
}
