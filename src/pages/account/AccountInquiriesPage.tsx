import { useState } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customer';
import { AccountNav } from '../../components/AccountNav';
import { ErrorNotice, Loading } from '../../components/Status';
import { VerifyNotice } from '../../components/VerifyNotice';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';

const STATUS_LABELS = { received: 'Received', forwarded: 'With our sales team' } as const;

export function AccountInquiriesPage() {
  const { customer } = useAuth();
  const [page, setPage] = useState(1);
  const verified = customer?.emailVerified === true;
  const inquiries = useAsync((signal) => (verified ? customerApi.inquiries(page, signal) : Promise.resolve(null)), [page, verified]);

  return (
    <div className="account">
      <h1>My inquiries &amp; quotes</h1>
      <AccountNav />
      {!verified ? (
        <VerifyNotice message="Please confirm your email address to send inquiries and see your requests." />
      ) : inquiries.loading ? (
        <Loading />
      ) : inquiries.error ? (
        <ErrorNotice error={inquiries.error} />
      ) : inquiries.data && inquiries.data.items.length === 0 ? (
        <div className="empty card">
          <p>You have not sent any inquiries or quotation requests yet.</p>
          <div className="empty__actions">
            <Link to="/contact" className="btn">
              Send an inquiry
            </Link>
            <Link to="/products" className="btn btn-outline">
              Browse products
            </Link>
          </div>
        </div>
      ) : inquiries.data ? (
        <>
          <ul className="order-list">
            {inquiries.data.items.map((i) => (
              <li key={i.reference} className="card">
                <div className="section-head">
                  <h2 className="h3">
                    {i.kind === 'quotation' ? 'Quotation request' : 'Inquiry'} {i.reference}
                  </h2>
                  <span className="chip">{STATUS_LABELS[i.status]}</span>
                </div>
                <p className="muted small">
                  Sent {new Date(i.createdAt).toLocaleString('en-IN')}
                  {i.productInterest ? (
                    <>
                      {' · Product '}
                      <Link to={`/products/${encodeURIComponent(i.productInterest)}`}>{i.productInterest}</Link>
                    </>
                  ) : null}
                  {i.quantity ? ` · Quantity ${i.quantity}` : null}
                </p>
                <p className="pre-line">{i.message}</p>
              </li>
            ))}
          </ul>
          {inquiries.data.total > inquiries.data.pageSize ? (
            <nav className="pagination" aria-label="Pagination">
              <button className="btn btn-outline btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(inquiries.data.total / inquiries.data.pageSize)}
              </span>
              <button
                className="btn btn-outline btn-small"
                disabled={page * inquiries.data.pageSize >= inquiries.data.total}
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
