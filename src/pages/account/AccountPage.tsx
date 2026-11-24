import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { customerApi, type Customer } from '../../api/customer';
import { AccountNav } from '../../components/AccountNav';
import { PasswordField } from '../../components/PasswordField';
import { ErrorNotice, Field } from '../../components/Status';
import { VerifyNotice } from '../../components/VerifyNotice';
import { useAuth } from '../../lib/auth';
import { validateConfirm, validateEmail, validateName, validateNewPassword, validatePhone } from '../../lib/validation';

const asApiError = (err: unknown, fallback: string) => (err instanceof ApiError ? err : new ApiError(0, 'unknown', fallback));

export function AccountPage() {
  const { customer } = useAuth();
  if (!customer) return null; // guarded by RequireCustomer

  return (
    <div className="account">
      <h1>My account</h1>
      <AccountNav />
      {!customer.emailVerified ? (
        <VerifyNotice message="Please confirm your email address. Ordering, inquiries, quotations, saved addresses, profile changes and your history are available after confirmation." />
      ) : null}
      <div className="account-grid">
        <ProfileForm customer={customer} />
        <EmailForm customer={customer} />
        <PasswordForm customer={customer} />
      </div>
    </div>
  );
}

function ProfileForm({ customer }: { customer: Customer }) {
  const { setCustomer } = useAuth();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [errors, setErrors] = useState<{ name?: string | undefined; phone?: string | undefined }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next = { name: validateName(name), phone: validatePhone(phone, true) };
    setErrors(next);
    setError(null);
    setSaved(false);
    if (next.name || next.phone) return;
    setBusy(true);
    try {
      const res = await customerApi.updateProfile({ name: name.trim(), phone: phone.trim() });
      setCustomer(res.customer);
      setSaved(true);
    } catch (err) {
      const apiErr = asApiError(err, 'Could not save your details.');
      setErrors(apiErr.fieldErrors);
      setError(apiErr);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <h2>Profile</h2>
      <fieldset disabled={!customer.emailVerified}>
        <Field id="ac-name" label="Full name" error={errors.name}>
          <input id="ac-name" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
        </Field>
        <Field id="ac-phone" label="Mobile number" error={errors.phone}>
          <input id="ac-phone" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />
        </Field>
      </fieldset>
      {!customer.emailVerified ? <p className="muted small">Confirm your email address to change these details.</p> : null}
      {saved ? (
        <p className="notice notice-success" role="status">
          Your details were saved.
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <button className="btn" type="submit" disabled={busy || !customer.emailVerified}>
        {busy ? 'Saving…' : 'Save details'}
      </button>
    </form>
  );
}

function EmailForm({ customer }: { customer: Customer }) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ newEmail?: string | undefined; currentPassword?: string | undefined }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next = { newEmail: validateEmail(newEmail), currentPassword: password ? undefined : 'Enter your current password.' };
    setErrors(next);
    setError(null);
    setMessage(null);
    if (next.newEmail || next.currentPassword) return;
    setBusy(true);
    try {
      setMessage((await customerApi.changeEmail(password, newEmail.trim())).message);
      setNewEmail('');
    } catch (err) {
      const apiErr = asApiError(err, 'Could not change your email.');
      setErrors(apiErr.fieldErrors);
      setError(apiErr);
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <h2>Email</h2>
      <p>
        {customer.email}{' '}
        <span className={customer.emailVerified ? 'chip' : 'chip chip-warning'}>{customer.emailVerified ? 'Confirmed' : 'Not confirmed'}</span>
      </p>
      <Field id="ac-new-email" label="New email address" error={errors.newEmail}>
        <input id="ac-new-email" type="email" autoComplete="email" maxLength={254} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
      </Field>
      <PasswordField id="ac-email-password" label="Current password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.currentPassword} />
      {message ? (
        <p className="notice notice-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <button className="btn btn-outline" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Change email'}
      </button>
    </form>
  );
}

function PasswordForm({ customer }: { customer: Customer }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ currentPassword?: string | undefined; newPassword?: string | undefined; confirmPassword?: string | undefined }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const nextErrors = {
      currentPassword: current ? undefined : 'Enter your current password.',
      newPassword: validateNewPassword(next, { email: customer.email, name: customer.name }),
      confirmPassword: validateConfirm(next, confirm),
    };
    setErrors(nextErrors);
    setError(null);
    setMessage(null);
    if (Object.values(nextErrors).some(Boolean)) return;
    setBusy(true);
    try {
      setMessage((await customerApi.changePassword(current, next, confirm)).message);
      setNext('');
      setConfirm('');
    } catch (err) {
      const apiErr = asApiError(err, 'Could not change your password.');
      setErrors(apiErr.fieldErrors);
      setError(apiErr);
    } finally {
      setCurrent('');
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <h2>Password</h2>
      <PasswordField id="ac-current" label="Current password" autoComplete="current-password" value={current} onChange={setCurrent} error={errors.currentPassword} />
      <PasswordField
        id="ac-new"
        label="New password"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        error={errors.newPassword}
        hint="At least 12 characters with upper and lower case letters and a number."
      />
      <PasswordField id="ac-confirm" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirmPassword} />
      {message ? (
        <p className="notice notice-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <button className="btn btn-outline" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
