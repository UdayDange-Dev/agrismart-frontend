import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../api/client';
import { useCart } from '../lib/cart';
import { formatPrice } from '../lib/format';
import { ArrowRight, CartIcon } from './Icons';
import { ProductImage } from './ProductImage';

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const href = `/products/${encodeURIComponent(product.itemCode)}`;
  const enquireHref = `/contact?product=${encodeURIComponent(product.itemCode)}`;

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(t);
  }, [added]);

  return (
    <article className="product-card">
      {/* Duplicate link to the same page: hidden from assistive tech and the tab order. */}
      <Link to={href} className="product-card__media" tabIndex={-1} aria-hidden="true">
        <ProductImage product={product} />
        <span className="product-card__view">
          View details <ArrowRight size={16} />
        </span>
      </Link>
      <div className="product-card__body">
        <span className="chip">{product.categoryLabel}</span>
        <h3 className="product-card__title">
          <Link to={href}>{product.name}</Link>
        </h3>
        {/* Rendered as text: React escapes it, so ERPNext content can never inject markup. */}
        <p className="muted clamp">{product.description || 'Ask our team for full specifications.'}</p>
        <div className="product-card__footer">
          <span className="price">
            {formatPrice(product.price)}
            {product.price ? <small> / {product.uom}</small> : null}
          </span>
          {product.price ? (
            <div className="product-card__actions">
              <Link className="text-link small" to={enquireHref} aria-label={`Enquire about ${product.name}`}>
                Enquire
              </Link>
              <button
                className={`btn btn-small btn-cart${added ? ' is-added' : ''}`}
                onClick={() => {
                  add(product.itemCode, 1);
                  setAdded(true);
                }}
                aria-label={`Add ${product.name} to cart`}
              >
                <CartIcon size={16} />
                <span aria-hidden="true">{added ? 'Added' : 'Add'}</span>
              </button>
            </div>
          ) : (
            // No price: the product is quoted by the sales team.
            <Link className="btn btn-small btn-outline" to={`${enquireHref}&type=quote`} aria-label={`Request a quote for ${product.name}`}>
              Request quote <ArrowRight size={16} className="btn-arrow" />
            </Link>
          )}
        </div>
        <span className="visually-hidden" role="status">
          {added ? `${product.name} added to cart` : ''}
        </span>
      </div>
    </article>
  );
}
