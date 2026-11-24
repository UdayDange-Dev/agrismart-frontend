/**
 * Order access tokens are kept in sessionStorage (cleared when the tab closes) so the
 * customer can view the confirmation page. They only grant read access to one order's
 * summary; the site CSP limits script injection that could read them.
 */
const KEY = 'agrismart.orders.v1';
const REF = /^AGS-[A-HJ-NP-Z2-9]{10}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

function readAll(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [ref, token] of Object.entries(parsed as Record<string, unknown>)) {
      if (REF.test(ref) && typeof token === 'string' && TOKEN.test(token)) out[ref] = token;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveOrderToken(reference: string, token: string): void {
  if (!REF.test(reference) || !TOKEN.test(token)) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...readAll(), [reference]: token }));
  } catch {
    // storage unavailable
  }
}

export const getOrderToken = (reference: string): string | null => readAll()[reference] ?? null;
export const isOrderReference = (value: string) => REF.test(value);
