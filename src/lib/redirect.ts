const AUTH_PAGES = /^\/(signin|signup|forgot-password|reset-password|verify-email)(\/|$)/;

/**
 * Returns a safe internal path to continue to after sign-in, or the fallback.
 * Rejects absolute URLs, protocol-relative (`//evil`), backslash tricks (`/\evil`),
 * control characters, other origins and the auth pages themselves (no loops).
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/account'): string {
  if (!raw || raw.length > 512) return fallback;
  try {
    // Check both the raw and the percent-decoded form, so encoded tricks (%2F%2F, %0d%0a, %5C) fail too.
    for (const candidate of [raw, decodeURIComponent(raw)]) {
      // eslint-disable-next-line no-control-regex -- rejecting control characters is the intent
      if (!candidate.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u001F\u007F]/.test(candidate)) return fallback;
    }
    const base = window.location.origin;
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    if (AUTH_PAGES.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Builds `/signin?next=...` for the current location. */
export const signInUrlFor = (pathWithSearch: string) => `/signin?next=${encodeURIComponent(pathWithSearch)}`;
/** Builds `/signup?next=...`; the destination is kept through email confirmation. */
export const signUpUrlFor = (pathWithSearch: string) => `/signup?next=${encodeURIComponent(pathWithSearch)}`;

/**
 * Where a new customer was going when they had to create an account. Email confirmation often
 * opens in a new tab, so this lives in localStorage (only an internal path, re-validated with
 * safeNextPath on every read) and expires with the confirmation link.
 */
const RETURN_KEY = 'agrismart.returnTo.v1';
const RETURN_TTL_MS = 24 * 60 * 60 * 1000;

export function rememberReturnPath(raw: string | null | undefined): void {
  const path = safeNextPath(raw, '');
  try {
    if (path) window.localStorage.setItem(RETURN_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // storage unavailable: the customer can still navigate back themselves
  }
}

export function rememberedReturnPath(): string | null {
  try {
    const raw = window.localStorage.getItem(RETURN_KEY);
    const saved = raw ? (JSON.parse(raw) as { path?: unknown; at?: unknown }) : null;
    if (!saved || typeof saved.path !== 'string' || typeof saved.at !== 'number' || Date.now() - saved.at > RETURN_TTL_MS) return null;
    return safeNextPath(saved.path, '') || null;
  } catch {
    return null;
  }
}

export function forgetReturnPath(): void {
  try {
    window.localStorage.removeItem(RETURN_KEY);
  } catch {
    // ignore
  }
}
