import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { customerApi, type SavedAddress } from '../../api/customer';
import { AccountNav } from '../../components/AccountNav';
import { ErrorNotice, Field, Loading } from '../../components/Status';
import { VerifyNotice } from '../../components/VerifyNotice';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';
import { hasErrors, validatePostal, validateText } from '../../lib/validation';

const EMPTY = { label: '', line1: '', line2: '', city: '', state: '', postalCode: '' };
type Key = keyof typeof EMPTY;

const asApiError = (err: unknown, fallback: string) => (err instanceof ApiError ? err : new ApiError(0, 'unknown', fallback));

export function AccountAddressesPage() {
  const { customer } = useAuth();
  const verified = customer?.emailVerified === true;
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);
  const [removeError, setRemoveError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const book = useAsync((signal) => (verified ? customerApi.addresses(signal) : Promise.resolve(null)), [verified, version]);

  const reload = (message: string) => {
    setEditing(null);
    setNotice(message);
    setVersion((v) => v + 1);
  };

  return (
    <div className="account">
      <h1>My addresses</h1>
      <AccountNav />
      {!verified ? (
        <VerifyNotice message="Please confirm your email address to save delivery addresses." />
      ) : book.loading && !book.data ? (
        <Loading />
      ) : book.error ? (
        <ErrorNotice error={book.error} />
      ) : book.data ? (
        <>
          {notice ? (
            <p className="notice notice-success" role="status">
              {notice}
            </p>
          ) : null}
          {removeError ? <ErrorNotice error={removeError} /> : null}
          {book.data.items.length === 0 && editing === null ? (
            <div className="empty card">
              <p>You have no saved addresses. Save one here or while checking out.</p>
            </div>
          ) : (
            <ul className="address-list">
              {book.data.items.map((a) => (
                <li key={a.id} className="card address-card">
                  {a.label ? <h2 className="h3">{a.label}</h2> : null}
                  <address>
                    {a.line1}
                    <br />
                    {a.line2 ? (
                      <>
                        {a.line2}
                        <br />
                      </>
                    ) : null}
                    {a.city}, {a.state} {a.postalCode}
                    <br />
                    {a.country}
                  </address>
                  <div className="inline">
                    <button type="button" className="btn btn-outline btn-small" onClick={() => setEditing(a)}>
                      Edit<span className="visually-hidden"> {a.label ?? a.line1}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={async () => {
                        setRemoveError(null);
                        try {
                          await customerApi.deleteAddress(a.id);
                          reload('The address was removed.');
                        } catch (err) {
                          setRemoveError(asApiError(err, 'Could not remove the address.'));
                        }
                      }}
                    >
                      Remove<span className="visually-hidden"> {a.label ?? a.line1}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {editing !== null ? (
            <AddressForm
              key={editing === 'new' ? 'new' : editing.id}
              address={editing === 'new' ? null : editing}
              onCancel={() => setEditing(null)}
              onSaved={() => reload(editing === 'new' ? 'The address was saved.' : 'The address was updated.')}
            />
          ) : book.data.items.length < book.data.max ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setNotice(null);
                setEditing('new');
              }}
            >
              Add an address
            </button>
          ) : (
            <p className="muted small">You can save up to {book.data.max} addresses. Remove one to add another.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function AddressForm({ address, onSaved, onCancel }: { address: SavedAddress | null; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(
    address
      ? { label: address.label ?? '', line1: address.line1, line2: address.line2 ?? '', city: address.city, state: address.state, postalCode: address.postalCode }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: Key) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next = {
      label: form.label ? validateText(form.label, 'Label', 1, 40) : undefined,
      line1: validateText(form.line1, 'Address', 3, 200),
      line2: form.line2 ? validateText(form.line2, 'Address line 2', 1, 200) : undefined,
      city: validateText(form.city, 'City', 2, 100),
      state: validateText(form.state, 'State', 2, 100),
      postalCode: validatePostal(form.postalCode),
    };
    setErrors(next);
    setError(null);
    if (hasErrors(next)) return;
    const body = {
      ...(form.label.trim() ? { label: form.label.trim() } : {}),
      line1: form.line1.trim(),
      ...(form.line2.trim() ? { line2: form.line2.trim() } : {}),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: form.postalCode.trim(),
      country: 'India' as const,
    };
    setBusy(true);
    try {
      if (address) await customerApi.updateAddress(address.id, body);
      else await customerApi.addAddress(body);
      onSaved();
    } catch (err) {
      const apiErr = asApiError(err, 'Could not save the address.');
      setErrors(apiErr.fieldErrors as Partial<Record<Key, string>>);
      setError(apiErr);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={onSubmit} noValidate>
      <h2>{address ? 'Edit address' : 'New address'}</h2>
      <Field id="ad-label" label="Label (optional, e.g. Farm or Home)" error={errors.label}>
        <input id="ad-label" maxLength={40} value={form.label} onChange={set('label')} />
      </Field>
      <Field id="ad-line1" label="Address line 1" error={errors.line1}>
        <input id="ad-line1" autoComplete="address-line1" maxLength={200} value={form.line1} onChange={set('line1')} aria-invalid={!!errors.line1} />
      </Field>
      <Field id="ad-line2" label="Address line 2 (optional)" error={errors.line2}>
        <input id="ad-line2" autoComplete="address-line2" maxLength={200} value={form.line2} onChange={set('line2')} />
      </Field>
      <div className="three-col">
        <Field id="ad-city" label="City / village" error={errors.city}>
          <input id="ad-city" autoComplete="address-level2" maxLength={100} value={form.city} onChange={set('city')} aria-invalid={!!errors.city} />
        </Field>
        <Field id="ad-state" label="State" error={errors.state}>
          <input id="ad-state" autoComplete="address-level1" maxLength={100} value={form.state} onChange={set('state')} aria-invalid={!!errors.state} />
        </Field>
        <Field id="ad-postal" label="PIN code" error={errors.postalCode}>
          <input id="ad-postal" autoComplete="postal-code" inputMode="numeric" maxLength={12} value={form.postalCode} onChange={set('postalCode')} aria-invalid={!!errors.postalCode} />
        </Field>
      </div>
      {error ? <ErrorNotice error={error} /> : null}
      <div className="inline">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save address'}
        </button>
        <button className="btn btn-outline" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
