import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, type InquiryKind } from '../api/client';
import type { Customer } from '../api/customer';
import { AuthGate } from '../components/AuthGate';
import { SUPPORT_EMAIL, SUPPORT_PHONE, telHref } from '../components/Header';
import { ErrorNotice, Field } from '../components/Status';
import { useAuth } from '../lib/auth';
import { saveDraft, takeDraft } from '../lib/formDraft';
import { signInUrlFor } from '../lib/redirect';
import { hasErrors, validateName, validatePhone, validateText } from '../lib/validation';

const ITEM_CODE = /^[\p{L}\p{N}][\p{L}\p{N} ._\-/()&+#]{0,139}$/u;
const EMPTY = { name: '', phone: '', company: '', quantity: '', message: '' };
type Key = keyof typeof EMPTY | 'productInterest';

export function ContactPage() {
  const [params] = useSearchParams();
  const productParam = params.get('product') ?? '';
  // Only a well-formed item code from the URL is used; anything else is ignored.
  const productInterest = ITEM_CODE.test(productParam) ? productParam : '';
  const kind: InquiryKind = params.get('type') === 'quote' ? 'quotation' : 'inquiry';

  return (
    <div className="narrow">
      <h1>{kind === 'quotation' ? 'Request a quotation' : 'Contact our team'}</h1>
      <p className="lead">
        {kind === 'quotation'
          ? 'Tell us what you need and how much. Our sales team will send you a price quotation.'
          : 'Ask about products, bulk pricing or agronomy advice. We usually reply within one working day.'}
      </p>
      <p>
        Prefer to reach us directly? Email{' '}
        <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{' '}
        or call{' '}
        <a className="text-link" href={telHref(SUPPORT_PHONE)}>
          {SUPPORT_PHONE}
        </a>
        .
      </p>
      <AuthGate action={kind === 'quotation' ? 'request a quotation' : 'send an inquiry'}>
        <InquiryForm key={`${kind}:${productInterest}`} kind={kind} productInterest={productInterest} />
      </AuthGate>
    </div>
  );
}

/** Rendered only inside AuthGate, so a verified customer is always present. */
function InquiryForm({ kind, productInterest }: { kind: InquiryKind; productInterest: string }) {
  const { customer, refresh } = useAuth() as { customer: Customer; refresh: () => Promise<void> };
  const navigate = useNavigate();
  const location = useLocation();
  const draftKey = `inquiry:${kind}:${productInterest}`;
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: customer.name,
    phone: customer.phone,
    // Restores what was typed before an expired session sent the customer to sign in again.
    ...takeDraft(draftKey, EMPTY),
  }));
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const quantity = form.quantity.trim() ? Number(form.quantity) : undefined;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const next = {
      name: validateName(form.name),
      phone: validatePhone(form.phone, false),
      company: form.company ? validateText(form.company, 'Company', 1, 140) : undefined,
      quantity:
        quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000)
          ? 'Enter a whole number between 1 and 100000.'
          : undefined,
      message: validateText(form.message, 'Message', 10, 2000),
    };
    setErrors(next);
    setSubmitError(null);
    if (hasErrors(next)) return;
    setSubmitting(true);
    try {
      const res = await api.inquiry({
        kind,
        name: form.name.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.company.trim() ? { company: form.company.trim() } : {}),
        ...(productInterest ? { productInterest } : {}),
        ...(quantity !== undefined ? { quantity } : {}),
        message: form.message.trim(),
        website,
      });
      setResult({ reference: res.reference, message: res.message });
      setForm({ ...EMPTY, name: customer.name, phone: customer.phone });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Could not send your inquiry.');
      if (apiErr.status === 401) {
        // The session ended while the form was open: keep the text and come back after sign-in.
        saveDraft(draftKey, form);
        await refresh();
        navigate(signInUrlFor(`${location.pathname}${location.search}`), { replace: true });
        return;
      }
      if (apiErr.code === 'email_unverified') await refresh(); // the gate then explains what to do
      setErrors(apiErr.fieldErrors as Partial<Record<Key, string>>);
      setSubmitError(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="card">
        <h2>{kind === 'quotation' ? 'Quotation request received' : 'Inquiry received'}</h2>
        <p className="notice notice-success" role="status">
          {result.message}
        </p>
        <p>
          Your reference: <strong>{result.reference}</strong>. You can follow it under{' '}
          <Link className="text-link" to="/account/inquiries">
            My inquiries &amp; quotes
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      {productInterest ? (
        <p className="notice notice-info">
          {kind === 'quotation' ? 'Quotation for' : 'Inquiry about'} product <strong>{productInterest}</strong>
        </p>
      ) : null}
      <p className="muted small">
        We will reply to <strong>{customer.email}</strong>, the email address on your account.
      </p>
      <Field id="c-name" label="Full name" error={errors.name}>
        <input id="c-name" autoComplete="name" maxLength={100} value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
      </Field>
      <div className="two-col">
        <Field id="c-phone" label="Phone (optional)" error={errors.phone}>
          <input id="c-phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} />
        </Field>
        <Field id="c-company" label="Company / farm (optional)" error={errors.company}>
          <input id="c-company" autoComplete="organization" maxLength={140} value={form.company} onChange={set('company')} />
        </Field>
      </div>
      {kind === 'quotation' ? (
        <Field id="c-quantity" label="Quantity (optional)" error={errors.quantity}>
          <input
            id="c-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            step={1}
            value={form.quantity}
            onChange={set('quantity')}
            aria-invalid={!!errors.quantity}
          />
        </Field>
      ) : null}
      <Field id="c-message" label="Message" error={errors.message} hint="10–2000 characters">
        <textarea id="c-message" rows={6} maxLength={2000} value={form.message} onChange={set('message')} aria-invalid={!!errors.message} />
      </Field>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <p className="muted small">We use your details only to respond to this request.</p>
      {submitError ? <ErrorNotice error={submitError} /> : null}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : kind === 'quotation' ? 'Request quotation' : 'Send inquiry'}
      </button>
    </form>
  );
}
