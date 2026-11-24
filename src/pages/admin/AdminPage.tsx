import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { ErrorNotice, Field, Loading } from '../../components/Status';
import { formatMoney, ORDER_STATUS_LABELS } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { adminApi, type AdminOrder, type AdminUser } from './adminApi';

/**
 * Back-office for staff. The UI hides controls by role for convenience only; every
 * permission is enforced by the API (see Backend/src/routes/admin.ts).
 */
export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [version, setVersion] = useState(0);
  const session = useAsync(
    (signal) =>
      adminApi.me(signal).then(
        (r) => r.user,
        (err: unknown) => {
          if (err instanceof ApiError && err.status === 401) return null;
          throw err;
        },
      ),
    [version],
  );
  const current = user ?? session.data;

  if (session.loading && !user) return <Loading />;
  if (session.error && !user) return <ErrorNotice error={session.error} />;
  if (!current) return <LoginForm onLogin={setUser} />;
  return (
    <Dashboard
      user={current}
      onLogout={async () => {
        await adminApi.logout().catch(() => undefined);
        setUser(null);
        setVersion((v) => v + 1);
      }}
    />
  );
}

function LoginForm({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await adminApi.login(email.trim(), password);
      setPassword('');
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="narrow">
      <h1>Staff sign in</h1>
      <form className="card form" onSubmit={onSubmit}>
        <Field id="a-email" label="Email">
          <input id="a-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="a-password" label="Password">
          <input
            id="a-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? <ErrorNotice error={error} /> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  const [tab, setTab] = useState<'orders' | 'inquiries'>('orders');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const isAdmin = user.role === 'admin';

  const run = async (fn: () => Promise<string>) => {
    setError(null);
    setNotice(null);
    try {
      setNotice(await fn());
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Action failed'));
    }
  };

  return (
    <div>
      <div className="section-head">
        <h1>Back office</h1>
        <div className="inline">
          <span className="muted small">
            {user.email} ({user.role})
          </span>
          {isAdmin ? (
            <button
              className="btn btn-small btn-outline"
              onClick={() => run(async () => `Catalogue refreshed: ${(await adminApi.refreshCatalog()).products} products`)}
            >
              Refresh catalogue
            </button>
          ) : null}
          <button className="btn btn-small btn-outline" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      {notice ? (
        <p className="notice notice-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>
          Order requests
        </button>
        <button role="tab" aria-selected={tab === 'inquiries'} onClick={() => setTab('inquiries')}>
          Inquiries
        </button>
      </div>
      {tab === 'orders' ? <OrdersTable isAdmin={isAdmin} run={run} /> : <InquiriesTable isAdmin={isAdmin} run={run} />}
    </div>
  );
}

type Run = (fn: () => Promise<string>) => Promise<void>;

function OrdersTable({ isAdmin, run }: { isAdmin: boolean; run: Run }) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const orders = useAsync((signal) => adminApi.orders(page, signal), [page, version]);
  const act = (o: AdminOrder, status: 'confirmed' | 'cancelled' | 'fulfilled') =>
    run(async () => {
      await adminApi.setOrderStatus(o.reference, status);
      setVersion((v) => v + 1);
      return `Order ${o.reference} marked ${ORDER_STATUS_LABELS[status] ?? status}`;
    });

  if (orders.loading) return <Loading />;
  if (orders.error) return <ErrorNotice error={orders.error} />;
  const data = orders.data!;
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Customer</th>
              <th scope="col">Items</th>
              <th scope="col">Subtotal</th>
              <th scope="col">Status</th>
              {isAdmin ? <th scope="col">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.reference}>
                <td>
                  {o.reference}
                  <div className="muted small">{new Date(o.createdAt).toLocaleString('en-IN')}</div>
                </td>
                <td>
                  {o.customer.name}
                  <div className="muted small">
                    {o.customer.email} · {o.customer.phone}
                  </div>
                  <div className="muted small">
                    {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.postalCode}
                  </div>
                </td>
                <td>
                  {o.items.map((l) => (
                    <div key={l.itemCode} className="small">
                      {l.qty} × {l.name}
                    </div>
                  ))}
                  {o.notes ? <div className="muted small pre-line">Note: {o.notes}</div> : null}
                </td>
                <td>{formatMoney(o.subtotal, o.currency)}</td>
                <td>{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
                {isAdmin ? (
                  <td className="actions">
                    {o.status === 'pending_review' ? (
                      <button className="btn btn-small" onClick={() => act(o, 'confirmed')}>
                        Confirm
                      </button>
                    ) : null}
                    {o.status === 'confirmed' ? (
                      <button className="btn btn-small" onClick={() => act(o, 'fulfilled')}>
                        Fulfilled
                      </button>
                    ) : null}
                    {o.status === 'pending_review' || o.status === 'confirmed' ? (
                      <button className="btn btn-small btn-outline" onClick={() => act(o, 'cancelled')}>
                        Cancel
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
    </>
  );
}

function InquiriesTable({ isAdmin, run }: { isAdmin: boolean; run: Run }) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const inquiries = useAsync((signal) => adminApi.inquiries(page, signal), [page, version]);

  if (inquiries.loading) return <Loading />;
  if (inquiries.error) return <ErrorNotice error={inquiries.error} />;
  const data = inquiries.data!;
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Contact</th>
              <th scope="col">Message</th>
              <th scope="col">ERPNext</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.reference}>
                <td>
                  {i.reference}
                  <div className="muted small">{new Date(i.createdAt).toLocaleString('en-IN')}</div>
                </td>
                <td>
                  {i.name}
                  {i.company ? <div className="muted small">{i.company}</div> : null}
                  <div className="muted small">
                    {i.email}
                    {i.phone ? ` · ${i.phone}` : ''}
                  </div>
                </td>
                <td className="pre-line small">
                  {i.kind === 'quotation' ? <span className="chip">Quotation request</span> : null}
                  {i.productInterest ? <div><strong>Product: {i.productInterest}</strong></div> : null}
                  {i.quantity ? <div>Quantity: {i.quantity}</div> : null}
                  {i.message}
                </td>
                <td>
                  {i.syncStatus === 'synced' ? `Lead ${i.erpLeadName ?? ''}` : i.syncStatus}
                  {i.lastErrorKind && i.syncStatus !== 'synced' ? <div className="muted small">Last error: {i.lastErrorKind}</div> : null}
                  {isAdmin && i.syncStatus !== 'synced' ? (
                    <button
                      className="btn btn-small btn-outline"
                      onClick={() =>
                        run(async () => {
                          const r = await adminApi.retrySync(i.reference);
                          setVersion((v) => v + 1);
                          return `Sync ${i.reference}: ${r.result}`;
                        })
                      }
                    >
                      Retry sync
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
    </>
  );
}

function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-outline btn-small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button className="btn btn-outline btn-small" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </nav>
  );
}
