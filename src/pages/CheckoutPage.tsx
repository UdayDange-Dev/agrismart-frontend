import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { customerApi, type Customer, type SavedAddress } from '../api/customer';
import { AuthGate } from '../components/AuthGate';
import { ErrorNotice, Field, Loading } from '../components/Status';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { saveDraft, takeDraft } from '../lib/formDraft';
import { formatMoney } from '../lib/format';
import { saveOrderToken } from '../lib/orderTokens';
import { signInUrlFor } from '../lib/redirect';
import { useAsync } from '../lib/useAsync';
import { hasErrors, validateName, validatePhone, validatePostal, validateText } from '../lib/validation';
import { useQuote } from './CartPage';

const EMPTY = {
  name: '',
  phone: '',
  company: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  notes: '',
};
type FormKey = keyof typeof EMPTY | 'acceptTerms';
const DRAFT_KEY = 'checkout';

// Server field paths -> form fields, so backend validation messages land on the right input.
const SERVER_PATHS: Record<string, FormKey> = {
  'customer.name': 'name',
  'customer.phone': 'phone',
  'customer.company': 'company',
  'shippingAddress.line1': 'line1',
  'shippingAddress.line2': 'line2',
  'shippingAddress.city': 'city',
  'shippingAddress.state': 'state',
  'shippingAddress.postalCode': 'postalCode',
  notes: 'notes',
  acceptTerms: 'acceptTerms',
};

