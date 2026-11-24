/**
 * Keeps an unsent form (inquiry or checkout details) while the customer signs in again, so an
 * expired session does not lose what they typed. Stored in sessionStorage only (this tab, cleared
 * when it closes), never includes passwords, expires after an hour and is removed on sign-out.
 */
const PREFIX = 'agrismart.draft.';
const TTL_MS = 60 * 60 * 1000;

export function saveDraft(key: string, value: Record<string, unknown>): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify({ value, at: Date.now() }));
  } catch {
    // storage unavailable: nothing to restore later
  }
}

/** Returns the saved draft once (it is removed on read), or null. Only string fields are restored. */
export function takeDraft<T extends Record<string, string | boolean>>(key: string, shape: T): Partial<T> | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    window.sessionStorage.removeItem(PREFIX + key);
    const saved = raw ? (JSON.parse(raw) as { value?: Record<string, unknown>; at?: unknown }) : null;
    if (!saved?.value || typeof saved.at !== 'number' || Date.now() - saved.at > TTL_MS) return null;
    const out: Partial<T> = {};
    // Only fields the form knows about, with the expected type, are restored.
    for (const [k, example] of Object.entries(shape)) {
      const v = saved.value[k];
      if (typeof v === typeof example && (typeof v !== 'string' || v.length <= 2000)) out[k as keyof T] = v as T[keyof T];
    }
    return out;
  } catch {
    return null;
  }
}

export function clearDrafts(): void {
  try {
    for (const k of Object.keys(window.sessionStorage)) if (k.startsWith(PREFIX)) window.sessionStorage.removeItem(k);
  } catch {
    // ignore
  }
}
