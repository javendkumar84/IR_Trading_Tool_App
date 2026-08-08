import { Currency } from '../types';

/**
 * Standardized Spot FX Exchange Rates relative to USD base
 */
export const FX_RATES_TO_USD: Record<Currency, number> = {
  USD: 1.0,
  EUR: 1.085,    // 1 EUR = 1.085 USD
  GBP: 1.280,    // 1 GBP = 1.280 USD
  JPY: 0.0065,   // 1 JPY = 0.0065 USD (153.8 JPY per USD)
  CAD: 0.735,    // 1 CAD = 0.735 USD
  AUD: 0.655,    // 1 AUD = 0.655 USD
  CHF: 1.135,    // 1 CHF = 1.135 USD
};

/**
 * Currency Symbols
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'CHF',
};

/**
 * Converts an amount from one currency to another using spot FX rates
 */
export function convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency): number {
  if (!amount || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;

  const rateFromUsd = FX_RATES_TO_USD[fromCurrency] || 1.0;
  const rateToUsd = FX_RATES_TO_USD[toCurrency] || 1.0;

  // Convert from source currency -> USD -> target currency
  const usdAmount = amount * rateFromUsd;
  const targetAmount = usdAmount / rateToUsd;

  return Math.round(targetAmount);
}

/**
 * Formats a currency amount with currency code or symbol
 */
export function formatCurrencyAmount(amount: number, currency: Currency, showSymbol = true): string {
  const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] || currency : '';
  const formatted = Math.round(amount).toLocaleString();
  return `${symbol} ${formatted}`.trim();
}