export function CheckoutPage() {
  const { lines, quote, problems, error: quoteError, loading } = useQuote();

  if (lines.length === 0) {
    return (
      <div className="empty card">
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/products" className="btn">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Checkout</h1>
      <div className="notice notice-info">
        This is an <strong>order request</strong>. No payment is taken online. Our team will contact you to confirm stock, taxes,
        delivery charges and payment.
      </div>
      <div className="cart-layout">
        <AuthGate
          action="check out"
          note={<p className="muted small">Your cart stays saved on this device while you sign in or create an account.</p>}
        >
          <CheckoutForm canSubmit={!!quote && problems.length === 0} />
        </AuthGate>

        <aside className="card summary" aria-live="polite">
          <h2>Order summary</h2>
          {loading ? <Loading label="Checking prices…" /> : null}
          {quoteError ? <ErrorNotice error={quoteError} /> : null}
          {problems.length > 0 ? (
            <p className="field-error">
              Some items can’t be ordered. <Link to="/cart">Review your cart</Link>.
            </p>
          ) : null}
          {quote ? (
            <>
              <ul className="summary-lines">
                {quote.lines.map((l) => (
                  <li key={l.itemCode} className="summary-row">
                    <span>
                      {l.name} × {l.qty}
                    </span>
                    <span>{formatMoney(l.lineTotal, quote.currency)}</span>
                  </li>
                ))}
              </ul>
              <p className="summary-row total">
                <span>Subtotal (MRP)</span>
                <span>{formatMoney(quote.subtotal, quote.currency)}</span>
              </p>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** Rendered only inside AuthGate, so a verified customer is always present. */
function CheckoutForm({ canSubmit }: { canSubmit: boolean }) {
  const navigate = useNavigate();
  const { lines, clear } = useCart();
  const { customer, refresh } = useAuth() as { customer: Customer; refresh: () => Promise<void> };
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: customer.name,
    phone: customer.phone,
    ...takeDraft(DRAFT_KEY, EMPTY),
  }));
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // One key per checkout visit: double clicks / retries cannot create duplicate orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const addresses = useAsync((signal) => customerApi.addresses(signal), []);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (key !== 'notes' && key !== 'name' && key !== 'phone' && key !== 'company') setSelected(null);
  };

  const pickAddress = (a: SavedAddress) => {
    setSelected(a.id);
    setSaveAddress(false);
    setForm((f) => ({ ...f, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, postalCode: a.postalCode }));
  };

  const validate = () => {
    const next: Partial<Record<FormKey, string>> = {
      name: validateName(form.name),
      phone: validatePhone(form.phone, true),
      company: form.company ? validateText(form.company, 'Company', 1, 140) : undefined,
      line1: validateText(form.line1, 'Address', 3, 200),
      line2: form.line2 ? validateText(form.line2, 'Address line 2', 1, 200) : undefined,
      city: validateText(form.city, 'City', 2, 100),
      state: validateText(form.state, 'State', 2, 100),
      postalCode: validatePostal(form.postalCode),
      notes: form.notes ? validateText(form.notes, 'Notes', 1, 1000) : undefined,
      acceptTerms: acceptTerms ? undefined : 'Please accept the order terms.',
    };
    setErrors(next);
    return !hasErrors(next);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate() || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.createOrder(
        {
          customer: { name: form.name.trim(), phone: form.phone.trim(), ...(form.company.trim() ? { company: form.company.trim() } : {}) },
          shippingAddress: {
            line1: form.line1.trim(),
            ...(form.line2.trim() ? { line2: form.line2.trim() } : {}),
            city: form.city.trim(),
            state: form.state.trim(),
            postalCode: form.postalCode.trim(),
            country: 'India',
          },
          ...(saveAddress && !selected ? { saveAddress: true } : {}),
          items: lines,
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
          acceptTerms: true,
          website,
        },
        idempotencyKey,
      );
      if (res.accessToken) saveOrderToken(res.order.reference, res.accessToken);
      clear();
      navigate(`/orders/${res.order.reference}`, { replace: true, state: { justPlaced: true } });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Could not place your order.');
      if (apiErr.status === 401) {
        // The session ended during checkout: the cart is kept, and so are the delivery details.
        saveDraft(DRAFT_KEY, form);
        await refresh();
        navigate(signInUrlFor('/checkout'), { replace: true });
        return;
      }
      if (apiErr.code === 'email_unverified') await refresh();
      const mapped: Partial<Record<FormKey, string>> = {};
      for (const [path, message] of Object.entries(apiErr.fieldErrors)) {
        const key = SERVER_PATHS[path];
        if (key) mapped[key] = message;
      }
      setErrors(mapped);
      setSubmitError(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  const saved = addresses.data?.items ?? [];

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <p className="muted small">
        Signed in as <strong>{customer.email}</strong>. We will send order updates to this address, and the order will appear in{' '}
        <Link to="/account/orders">your order history</Link>.
      </p>
      <fieldset>
        <legend>Contact details</legend>
        <Field id="name" label="Full name" error={errors.name}>
          <input id="name" autoComplete="name" maxLength={100} value={form.name} onChange={set('name')} aria-invalid={!!errors.name} />
        </Field>
        <div className="two-col">
          <Field id="phone" label="Phone" error={errors.phone}>
            <input id="phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} />
          </Field>
          <Field id="company" label="Company / farm (optional)" error={errors.company}>
            <input id="company" autoComplete="organization" maxLength={140} value={form.company} onChange={set('company')} />
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend>Delivery address (India)</legend>
        {saved.length > 0 ? (
          <div className="address-picker" role="radiogroup" aria-label="Saved addresses">
            {saved.map((a) => (
              <label key={a.id} className="checkbox">
                <input type="radio" name="saved-address" checked={selected === a.id} onChange={() => pickAddress(a)} />
                <span>
                  {a.label ? <strong>{a.label}: </strong> : null}
                  {[a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(', ')}
                </span>
              </label>
            ))}
          </div>
        ) : null}
        <Field id="line1" label="Address line 1" error={errors.line1}>
          <input id="line1" autoComplete="address-line1" maxLength={200} value={form.line1} onChange={set('line1')} aria-invalid={!!errors.line1} />
        </Field>
        <Field id="line2" label="Address line 2 (optional)" error={errors.line2}>
          <input id="line2" autoComplete="address-line2" maxLength={200} value={form.line2} onChange={set('line2')} />
        </Field>
        <div className="three-col">
          <Field id="city" label="City / village" error={errors.city}>
            <input id="city" autoComplete="address-level2" maxLength={100} value={form.city} onChange={set('city')} aria-invalid={!!errors.city} />
          </Field>
          <Field id="state" label="State" error={errors.state}>
            <input id="state" autoComplete="address-level1" maxLength={100} value={form.state} onChange={set('state')} aria-invalid={!!errors.state} />
          </Field>
          <Field id="postalCode" label="PIN code" error={errors.postalCode}>
            <input id="postalCode" autoComplete="postal-code" inputMode="numeric" maxLength={12} value={form.postalCode} onChange={set('postalCode')} aria-invalid={!!errors.postalCode} />
          </Field>
        </div>
        {!selected && addresses.data && saved.length < addresses.data.max ? (
          <label className="checkbox">
            <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
            Save this address to my account
          </label>
        ) : null}
        <Field id="notes" label="Notes for our team (optional)" error={errors.notes}>
          <textarea id="notes" rows={3} maxLength={1000} value={form.notes} onChange={set('notes')} />
        </Field>
      </fieldset>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div className={errors.acceptTerms ? 'field has-error' : 'field'}>
        <label className="checkbox">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />I understand this is an order
          request and prices are confirmed by AGRI SMART before payment.
        </label>
        {errors.acceptTerms ? (
          <small className="field-error" role="alert">
            {errors.acceptTerms}
          </small>
        ) : null}
      </div>
      {submitError ? <ErrorNotice error={submitError} /> : null}
      <button type="submit" className="btn btn-block" disabled={submitting || !canSubmit}>
        {submitting ? 'Submitting…' : 'Submit order request'}
      </button>
    </form>
  );
}
