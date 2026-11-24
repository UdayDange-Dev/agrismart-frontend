import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { rememberReturnPath, signInUrlFor, signUpUrlFor } from '../lib/redirect';
import { Loading } from './Status';
import { VerifyNotice } from './VerifyNotice';

/**
 * Shows `children` only to a signed-in customer with a confirmed email. Visitors get Sign in and
 * Create account, both of which come back to this page (with its product/quote parameters)
 * afterwards. This is presentation only: the API enforces the same rule on every request.
 */
export function AuthGate({ action, note, children }: { action: string; note?: ReactNode; children: ReactNode }) {
  const { status, customer, refresh } = useAuth();
  const location = useLocation();
  const here = `${location.pathname}${location.search}`;
  const [checking, setChecking] = useState(false);

  if (status === 'loading') return <Loading />;

  if (!customer) {
    return (
      <section className="card auth-gate" aria-labelledby="auth-gate-title">
        <h2 id="auth-gate-title">Sign in to {action}</h2>
        <p>
          You need an AGRI SMART account with a confirmed email address to {action}. Browsing products doesn’t need an account.
        </p>
        {note}
        <div className="auth-gate__actions">
          <Link className="btn" to={signInUrlFor(here)}>
            Sign in
          </Link>
          <Link className="btn btn-outline" to={signUpUrlFor(here)} onClick={() => rememberReturnPath(here)}>
            Create account
          </Link>
        </div>
      </section>
    );
  }

  if (!customer.emailVerified) {
    return (
      <section className="card auth-gate" aria-labelledby="auth-gate-title">
        <h2 id="auth-gate-title">Confirm your email to {action}</h2>
        <VerifyNotice
          returnTo={here}
          message={`We sent a confirmation link to ${customer.email}. Open it, then come back to this page.`}
        />
        {note}
        <div className="auth-gate__actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              await refresh();
              setChecking(false);
            }}
          >
            {checking ? 'Checking…' : 'I’ve confirmed my email'}
          </button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
