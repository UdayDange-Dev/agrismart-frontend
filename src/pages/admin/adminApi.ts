import { apiFetch, type QuoteLine } from '../../api/client';

export type Role = 'admin' | 'staff';
export interface AdminUser {
  email: string;
  role: Role;
}

export interface AdminInquiry {
  reference: string;
  kind: 'inquiry' | 'quotation';
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  productInterest: string | null;
  quantity: number | null;
  message: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  erpLeadName: string | null;
  attempts: number;
  lastErrorKind: string | null;
  createdAt: string;
}

export interface AdminOrder {
  reference: string;
  customer: { name: string; email: string; phone: string; company: string | null };
  shippingAddress: { line1: string; line2: string | null; city: string; state: string; postalCode: string; country: string };
  items: QuoteLine[];
  currency: string;
  subtotal: number;
  priceList: string;
  notes: string | null;
  status: 'pending_review' | 'confirmed' | 'cancelled' | 'fulfilled';
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Session is an HttpOnly cookie set by the API. The staff CSRF token is kept in memory only
 * and re-fetched from /auth/me after a page reload.
 */
let staffCsrf: string | null = null;
const remember = <T extends { csrfToken?: string }>(res: T): T => {
  staffCsrf = res.csrfToken ?? null;
  return res;
};

export const adminApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: AdminUser; csrfToken: string }>('/auth/login', { method: 'POST', body: { email, password }, csrfToken: staffCsrf }).then(remember),
  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST', csrfToken: staffCsrf }).finally(() => {
      staffCsrf = null;
    }),
  me: (signal?: AbortSignal) => apiFetch<{ user: AdminUser; csrfToken: string }>('/auth/me', { signal }).then(remember),
  inquiries: (page: number, signal?: AbortSignal) => apiFetch<Page<AdminInquiry>>(`/admin/inquiries?page=${page}&pageSize=20`, { signal }),
  orders: (page: number, signal?: AbortSignal) => apiFetch<Page<AdminOrder>>(`/admin/orders?page=${page}&pageSize=20`, { signal }),
  setOrderStatus: (reference: string, status: 'confirmed' | 'cancelled' | 'fulfilled') =>
    apiFetch<{ reference: string; status: string }>(`/admin/orders/${encodeURIComponent(reference)}/status`, {
      method: 'PATCH',
      body: { status },
      csrfToken: staffCsrf,
    }),
  retrySync: (reference: string) =>
    apiFetch<{ reference: string; result: string }>(`/admin/inquiries/${encodeURIComponent(reference)}/retry-sync`, {
      method: 'POST',
      csrfToken: staffCsrf,
    }),
  refreshCatalog: () => apiFetch<{ products: number; loadedAt: string }>('/admin/catalog/refresh', { method: 'POST', csrfToken: staffCsrf }),
};
