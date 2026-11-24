import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { categoryUrl } from '../api/client';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { signInUrlFor } from '../lib/redirect';
import { useCategories } from '../lib/useCategories';
import { ArrowRight, CartIcon, CategoryIcon, CloseIcon, MailIcon, MenuIcon, PhoneIcon, SearchIcon, UserIcon } from './Icons';
import { Logo } from './Logo';
import { MobileNav } from './MobileNav';
import { NavDropdown } from './NavDropdown';
import { categoryMedia, NAV_GROUPS } from '../lib/categoryMedia';
import { SOLUTIONS, solutionUrl, srcSet } from './solutions';

// Official public contact details of AGRI SMART FARM SOLUTIONS LLP. A valid VITE_SUPPORT_* value
// overrides them; an absent or malformed one falls back here, so the site always shows a contact.
const COMPANY_EMAIL = 'agrismartfarmsolutionsllp@gmail.com';
const COMPANY_PHONE = '+91 93739 47000';
const rawEmail = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
export const SUPPORT_EMAIL = rawEmail && /^[^\s@<>"?&]+@[^\s@<>"?&]+$/.test(rawEmail) ? rawEmail : COMPANY_EMAIL;
const rawPhone = import.meta.env.VITE_SUPPORT_PHONE as string | undefined;
export const SUPPORT_PHONE = rawPhone && /^[+0-9 ()-]{6,24}$/.test(rawPhone) ? rawPhone : COMPANY_PHONE;
export const telHref = (phone: string) => `tel:${phone.replace(/[^+0-9]/g, '')}`;

