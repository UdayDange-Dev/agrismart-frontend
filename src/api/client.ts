/**
 * Thin fetch wrapper for the Agrismart API. The browser only ever talks to our own
 * backend (same origin, `/api`); ERPNext and MongoDB are never reachable from here.
 */

export interface Price {
  amount: number;
  currency: string;
}

export interface Product {
  itemCode: string;
  name: string;
  description: string;
  /** The item's own ERPNext Item Group (exact name). */
  category: string;
  categoryLabel: string;
  /** Item Group path, top-level group first. */
  categoryPath: { name: string; label: string }[];
  uom: string;
  price: Price | null;
  imageUrl: string | null;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

/** An ERPNext Item Group. `name` is the exact ERPNext name, used in `?category=` URLs. */
export interface CategoryCount {
  name: string;
  label: string;
  count: number;
}

/** A top-level Item Group with its non-empty direct sub-groups. */
export interface Category extends CategoryCount {
  children: CategoryCount[];
}

/** URL of the product listing filtered to an Item Group (and its sub-groups). */
export const categoryUrl = (name: string) => `/products?category=${encodeURIComponent(name)}`;

export interface QuoteLine {
  itemCode: string;
  name: string;
  uom: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quote {
  lines: QuoteLine[];
  currency: string;
  subtotal: number;
  itemCount: number;
}

export interface CustomerOrder {
  reference: string;
  status: 'pending_review' | 'confirmed' | 'cancelled' | 'fulfilled';
  items: QuoteLine[];
  currency: string;
  subtotal: number;
  customerName: string;
  shippingCity: string;
  createdAt: string;
}

export type InquiryKind = 'inquiry' | 'quotation';

export interface InquiryInput {
  kind: InquiryKind;
  name: string;
  phone?: string;
  company?: string;
  productInterest?: string;
  quantity?: number;
  message: string;
  website: string;
}

export interface OrderInput {
  customer: { name: string; phone: string; company?: string };
  shippingAddress: { line1: string; line2?: string; city: string; state: string; postalCode: string; country: 'India' };
  saveAddress?: boolean;
  items: { itemCode: string; qty: number }[];
  notes?: string;
  acceptTerms: true;
  website: string;
}

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level validation messages keyed by dotted path. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'validation_error' || !Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const issue of this.details as FieldIssue[]) {
      if (issue && typeof issue.path === 'string' && !out[issue.path]) out[issue.path] = String(issue.message);
    }
    return out;
  }
}

/**
 * Same-origin API path (default /api). In production Vercel rewrites it to the backend
 * (vercel.json), so session cookies stay first-party. vite.config.ts rejects absolute URLs.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/+$/, '');
const TIMEOUT_MS = 20_000;

/**
 * CSRF token of the signed-in customer's session. Held in memory only (never in
 * localStorage); it is re-fetched from /api/customer/auth/session on page load.
 */
let customerCsrfToken: string | null = null;
export const setCustomerCsrfToken = (token: string | null) => {
  customerCsrfToken = token;
};
export const getCustomerCsrfToken = () => customerCsrfToken;

/** Messages shown to users; never raw server internals. */
function friendlyMessage(status: number, fallback: string): string {
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  // 502/504 come from the proxy (Vite in development, Nginx in production) when the API is not
  // running or not answering; the request did not fail inside the application.
  if (status === 502 || status === 503 || status === 504) return 'This service is temporarily unavailable. Please try again shortly.';
  if (status >= 500) return 'Something went wrong on our side. Please try again later.';
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    /** Session-bound CSRF token, sent on state-changing requests. */
    csrfToken?: string | null;
  } = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API path must be relative');
  const headers: Record<string, string> = { Accept: 'application/json', ...init.headers };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.csrfToken && init.method && init.method !== 'GET') headers['X-CSRF-Token'] = init.csrfToken;

  const signals = [AbortSignal.timeout(TIMEOUT_MS), ...(init.signal ? [init.signal] : [])];
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
      signal: AbortSignal.any(signals),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError' && init.signal?.aborted) throw err;
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body (e.g. proxy error page)
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown; requestId?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'http_error',
      friendlyMessage(res.status, err?.message ?? 'Request failed'),
      err?.details,
      err?.requestId,
    );
  }
  return data as T;
}

export const api = {
  products: (params: { q?: string; category?: string; sort?: string; page?: number; pageSize?: number }, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
    return apiFetch<ProductPage>(`/products?${qs.toString()}`, { signal });
  },
  product: (itemCode: string, signal?: AbortSignal) => apiFetch<Product>(`/products/${encodeURIComponent(itemCode)}`, { signal }),
  categories: (signal?: AbortSignal) => apiFetch<{ items: Category[] }>('/categories', { signal }),
  quote: (items: { itemCode: string; qty: number }[]) => apiFetch<Quote>('/cart/quote', { method: 'POST', body: { items } }),
  // Inquiries and orders need a signed-in, verified customer; the API checks the session cookie
  // and its CSRF token, and uses the account's email.
  inquiry: (body: InquiryInput) =>
    apiFetch<{ reference: string; duplicate: boolean; crmSync: 'synced' | 'queued'; message: string }>('/inquiries', {
      method: 'POST',
      body,
      csrfToken: customerCsrfToken,
    }),
  createOrder: (body: OrderInput, idempotencyKey: string) =>
    apiFetch<{ order: CustomerOrder; accessToken: string | null; duplicate: boolean; addressSaved: boolean; message: string }>('/orders', {
      method: 'POST',
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
      csrfToken: customerCsrfToken,
    }),
  order: (reference: string, token: string) =>
    apiFetch<CustomerOrder>(`/orders/${encodeURIComponent(reference)}`, { headers: { 'X-Order-Token': token } }),
};
