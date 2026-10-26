const currencyLocales: Record<string, string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  SGD: 'en-SG',
  MYR: 'ms-MY',
  AUD: 'en-AU',
  CAD: 'en-CA',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  INR: 'en-IN',
  KRW: 'ko-KR',
  THB: 'th-TH',
  PHP: 'en-PH',
  VND: 'vi-VN',
};

export function isSupportedCurrencyCode(currency: string): boolean {
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code });
    return true;
  } catch {
    return false;
  }
}

export function normalizeCurrency(currency?: string): string {
  const code = currency?.trim().toUpperCase() || 'IDR';
  return isSupportedCurrencyCode(code) ? code : 'IDR';
}

export const ZERO_DECIMAL_CURRENCIES = new Set([
  'IDR',
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'PYG',
  'RWF',
  'UGX',
  'BIF',
  'DJF',
  'GNF',
  'KMF',
  'MGA',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function getCurrencyFractionDigits(currency?: string): number {
  const code = normalizeCurrency(currency);
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 0;
  }
  return (
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

export function getCurrencyScale(currency?: string): number {
  return 10 ** getCurrencyFractionDigits(currency);
}

export function formatCurrency(amount: number, currency?: string): string {
  const code = normalizeCurrency(currency);
  const fractionDigits = getCurrencyFractionDigits(code);
  return new Intl.NumberFormat(currencyLocales[code], {
    style: 'currency',
    currency: code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function getCurrencySymbol(currency?: string): string {
  const code = normalizeCurrency(currency);
  const locale = currencyLocales[code];
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency: code })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value || code
  );
}
