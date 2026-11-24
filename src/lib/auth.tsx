import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setCustomerCsrfToken } from '../api/client';
import { customerApi, type Customer } from '../api/customer';
import { clearDrafts } from './formDraft';
import { forgetReturnPath } from './redirect';

/**
 * Customer authentication state. The session itself is an HttpOnly cookie the browser
 * cannot read; this context only mirrors "who is signed in" and keeps the CSRF token
 * in memory. Nothing auth-related is written to localStorage or sessionStorage.
 */
interface AuthContextValue {
  status: 'loading' | 'ready';
  customer: Customer | null;
  /** True after the customer signed out on purpose (until they sign in again). */
  signedOut: boolean;
  refresh(): Promise<void>;
  signIn(email: string, password: string): Promise<Customer>;
  signOut(): Promise<void>;
  setCustomer(customer: Customer | null): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const load = useCallback(
    () =>
      customerApi.session().then(
        (session) => {
          setCustomerCsrfToken(session.csrfToken);
          setCustomer(session.customer);
          setStatus('ready');
        },
        () => {
          setCustomerCsrfToken(null);
          setCustomer(null);
          setStatus('ready');
        },
      ),
    [],
  );
  const refresh = useCallback(() => load(), [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await customerApi.login(email, password);
    setCustomerCsrfToken(res.csrfToken);
    setCustomer(res.customer);
    setSignedOut(false);
    return res.customer;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await customerApi.logout();
    } finally {
      setCustomerCsrfToken(null);
      setSignedOut(true);
      setCustomer(null);
      // On a shared computer, the next person must not see this customer's unsent forms.
      clearDrafts();
      forgetReturnPath();
    }
  }, []);

  const value = useMemo(
    () => ({ status, customer, signedOut, refresh, signIn, signOut, setCustomer }),
    [status, customer, signedOut, refresh, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
