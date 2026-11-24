import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { categoryUrl } from '../api/client';
import type { Customer } from '../api/customer';
import { useCategories } from '../lib/useCategories';
import { ArrowRight, CategoryIcon, ChevronDown, CloseIcon, SearchIcon } from './Icons';
import { Logo } from './Logo';
import { SOLUTIONS, solutionUrl } from './solutions';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Off-canvas navigation for small screens: a modal dialog with focus trap, Escape to close,
 * backdrop click to close, body scroll lock, and focus returned to the menu button.
 */
export function MobileNav({
  open,
  onClose,
  returnFocusTo,
  customer,
  signInHref,
  onSignOut,
  cartCount,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusTo: RefObject<HTMLButtonElement | null>;
  customer: Customer | null;
  signInHref: string;
  onSignOut: () => void;
  cartCount: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const productsId = useId();
  const solutionsId = useId();
  const [productsOpen, setProductsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { categories, status: catStatus } = useCategories();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const returnTo = returnFocusTo.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      returnTo?.focus();
    };
  }, [open, onClose, returnFocusTo]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim().slice(0, 100);
    onClose();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return createPortal(
    <div className={`mobile-nav${open ? ' is-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="mobile-nav__backdrop" onClick={onClose} />
      <div ref={panelRef} className="mobile-nav__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mobile-nav__head">
          <Link to="/" className="brand" onClick={onClose}>
            <Logo size={56} />
            <span className="visually-hidden">Home</span>
          </Link>
          <h2 id={titleId} className="visually-hidden">AGRI SMART menu</h2>
          <button type="button" className="icon-button" aria-label="Close menu" onClick={onClose}>
            <CloseIcon size={22} />
          </button>
        </div>

        <form className="mobile-nav__search" role="search" onSubmit={onSearch}>
          <label htmlFor="mobile-search" className="visually-hidden">
            Search products
          </label>
          <input id="mobile-search" type="search" placeholder="Search products" maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" className="icon-button" aria-label="Search">
            <SearchIcon />
          </button>
        </form>

        <nav aria-label="Mobile" className="mobile-nav__links">
          <NavLink to="/" end onClick={onClose}>
            Home
          </NavLink>
          <div className="mobile-nav__row">
            <NavLink to="/products" onClick={onClose}>
              Products
            </NavLink>
            <button
              type="button"
              className="mobile-nav__toggle"
              aria-label="Product categories"
              aria-expanded={productsOpen}
              aria-controls={productsId}
              onClick={() => setProductsOpen((o) => !o)}
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div id={productsId} className="mobile-nav__sub" hidden={!productsOpen}>
            <Link to="/products" onClick={onClose}>
              All products <ArrowRight size={16} />
            </Link>
            {catStatus === 'loading' && categories.length === 0 ? <p className="muted small">Loading categories…</p> : null}
            {catStatus === 'error' && categories.length === 0 ? <p className="muted small">Categories are unavailable right now.</p> : null}
            {categories.map((c) => (
              <Link key={c.name} to={categoryUrl(c.name)} onClick={onClose}>
                <CategoryIcon name={c.name} size={18} /> {c.label}
              </Link>
            ))}
          </div>
          <div className="mobile-nav__row">
            <NavLink to="/solutions" onClick={onClose}>
              Solutions
            </NavLink>
            <button
              type="button"
              className="mobile-nav__toggle"
              aria-label="Solution pages"
              aria-expanded={solutionsOpen}
              aria-controls={solutionsId}
              onClick={() => setSolutionsOpen((o) => !o)}
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div id={solutionsId} className="mobile-nav__sub" hidden={!solutionsOpen}>
            {SOLUTIONS.map((s) => (
              <Link key={s.id} to={solutionUrl(s.id)} onClick={onClose}>
                {s.title}
              </Link>
            ))}
          </div>
          <NavLink to="/contact" onClick={onClose}>
            Contact
          </NavLink>
          <NavLink to="/cart" onClick={onClose}>
            Cart ({cartCount})
          </NavLink>
        </nav>

        <div className="mobile-nav__account">
          {customer ? (
            <>
              <p className="muted small">Signed in as {customer.email}</p>
              <Link to="/account" onClick={onClose}>
                Account
              </Link>
              <Link to="/account/orders" onClick={onClose}>
                My orders
              </Link>
              <Link to="/account/inquiries" onClick={onClose}>
                Inquiries &amp; quotes
              </Link>
              <Link to="/account/addresses" onClick={onClose}>
                Addresses
              </Link>
              <button type="button" className="nav-button" onClick={onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to={signInHref} onClick={onClose}>
                Sign in
              </Link>
            </>
          )}
        </div>

        <Link to="/contact" className="btn btn-accent btn-block" onClick={onClose}>
          Request an inquiry <ArrowRight size={18} className="btn-arrow" />
        </Link>
      </div>
    </div>,
    document.body,
  );
}
