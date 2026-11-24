import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { CategoryTile } from '../components/CategoryTile';
import { CloseIcon } from '../components/Icons';
import { PageHero } from '../components/PageHero';
import { ProductCard } from '../components/ProductCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import { ErrorNotice } from '../components/Status';
import { useAsync } from '../lib/useAsync';
import { categoryMedia } from '../lib/categoryMedia';
import { findCategory, useCategories } from '../lib/useCategories';

const PAGE_SIZE = 12;
const SORTS = { name: 'Name', price_asc: 'Price: low to high', price_desc: 'Price: high to low' } as const;
type Sort = keyof typeof SORTS;

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').slice(0, 100);
  const category = (params.get('category') ?? '').trim().slice(0, 140);
  const sortParam = params.get('sort') ?? 'name';
  const sort: Sort = sortParam in SORTS ? (sortParam as Sort) : 'name';
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
  const [draft, setDraft] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    // Keep the search box in sync when the URL changes (e.g. header search, back button).
    setSyncedQ(q);
    setDraft(q);
  }

  const { categories, status: catStatus } = useCategories();
  const products = useAsync(
    (signal) => api.products({ q, category, sort, page, pageSize: PAGE_SIZE }, signal),
    [q, category, sort, page],
  );

  // The URL holds the exact ERPNext Item Group name; matching is case-insensitive, so
  // ?category=Irrigation and ?category=IRRIGATION select the same group.
  const found = category ? findCategory(categories, category) : null;
  const activeLabel = found?.match.label ?? category;
  const selectValue = found ? found.top.name : category;

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: draft.trim() || undefined });
  };

  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / PAGE_SIZE)) : 1;
  // Header photo: the active top-level category's image, or a field for the whole catalogue.
  const media = categoryMedia(found ? found.top.name : '');
  const withProducts = categories.filter((c) => c.count > 0);

  return (
    <div className="catalog-page">
      <PageHero
        eyebrow={category ? 'Products' : 'Live catalogue'}
        title={category ? activeLabel : 'Products'}
        image={media.image}
        widths={media.known ? media.widths : [960, 1920]}
        breadcrumbs={
          category ? (
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link to="/products">Products</Link>
              {found && found.match.name !== found.top.name ? (
                <>
                  {' / '}
                  <Link to={`/products?category=${encodeURIComponent(found.top.name)}`}>{found.top.label}</Link>
                </>
              ) : null}
              {' / '}
              <span aria-current="page">{activeLabel}</span>
            </nav>
          ) : undefined
        }
        lead={
          <>
            {category && media.known && media.blurb ? `${media.blurb} ` : 'MRP prices straight from our ERP. '}
            Can't find something? <Link to="/contact">Ask our team</Link>.
          </>
        }
      />
      <div className="container page-body catalog">
        {!category && !q && withProducts.length > 0 ? (
          <section className="catalog-cats" aria-labelledby="browse-heading">
            <h2 id="browse-heading" className="catalog-cats__title">
              Browse by category
            </h2>
            <ul className="supply-grid">
              {withProducts.map((c) => (
                <li key={c.name}>
                  <CategoryTile category={c} compact />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="filters card">
          <form onSubmit={onSearch} className="filter-search" role="search">
            <label htmlFor="q">Search</label>
            <div className="inline">
              <input id="q" type="search" value={draft} maxLength={100} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" className="btn btn-small">
                Go
              </button>
            </div>
          </form>
          <div>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={selectValue}
              disabled={catStatus === 'loading' && categories.length === 0}
              aria-describedby={catStatus === 'error' ? 'category-error' : undefined}
              onChange={(e) => update({ category: e.target.value || undefined })}
            >
              <option value="">{catStatus === 'loading' && categories.length === 0 ? 'Loading categories…' : 'All categories'}</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label} ({c.count})
                </option>
              ))}
              {/* A group that is not in the menu (e.g. a deep sub-group from a breadcrumb) stays selectable. */}
              {category && !found ? <option value={category}>{category}</option> : null}
            </select>
            {catStatus === 'error' && categories.length === 0 ? (
              <p id="category-error" className="muted small">
                Categories are unavailable right now; you can still search all products.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="sort">Sort by</label>
            <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'name' ? undefined : e.target.value })}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {category ? (
          <div className="category-bar" role="group" aria-label="Category filter">
            <span className="category-bar__active">
              Category: <strong>{activeLabel}</strong>
              <button
                type="button"
                className="category-bar__clear"
                aria-label={`Clear category filter ${activeLabel}`}
                onClick={() => update({ category: undefined })}
              >
                <CloseIcon size={14} />
              </button>
            </span>
            {found && found.top.children.length > 0 ? (
              <ul className="category-bar__subs">
                <li>
                  <button
                    type="button"
                    className="category-chip"
                    aria-pressed={found.match.name === found.top.name}
                    onClick={() => update({ category: found.top.name })}
                  >
                    All {found.top.label}
                  </button>
                </li>
                {found.top.children.map((c) => (
                  <li key={c.name}>
                    <button type="button" className="category-chip" aria-pressed={found.match.name === c.name} onClick={() => update({ category: c.name })}>
                      {c.label} <span className="category-chip__count">{c.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link to="/products" className="text-link category-bar__all">
              View all products
            </Link>
          </div>
        ) : null}

        {products.loading ? <ProductGridSkeleton count={PAGE_SIZE} /> : null}
        {products.error ? <ErrorNotice error={products.error} /> : null}
        {products.data ? (
          <>
            <p className="muted" aria-live="polite">
              {products.data.total} {products.data.total === 1 ? 'product' : 'products'}
              {q ? ` matching “${q}”` : ''}
              {category ? ` in ${activeLabel}` : ''}
            </p>
            {products.data.items.length === 0 ? (
              <div className="empty card">
                {category && !q ? (
                  <>
                    <p>No products are listed in {activeLabel} yet. Our team can still help you source what you need.</p>
                    <p className="empty__actions">
                      <Link to="/contact" className="btn btn-small">
                        Ask our team
                      </Link>
                      <Link to="/products" className="btn btn-outline btn-small">
                        View all products
                      </Link>
                    </p>
                  </>
                ) : (
                  <p>No products found. Try a different search or category.</p>
                )}
              </div>
            ) : (
              <div className="product-grid">
                {products.data.items.map((p) => (
                  <ProductCard key={p.itemCode} product={p} />
                ))}
              </div>
            )}
            {totalPages > 1 ? (
              <nav className="pagination" aria-label="Pagination">
                <button className="btn btn-outline btn-small" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-small"
                  disabled={page >= totalPages}
                  onClick={() => update({ page: String(page + 1) })}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
