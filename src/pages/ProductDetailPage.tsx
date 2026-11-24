import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, categoryUrl } from '../api/client';
import { ProductImage } from '../components/ProductImage';
import { ErrorNotice, Loading } from '../components/Status';
import { MAX_QTY, useCart } from '../lib/cart';
import { formatPrice } from '../lib/format';
import { useAsync } from '../lib/useAsync';

export function ProductDetailPage() {
  const { itemCode = '' } = useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const product = useAsync((signal) => api.product(itemCode, signal), [itemCode]);

  if (product.loading) return <Loading />;
  if (product.error) {
    return (
      <ErrorNotice error={product.error}>
        <Link to="/products">Back to products</Link>
      </ErrorNotice>
    );
  }
  const p = product.data!;

  return (
    <article className="product-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link>
        {p.categoryPath.map((c) => (
          <span key={c.name}>
            {' / '}
            <Link to={categoryUrl(c.name)}>{c.label}</Link>
          </span>
        ))}
      </nav>
      <div className="detail-grid">
        <div className="detail-media card">
          <ProductImage product={p} large />
        </div>
        <div className="detail-info">
          <h1>{p.name}</h1>
          <p className="muted small">Item code: {p.itemCode}</p>
          <p className="price large">
            {formatPrice(p.price)}
            {p.price ? <small> per {p.uom} (MRP, taxes as applicable)</small> : null}
          </p>
          {p.price ? (
            <div className="add-to-cart">
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                max={MAX_QTY}
                step={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(MAX_QTY, Math.floor(Number(e.target.value)) || 1)))}
              />
              <button
                className="btn"
                onClick={() => {
                  add(p.itemCode, qty);
                  setAdded(true);
                }}
              >
                Add to cart
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  // The item is in the cart first, so it is still there after signing in at checkout.
                  add(p.itemCode, qty);
                  navigate('/checkout');
                }}
              >
                Buy now
              </button>
            </div>
          ) : (
            <div className="inline">
              <p>This product is priced on request.</p>
              <Link className="btn" to={`/contact?product=${encodeURIComponent(p.itemCode)}&type=quote`}>
                Request a quote
              </Link>
            </div>
          )}
          {added ? (
            <p className="notice notice-success" role="status">
              Added to cart. <Link to="/cart">View cart</Link>
            </p>
          ) : null}
          <h2>Description</h2>
          <p className="pre-line">{p.description || 'No description available.'}</p>
          <p>
            <Link to={`/contact?product=${encodeURIComponent(p.itemCode)}`}>Have a question about this product?</Link>
          </p>
        </div>
      </div>
    </article>
  );
}
