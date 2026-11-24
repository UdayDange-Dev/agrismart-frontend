import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NavDropdown } from '../components/NavDropdown';
import { Reveal } from '../components/Reveal';
import { findCategory } from '../lib/useCategories';

function Menu() {
  return (
    <MemoryRouter>
      <NavDropdown label="Solutions">
        {(close) => (
          <ul>
            <li>
              <Link data-menu-item to="/a" onClick={close}>
                First
              </Link>
            </li>
            <li>
              <Link data-menu-item to="/b" onClick={close}>
                Second
              </Link>
            </li>
          </ul>
        )}
      </NavDropdown>
      <button>Outside</button>
    </MemoryRouter>
  );
}

describe('NavDropdown', () => {
  it('toggles on click and exposes the state via aria-expanded', async () => {
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Solutions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard: ArrowDown opens and focuses the first item, arrows move, Escape closes and returns focus', async () => {
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Solutions' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await screen.findByText('First');
    await new Promise((r) => requestAnimationFrame(r));
    expect(screen.getByRole('link', { name: 'First' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'Second' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'First' })).toHaveFocus(); // wraps
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes when focus leaves the menu or the user clicks outside', async () => {
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Solutions' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('with `to`, the label is a real link and a separate button toggles the menu', async () => {
    render(
      <MemoryRouter initialEntries={['/products/SEED-001']}>
        <NavDropdown label="Products" to="/products">
          {(close) => (
            <Link data-menu-item to="/products?category=SEEDS" onClick={close}>
              Seeds
            </Link>
          )}
        </NavDropdown>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Products' });
    expect(link).toHaveAttribute('href', '/products');
    expect(link).toHaveAttribute('aria-current', 'page'); // active on product sub-pages
    const toggle = screen.getByRole('button', { name: 'Products menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('link', { name: 'Seeds' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false'); // closes after selecting a link
  });
});

describe('findCategory', () => {
  const cats = [
    { name: 'IRRIGATION', label: 'Irrigation', count: 1, children: [{ name: 'DRIP IRRIGATION', label: 'Drip Irrigation', count: 1 }] },
    { name: 'WATER PUMPS & MOTORS', label: 'Water Pumps & Motors', count: 0, children: [] },
  ];

  it('matches top-level and sub-groups case-insensitively, including special characters', () => {
    expect(findCategory(cats, 'Irrigation')?.match.name).toBe('IRRIGATION');
    expect(findCategory(cats, 'drip irrigation')).toEqual({ match: cats[0]!.children[0], top: cats[0] });
    expect(findCategory(cats, 'WATER PUMPS & MOTORS')?.top.label).toBe('Water Pumps & Motors');
    expect(findCategory(cats, 'Drip')).toBeNull();
    expect(findCategory(cats, '')).toBeNull();
  });
});

describe('Reveal', () => {
  it('shows content immediately when IntersectionObserver is unavailable (no hidden content)', () => {
    render(<Reveal>Visible text</Reveal>);
    expect(screen.getByText('Visible text')).toHaveClass('reveal', 'is-visible');
  });
});

describe('Company contact details', () => {
  it('are always shown on the contact page, falling back to the official LLP details', async () => {
    const { SUPPORT_EMAIL, SUPPORT_PHONE } = await import('../components/Header');
    const { ContactPage } = await import('../pages/ContactPage');
    if (!import.meta.env.VITE_SUPPORT_EMAIL) expect(SUPPORT_EMAIL).toBe('agrismartfarmsolutionsllp@gmail.com');
    if (!import.meta.env.VITE_SUPPORT_PHONE) expect(SUPPORT_PHONE).toBe('+91 93739 47000');
    const { AuthProvider } = await import('../lib/auth');
    // Visitors (signed out) still see the company contact details.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ customer: null, csrfToken: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    render(
      <MemoryRouter>
        <AuthProvider>
          <ContactPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`);
    expect(screen.getByRole('link', { name: SUPPORT_PHONE })).toHaveAttribute('href', `tel:${SUPPORT_PHONE.replace(/[^+0-9]/g, '')}`);
  });
});