export function Header() {
  const { count } = useCart();
  const { status, customer, signOut } = useAuth();
  const { categories, status: catStatus } = useCategories();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const signInHref = signInUrlFor(`${location.pathname}${location.search}`);

  // Sticky header: switch to the compact/shadowed state after a little scrolling (rAF-throttled).
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Close overlays on navigation.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const doSignOut = async () => {
    setMenuOpen(false);
    navigate('/', { replace: true }); // leave protected pages before the guard sees the signed-out state
    await signOut().catch(() => undefined);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim().slice(0, 100);
    setSearchOpen(false);
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className={`utility-bar${SUPPORT_EMAIL || SUPPORT_PHONE ? '' : ' utility-bar--tagline-only'}`}>
        <div className="container utility-inner">
          <p className="utility-tagline">Genuine farm inputs at MRP, with expert support</p>
          <div className="utility-contact">
            {SUPPORT_EMAIL ? (
              <a href={`mailto:${SUPPORT_EMAIL}`} className="utility-link">
                <MailIcon size={16} /> {SUPPORT_EMAIL}
              </a>
            ) : null}
            {SUPPORT_PHONE ? (
              <a href={telHref(SUPPORT_PHONE)} className="utility-link">
                <PhoneIcon size={16} /> {SUPPORT_PHONE}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="main-bar">
        <div className="container main-inner">
          <Link to="/" className="brand">
            <Logo size={72} className="brand__logo" priority />
            <span className="visually-hidden">Home</span>
          </Link>

          <nav className="primary-nav" aria-label="Main">
            <NavLink to="/" end className="nav-link">
              <span>Home</span>
            </NavLink>
            <NavDropdown label="Products" to="/products" variant="mega">
              {(close) => (
                <div className="mega">
                  <div className="mega__main">
                    {catStatus === 'loading' && categories.length === 0 ? <p className="muted small">Loading categories…</p> : null}
                    {catStatus === 'error' && categories.length === 0 ? <p className="muted small">Categories are unavailable right now.</p> : null}
                    {catStatus === 'ready' && categories.length === 0 ? <p className="muted small">No categories are available yet.</p> : null}
                    {/* ERPNext top-level Item Groups, grouped into columns (see lib/categoryMedia.ts). */}
                    <div className="mega__cols">
                      {NAV_GROUPS.map((g) => {
                        const items = categories.filter((c) => categoryMedia(c.name).group === g.id);
                        if (items.length === 0) return null;
                        return (
                          <div className="mega__col" key={g.id}>
                            <p className="mega__title">{g.title}</p>
                            <ul className="mega__list">
                              {items.map((c) => (
                                <li key={c.name}>
                                  <Link data-menu-item to={categoryUrl(c.name)} className="mega__link" onClick={close}>
                                    <span className="mega__icon">
                                      <CategoryIcon name={c.name} size={18} />
                                    </span>
                                    <span>
                                      {c.label}
                                      <small>
                                        {c.count} {c.count === 1 ? 'product' : 'products'}
                                      </small>
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <Link data-menu-item to="/products" className="text-link mega__all" onClick={close}>
                      View all products <ArrowRight size={16} />
                    </Link>
                  </div>
                  <Link data-menu-item to="/contact" className="mega__promo" onClick={close}>
                    <img src="/images/solution-seedlings-480.webp" srcSet={srcSet('solution-seedlings', [480, 800])} sizes="280px" alt="" loading="lazy" decoding="async" />
                    <span className="mega__promo-text">
                      <strong>Need bulk quantities?</strong>
                      Send an inquiry and our team will reply within one working day.
                      <span className="text-link">
                        Request an inquiry <ArrowRight size={16} />
                      </span>
                    </span>
                  </Link>
                </div>
              )}
            </NavDropdown>
            <NavDropdown label="Solutions" to="/solutions">
              {(close) => (
                <ul className="menu-list">
                  {SOLUTIONS.map((s) => (
                    <li key={s.id}>
                      <Link data-menu-item to={solutionUrl(s.id)} onClick={close}>
                        {s.title}
                        <ArrowRight size={16} className="menu-list__arrow" />
                      </Link>
                    </li>
                  ))}
                  <li className="menu-list__footer">
                    <Link data-menu-item to="/solutions" onClick={close}>
                      All solutions
                      <ArrowRight size={16} className="menu-list__arrow" />
                    </Link>
                  </li>
                </ul>
              )}
            </NavDropdown>
            <NavLink to="/contact" className="nav-link">
              <span>Contact</span>
            </NavLink>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label={searchOpen ? 'Close search' : 'Search products'}
              aria-expanded={searchOpen}
              aria-controls="header-search"
              onClick={() => setSearchOpen((o) => !o)}
            >
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </button>

            {status === 'ready' && customer ? (
              <NavDropdown label="Account" icon={<UserIcon size={18} />} align="end" className="account-menu">
                {() => (
                  <ul className="menu-list">
                    <li className="menu-list__meta">{customer.email}</li>
                    <li>
                      <Link data-menu-item to="/account">
                        My account
                      </Link>
                    </li>
                    <li>
                      <Link data-menu-item to="/account/orders">
                        My orders
                      </Link>
                    </li>
                    <li>
                      <Link data-menu-item to="/account/inquiries">
                        Inquiries &amp; quotes
                      </Link>
                    </li>
                    <li>
                      <Link data-menu-item to="/account/addresses">
                        Addresses
                      </Link>
                    </li>
                    <li>
                      <button data-menu-item type="button" className="menu-list__button" onClick={doSignOut}>
                        Sign out
                      </button>
                    </li>
                  </ul>
                )}
              </NavDropdown>
            ) : status === 'ready' ? (
              <div className="auth-links">
                <NavLink to={signInHref} className="nav-link">
                  <span>Sign in</span>
                </NavLink>
              </div>
            ) : (
              // Reserve the link's width while the session loads, so the header does not shift.
              <div className="auth-links auth-links--pending" aria-hidden="true">
                <span className="nav-link">
                  <span>Sign in</span>
                </span>
              </div>
            )}

            <NavLink to="/cart" className="icon-button cart-button" aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
              <CartIcon />
              <span className="badge" aria-hidden="true">
                {count}
              </span>
            </NavLink>

            <Link to="/contact" className="btn btn-accent header-cta">
              Request an inquiry <ArrowRight size={18} className="btn-arrow" />
            </Link>

            <button
              ref={menuButton}
              type="button"
              className="icon-button menu-toggle"
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon size={24} />
            </button>
          </div>
        </div>

        <div id="header-search" className={`search-panel${searchOpen ? ' is-open' : ''}`} inert={!searchOpen}>
          <form className="container search-panel__form" role="search" onSubmit={onSearch}>
            <label htmlFor="site-search" className="visually-hidden">
              Search products
            </label>
            <SearchIcon />
            <input
              ref={searchInput}
              id="site-search"
              type="search"
              placeholder="Search seeds, irrigation, fertilisers…"
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchOpen(false);
              }}
            />
            <button type="submit" className="btn btn-small">
              Search
            </button>
          </form>
        </div>
      </div>

      <MobileNav
        open={menuOpen}
        onClose={closeMenu}
        returnFocusTo={menuButton}
        customer={status === 'ready' ? customer : null}
        signInHref={signInHref}
        onSignOut={doSignOut}
        cartCount={count}
      />
    </header>
  );
}
