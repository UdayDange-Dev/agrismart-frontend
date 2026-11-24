import { useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { AccountNav } from '../../components/AccountNav';
import { ErrorNotice, Loading } from '../../components/Status';
import { VerifyNotice } from '../../components/VerifyNotice';
import { useAuth } from '../../lib/auth';
import { formatMoney, ORDER_STATUS_LABELS } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

export function AccountOrdersPage() {
  const { customer } = useAuth();
  const [page, setPage] = useState(1);
  const verified = customer?.emailVerified === true;
  const orders = useAsync((signal) => (verified ? customerApi.orders(page, signal) : Promise.resolve(null)), [page, verified]);

  return (
    <div className="account">
      <h1>My orders</h1>
      <AccountNav />
      {!verified ? (
        <VerifyNotice message="Please confirm your email address to see your order history." />
      ) : orders.loading ? (
        <Loading />
      ) : orders.error ? (
        <ErrorNotice error={orders.error} />
      ) : orders.data && orders.data.items.length === 0 ? (
        <div className="empty card">
          <p>You have not placed any orders yet.</p>
          <Link to="/products" className="btn">
            Browse products
          </Link>
        </div>
      ) : orders.data ? (
        <>
          <ul className="order-list">
            {orders.data.items.map((o) => (
              <li key={o.reference} className="card">
                <div className="section-head">
                  <h2 className="h3">{o.reference}</h2>
                  <span className="chip">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                </div>
                <p className="muted small">
                  Placed {new Date(o.createdAt).toLocaleString('en-IN')} · Delivery to {o.shippingCity}
                </p>
                <ul className="summary-lines">
                  {o.items.map((l) => (
                    <li key={l.itemCode} className="summary-row">
                      <span>
                        {l.name} × {l.qty} {l.uom}
                      </span>
                      <span>{formatMoney(l.lineTotal, o.currency)}</span>
                    </li>
                  ))}
                </ul>
                <p className="summary-row total">
                  <span>Subtotal (MRP)</span>
                  <span>{formatMoney(o.subtotal, o.currency)}</span>
                </p>
              </li>
            ))}
          </ul>
          {orders.data.total > orders.data.pageSize ? (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn-outline btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(orders.data.total / orders.data.pageSize)}
              </span>
              <button
                className="btn btn-outline btn-small"
                disabled={page * orders.data.pageSize >= orders.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
