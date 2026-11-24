import { Link } from 'react-router-dom';
import { categoryUrl } from '../api/client';
import { useAuth } from '../lib/auth';
import { useCategories } from '../lib/useCategories';
import { SUPPORT_EMAIL, SUPPORT_PHONE, telHref } from './Header';
import { ArrowRight, MailIcon, PhoneIcon } from './Icons';
import { Logo } from './Logo';
import { SOLUTIONS, solutionUrl } from './solutions';

/** Registered legal entity (company information); the visual brand is the AGRI SMART logo. */
export const LEGAL_NAME = 'AGRI SMART FARM SOLUTIONS LLP';

export function Footer() {
  const { categories } = useCategories();
  const { customer } = useAuth();
  const listed = categories.filter((c) => c.count > 0).slice(0, 6);
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          {/* The official logo has a white background: it always sits on its own white disc. */}
          <Link to="/" className="brand footer-logo">
            <Logo size={120} />
            <span className="visually-hidden">Home</span>
          </Link>
          <p className="footer-tagline">a smart way of farming</p>
          <p className="footer-legal">
            AGRI SMART is a brand of <strong>{LEGAL_NAME}</strong>.
          </p>
          <p>Seeds, irrigation, crop nutrition, protection and farm supplies with transparent MRP pricing and a team that answers your questions.</p>
        </div>

        <nav aria-label="Products" className="footer-col">
          <h2 className="footer-title">Products</h2>
          <ul>
            <li>
              <Link to="/products">All products</Link>
            </li>
            {listed.map((c) => (
              <li key={c.name}>
                <Link to={categoryUrl(c.name)}>{c.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Solutions" className="footer-col">
          <h2 className="footer-title">Solutions</h2>
          <ul>
            {SOLUTIONS.map((s) => (
              <li key={s.id}>
                <Link to={solutionUrl(s.id)}>{s.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <h2 className="footer-title">Contact</h2>
          <ul>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="footer-contact">
                <MailIcon size={16} /> {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              <a href={telHref(SUPPORT_PHONE)} className="footer-contact">
                <PhoneIcon size={16} /> {SUPPORT_PHONE}
              </a>
            </li>
            <li>
              <Link to="/contact">
                Send an inquiry <ArrowRight size={16} />
              </Link>
            </li>
          </ul>
          <h2 className="footer-title footer-title--spaced">Account</h2>
          <ul>
            {customer ? (
              <>
                <li>
                  <Link to="/account">My account</Link>
                </li>
                <li>
                  <Link to="/account/orders">My orders</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/signin">Sign in</Link>
                </li>
                <li>
                  <Link to="/signup">Create an account</Link>
                </li>
              </>
            )}
            <li>
              <Link to="/cart">Cart</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container footer-bottom__inner">
          <p>
            © {new Date().getFullYear()} {LEGAL_NAME}. All rights reserved.
          </p>
          <p>Online orders are confirmed by our team before payment. Prices shown are MRP.</p>
        </div>
      </div>
    </footer>
  );
}
