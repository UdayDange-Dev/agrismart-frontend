/**
 * Client-side checks for fast feedback only. The backend re-validates everything and is
 * the security boundary; these rules mirror its limits so users see the same messages.
 */

export type Errors<T extends string> = Partial<Record<T, string>>;

// eslint-disable-next-line no-control-regex -- detecting control characters is the intent
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9 ()-]{6,18}[0-9]$/;
const POSTAL = /^[A-Za-z0-9 -]{3,12}$/;

export function validateName(v: string): string | undefined {
  const t = v.trim();
  if (t.length < 2) return 'Please enter your name.';
  if (t.length > 100) return 'Name is too long.';
  if (!NAME.test(t)) return 'Name contains invalid characters.';
  return undefined;
}

export function validateEmail(v: string): string | undefined {
  const t = v.trim();
  if (!t) return 'Please enter your email.';
  if (t.length > 254 || !EMAIL.test(t)) return 'Enter a valid email address.';
  return undefined;
}

export function validatePhone(v: string, required: boolean): string | undefined {
  const t = v.trim();
  if (!t) return required ? 'Please enter your phone number.' : undefined;
  if (!PHONE.test(t)) return 'Enter a valid phone number.';
  return undefined;
}

export function validateText(v: string, label: string, min: number, max: number): string | undefined {
  const t = v.trim();
  if (CONTROL.test(t)) return `${label} contains invalid characters.`;
  if (t.length < min) return min <= 1 ? `Please enter ${label.toLowerCase()}.` : `${label} must be at least ${min} characters.`;
  if (t.length > max) return `${label} must be at most ${max} characters.`;
  return undefined;
}

export function validatePostal(v: string): string | undefined {
  return POSTAL.test(v.trim()) ? undefined : 'Enter a valid postal code.';
}

const COMMON_PASSWORDS = new Set(
  ['password1234', 'password@123', 'welcome@1234', 'qwerty123456', 'admin@123456', 'agrismart123', 'agrismart@123', 'abcd@1234567', 'iloveyou1234', 'india@123456'],
);

/** Mirrors the backend password policy (Backend/src/lib/password.ts). */
export function validateNewPassword(password: string, context: { email?: string; name?: string } = {}): string | undefined {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (password.length > 128) return 'Use at most 128 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Include upper and lower case letters and a number.';
  }
  if (/^(.)\1+$/.test(password) || COMMON_PASSWORDS.has(password.toLowerCase())) return 'This password is too common.';
  const lower = password.toLowerCase();
  const local = context.email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return 'Do not include your email address.';
  const first = context.name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (first && first.length >= 4 && lower.includes(first)) return 'Do not include your name.';
  return undefined;
}

export function validateConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Please confirm your password.';
  return password === confirm ? undefined : 'Passwords do not match.';
}

export const hasErrors =(errors: Record<string, string | undefined>) => Object.values(errors).some(Boolean);
