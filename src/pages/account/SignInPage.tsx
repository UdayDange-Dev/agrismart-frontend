import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { Logo } from '../../components/Logo';
import { PasswordField } from '../../components/PasswordField';
import { ErrorNotice, Field, Loading } from '../../components/Status';
import { useAuth } from '../../lib/auth';
import { forgetReturnPath, rememberedReturnPath, safeNextPath, signUpUrlFor } from '../../lib/redirect';
import { validateEmail } from '../../lib/validation';

export function SignInPage() {
  const { status, customer, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // Only internal paths are accepted as the post-login destination (no open redirect). Without
  // `next`, a destination remembered at sign-up (e.g. checkout) is used after confirming the email.
  const requested = params.get('next');
  // Read once: it is cleared on sign-in, before the signed-in re-render redirects to `next`.
  const [remembered] = useState(rememberedReturnPath);
  const next = safeNextPath(requested ?? remembered);
  const continuing = requested !== null && next !== '/account';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | undefined; password?: string | undefined }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'loading') return <Loading />;
  if (customer) return <Navigate to={next} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const nextErrors = { email: validateEmail(email), password: password ? undefined : 'Please enter your password.' };
    setErrors(nextErrors);
    setError(null);
    if (nextErrors.email || nextErrors.password) return;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      setPassword('');
      forgetReturnPath();
      navigate(next, { replace: true });
    } catch (err) {
      setPassword('');
      setError(err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Sign in failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <Logo size={96} className="auth-logo" />
        <h1>Sign in</h1>
        {continuing ? (
          <p className="notice notice-info">Sign in to continue. You will return to where you left off.</p>
        ) : null}
        <form className="form" onSubmit={onSubmit} noValidate>
          <Field id="si-email" label="Email" error={errors.email}>
            <input
              id="si-email"
              type="email"
              autoComplete="username"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <PasswordField
            id="si-password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
          <p className="small">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
          {/* Server message is deliberately generic: it never says whether the account exists. */}
          {error ? <ErrorNotice error={error} /> : null}
          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-alt">
          New to AGRI SMART? <Link to={continuing ? signUpUrlFor(next) : '/signup'}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
