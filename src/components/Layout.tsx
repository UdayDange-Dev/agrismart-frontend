import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { prefersReducedMotion } from '../lib/motion';
import { Footer } from './Footer';
import { Header } from './Header';
import { ArrowUp } from './Icons';

/**
 * Scroll behaviour for the SPA: new pages start at the top; `/#section` links scroll to the
 * section once it has rendered (sections can depend on data that loads asynchronously).
 */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    // Only element ids (never treat the fragment as a selector or as a token).
    if (!/^[a-z][a-z0-9-]{0,60}$/.test(id)) return;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior, block: 'start' });
      else if (tries++ < 20) timer = window.setTimeout(attempt, 100);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShow(window.scrollY > 700));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return (
    <button
      type="button"
      className={`back-to-top${show ? ' is-visible' : ''}`}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
    >
      <ArrowUp />
    </button>
  );
}

/** Pages that render full-width sections (photo headers) and manage their own containers. */
const isFullBleed = (path: string) => path === '/' || path === '/products' || path === '/solutions' || path.startsWith('/solutions/');

export function Layout() {
  const { pathname } = useLocation();
  const full = isFullBleed(pathname);
  return (
    <div className={`app${pathname === '/' ? ' app--home' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <ScrollManager />
      <Header />
      {/* Full-bleed pages (home, catalogue, solutions) contain their own containers. */}
      <main id="main" className={full ? 'main main--full' : 'container main'} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
