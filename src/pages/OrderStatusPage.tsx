import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ErrorNotice, Loading } from '../components/Status';
import { formatMoney, ORDER_STATUS_LABELS } from '../lib/format';
import { getOrderToken, isOrderReference } from '../lib/orderTokens';
import { useAsync } from '../lib/useAsync';

export function OrderStatusPage() {
  const { reference = '' } = useParams();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced === true;
  const valid = isOrderReference(reference);
  const token = valid ? getOrderToken(reference) : null;
  const order = useAsync(() => (token ? api.order(reference, token) : Promise.resolve(null)), [reference, token]);

  if (!valid) return <div className="notice notice-error">Invalid order reference.</div>;
  if (!token) {
    return (
      <div className="card">
        <h1>Order {reference}</h1>
        <p>
          Order details can only be viewed from the browser session in which the order was placed. Please quote this reference when
          you <Link to="/contact">contact our team</Link>.
        </p>
      </div>
    );
  }
  if (order.loading) return <Loading />;
  if (order.error || !order.data) return <ErrorNotice error={order.error ?? new Error('Order not found')} />;
  const o = order.data;

  return (
    <div className="card order-status">
      {justPlaced ? (
        <div className="notice notice-success" role="status">
          Thank you, {o.customerName}! Your order request has been received. No payment has been taken.
        </div>
      ) : null}
      <h1>Order {o.reference}</h1>
      <p>
        Status: <strong>{ORDER_STATUS_LABELS[o.status] ?? o.status}</strong>
      </p>
      <p className="muted small">Placed {new Date(o.createdAt).toLocaleString('en-IN')} · Delivery to {o.shippingCity}</p>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Qty</th>
            <th scope="col">Price</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((l) => (
            <tr key={l.itemCode}>
              <td>{l.name}</td>
              <td>
                {l.qty} {l.uom}
              </td>
              <td>{formatMoney(l.unitPrice, o.currency)}</td>
              <td>{formatMoney(l.lineTotal, o.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Subtotal (MRP)
            </th>
            <td>{formatMoney(o.subtotal, o.currency)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted small">Our team will contact you to confirm stock, taxes, delivery charges and payment. Please keep your order reference.</p>
      <Link to="/products" className="btn btn-outline">
        Continue shopping
      </Link>
    </div>
  );
}
