import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { customerApi } from '../../api/customer';
import { PasswordField } from '../../components/PasswordField';
import { ErrorNotice, Field } from '../../components/Status';
import { useAuth } from '../../lib/auth';
import { forgetReturnPath, rememberedReturnPath, signInUrlFor } from '../../lib/redirect';
import { useFragmentToken } from '../../lib/useFragmentToken';
import { validateConfirm, validateEmail, validateNewPassword } from '../../lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = validateEmail(email);
    setFieldError(problem);
    setError(null);
    if (problem) return;
    setBusy(true);
    try {
      setDone((await customerApi.forgotPassword(email.trim())).message);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Request failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Forgot your password?</h1>
        {done ? (
          // Same message whether or not the account exists.
          <p className="notice notice-success" role="status">
            {done}
          </p>
        ) : (
          <form className="form" onSubmit={onSubmit} noValidate>
            <p className="muted">Enter your account email and we will send you a link to choose a new password.</p>
            <Field id="fp-email" label="Email" error={fieldError}>
              <input id="fp-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error ? <ErrorNotice error={error} /> : null}
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="auth-alt">
          <Link to="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { token, visit } = useFragmentToken();
  const { refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | undefined; confirmPassword?: string | undefined }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forVisit, setForVisit] = useState(visit);
  if (visit !== forVisit) {
    // A link was opened (again) in this tab: start fresh for this visit.
    setForVisit(visit);
    setError(null);
    setDone(null);
  }

  if (!token && !done) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Reset link not valid</h1>
          <p>This password reset link is incomplete or has already been used.</p>
          <Link to="/forgot-password" className="btn btn-block">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !token) return;
    const next = { password: validateNewPassword(password), confirmPassword: validateConfirm(password, confirm) };
    setErrors(next);
    setError(null);
    if (next.password || next.confirmPassword) return;
    setBusy(true);
    try {
      const res = await customerApi.resetPassword(token, password, confirm);
      setPassword('');
      setConfirm('');
      setDone(res.message);
      await refresh(); // all sessions were revoked server-side
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Could not reset your password.');
      setErrors(apiErr.fieldErrors);
      setError(apiErr);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Choose a new password</h1>
        {done ? (
          <>
            <p className="notice notice-success" role="status">
              {done}
            </p>
            <Link to="/signin" className="btn btn-block">
              Sign in
            </Link>
          </>
        ) : (
          <form className="form" onSubmit={onSubmit} noValidate>
            <PasswordField
              id="rp-password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              hint="At least 12 characters with upper and lower case letters and a number."
            />
            <PasswordField id="rp-confirm" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirmPassword} />
            {error ? (
              <ErrorNotice error={error}>
                {error.code === 'invalid_token' ? <Link to="/forgot-password">Request a new link</Link> : null}
              </ErrorNotice>
            ) : null}
            <button className="btn btn-block" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const { token, visit } = useFragmentToken();
  const { customer, refresh } = useAuth();
  // Where the customer was going when they created the account (e.g. checkout), if anywhere.
  const returnTo = rememberedReturnPath();
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forVisit, setForVisit] = useState(visit);
  if (visit !== forVisit) {
    setForVisit(visit);
    setError(null);
    setDone(null);
  }

  // Verification needs an explicit click, so link scanners that prefetch emails cannot use the token.
  const confirm = async () => {
    if (busy || !token) return;
    setBusy(true);
    setError(null);
    try {
      setDone((await customerApi.verifyEmail(token)).message);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Verification failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Confirm your email</h1>
        {done ? (
          <>
            <p className="notice notice-success" role="status">
              {done}
            </p>
            {customer ? (
              <Link to={returnTo ?? '/account'} className="btn btn-block" onClick={forgetReturnPath}>
                {returnTo ? 'Continue where you left off' : 'Go to my account'}
              </Link>
            ) : (
              // Sign-in falls back to the remembered destination (e.g. checkout) by itself.
              <Link to={returnTo ? signInUrlFor(returnTo) : '/signin'} className="btn btn-block">
                {returnTo ? 'Sign in to continue' : 'Sign in'}
              </Link>
            )}
          </>
        ) : token ? (
          <>
            <p>Click the button below to confirm this email address for your AGRI SMART account.</p>
            {error ? <ErrorNotice error={error} /> : null}
            <button className="btn btn-block" onClick={confirm} disabled={busy}>
              {busy ? 'Confirming…' : 'Confirm email address'}
            </button>
          </>
        ) : (
          <>
            <p>This confirmation link is incomplete or has already been used.</p>
            <p className="muted small">You can request a new link from your account page after signing in.</p>
            <Link to="/account" className="btn btn-block">
              My account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
