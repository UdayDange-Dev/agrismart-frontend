import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { customerApi } from '../../api/customer';
import { Logo } from '../../components/Logo';
import { PasswordField } from '../../components/PasswordField';
import { ErrorNotice, Field, Loading } from '../../components/Status';
import { useAuth } from '../../lib/auth';
import { rememberReturnPath, safeNextPath, signInUrlFor } from '../../lib/redirect';
import { hasErrors, validateConfirm, validateEmail, validateName, validateNewPassword, validatePhone } from '../../lib/validation';

type Key = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword';

export function SignUpPage() {
  const { status, customer } = useAuth();
  const [params] = useSearchParams();
  // Where the visitor was going (e.g. checkout); kept through email confirmation and sign-in.
  const returnTo = safeNextPath(params.get('next'), '');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (status === 'loading') return <Loading />;
  if (customer) return <Navigate to={returnTo || '/account'} replace />;

  const set = (key: Key) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone, true),
      password: validateNewPassword(form.password, { email: form.email.trim(), name: form.name }),
      confirmPassword: validateConfirm(form.password, form.confirmPassword),
    };
    setErrors(next);
    setSubmitError(null);
    if (hasErrors(next)) return;
    setBusy(true);
    if (returnTo) rememberReturnPath(returnTo);
    try {
      const res = await customerApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        website,
      });
      setForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setDone(res.message);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Could not create your account.');
      setErrors(apiErr.fieldErrors as Partial<Record<Key, string>>);
      setSubmitError(apiErr);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Check your email</h1>
          <p className="notice notice-success" role="status">
            {done}
          </p>
          <p className="muted small">
            Open the link in the email to confirm your address. You need a confirmed email to order, send inquiries or request
            quotations.
          </p>
          <Link to={returnTo ? signInUrlFor(returnTo) : '/signin'} className="btn btn-block">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <Logo size={96} className="auth-logo" />
        <h1>Create your account</h1>
        <p className="muted">Track your orders and check out faster.</p>
        <form className="form" onSubmit={onSubmit} noValidate>
          <Field id="su-name" label="Full name" error={errors.name}>
            <input id="su-name" autoComplete="name" maxLength={100} value={form.name} onChange={(e) => set('name')(e.target.value)} aria-invalid={!!errors.name} />
          </Field>
          <Field id="su-email" label="Email" error={errors.email}>
            <input
              id="su-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field id="su-phone" label="Mobile number" error={errors.phone}>
            <input
              id="su-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={20}
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
              aria-invalid={!!errors.phone}
            />
          </Field>
          <PasswordField
            id="su-password"
            label="Password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="At least 12 characters with upper and lower case letters and a number."
          />
          <PasswordField
            id="su-confirm"
            label="Confirm password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
          />
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="su-website">Website</label>
            <input id="su-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          {submitError ? <ErrorNotice error={submitError} /> : null}
          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-alt">
          Already have an account? <Link to={returnTo ? signInUrlFor(returnTo) : '/signin'}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
