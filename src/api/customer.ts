import { apiFetch, getCustomerCsrfToken, type CustomerOrder, type InquiryKind } from './client';

export interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'India';
}

export interface SavedAddress {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CustomerInquiry {
  reference: string;
  kind: InquiryKind;
  productInterest: string | null;
  quantity: number | null;
  message: string;
  /** `forwarded`: passed to the sales team's CRM. */
  status: 'received' | 'forwarded';
  createdAt: string;
}

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Only these fields are ever returned by the API (no ids, hashes or security state). */
export interface Customer {
  email: string;
  name: string;
  phone: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionInfo {
  customer: Customer | null;
  csrfToken: string | null;
}

interface Message {
  message: string;
}

const post = <T>(path: string, body?: unknown) =>
  apiFetch<T>(`/customer${path}`, { method: 'POST', body, csrfToken: getCustomerCsrfToken() });

export const customerApi = {
  session: (signal?: AbortSignal) => apiFetch<SessionInfo>('/customer/auth/session', { signal }),
  register: (body: { name: string; email: string; phone: string; password: string; confirmPassword: string; website: string }) =>
    post<Message>('/auth/register', body),
  login: (email: string, password: string) => post<{ customer: Customer; csrfToken: string }>('/auth/login', { email, password }),
  logout: () => post<void>('/auth/logout'),
  verifyEmail: (token: string) => post<Message & { result: 'verified' | 'email_changed' }>('/auth/verify-email', { token }),
  resendVerification: () => post<Message>('/auth/resend-verification'),
  forgotPassword: (email: string) => post<Message>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string, confirmPassword: string) =>
    post<Message>('/auth/reset-password', { token, password, confirmPassword }),
  updateProfile: (patch: { name?: string; phone?: string }) =>
    apiFetch<{ customer: Customer }>('/customer/account', { method: 'PATCH', body: patch, csrfToken: getCustomerCsrfToken() }),
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    post<Message>('/account/password', { currentPassword, newPassword, confirmPassword }),
  changeEmail: (currentPassword: string, newEmail: string) => post<Message>('/account/email', { currentPassword, newEmail }),
  orders: (page: number, signal?: AbortSignal) => apiFetch<Paged<CustomerOrder>>(`/customer/orders?page=${page}&pageSize=10`, { signal }),
  inquiries: (page: number, signal?: AbortSignal) =>
    apiFetch<Paged<CustomerInquiry>>(`/customer/inquiries?page=${page}&pageSize=10`, { signal }),
  addresses: (signal?: AbortSignal) => apiFetch<{ items: SavedAddress[]; max: number }>('/customer/addresses', { signal }),
  addAddress: (address: AddressInput) => post<SavedAddress>('/addresses', address),
  updateAddress: (id: string, address: AddressInput) =>
    apiFetch<SavedAddress>(`/customer/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', body: address, csrfToken: getCustomerCsrfToken() }),
  deleteAddress: (id: string) =>
    apiFetch<void>(`/customer/addresses/${encodeURIComponent(id)}`, { method: 'DELETE', csrfToken: getCustomerCsrfToken() }),
};
