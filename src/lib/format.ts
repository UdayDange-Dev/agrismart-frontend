import type { Price } from '../api/client';

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const formatPrice = (price: Price | null): string => (price ? formatMoney(price.amount, price.currency) : 'Ask for price');

/** Only same-origin relative paths are used for images/links built from API data. */
export function safeRelativeUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null;
  return url;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_review: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  fulfilled: 'Fulfilled',
};
