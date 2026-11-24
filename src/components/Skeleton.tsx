/** Placeholder cards shown while the live catalogue loads (same proportions as real cards). */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="product-card skeleton-card" aria-hidden="true">
          <div className="skeleton skeleton-media" />
          <div className="product-card__body">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line half" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategorySkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="category-grid" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} aria-hidden="true">
          <div className="category-card skeleton-card">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        </li>
      ))}
    </ul>
  );
}
