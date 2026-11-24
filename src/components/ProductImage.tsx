import { useState } from 'react';
import type { Product } from '../api/client';
import { safeRelativeUrl } from '../lib/format';
import { CategoryIcon } from './Icons';

export function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = safeRelativeUrl(product.imageUrl);
  if (!src || failed) {
    return (
      <div className={large ? 'img-placeholder large' : 'img-placeholder'} role="img" aria-label={`${product.name} (no image)`}>
        <CategoryIcon name={product.category} size={large ? 72 : 44} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={product.name}
      loading="lazy"
      decoding="async"
      referrerPolicy="same-origin"
      className={`${large ? 'product-img large' : 'product-img'}${loaded ? ' is-loaded' : ''}`}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
