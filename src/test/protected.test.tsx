import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthGate } from '../components/AuthGate';
import { RequireCustomer } from '../components/RequireCustomer';
import { AuthProvider, useAuth } from '../lib/auth';
import { CART_KEY, CartProvider } from '../lib/cart';
import { saveDraft } from '../lib/formDraft';
import { rememberedReturnPath, rememberReturnPath } from '../lib/redirect';
import { SignInPage } from '../pages/account/SignInPage';
import { SignUpPage } from '../pages/account/SignUpPage';
import { CartPage } from '../pages/CartPage';
import { ContactPage } from '../pages/ContactPage';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const CUSTOMER = { email: 'kavya@example.com', name: 'Kavya Rao', phone: '+919876543210', emailVerified: true, createdAt: '2026-10-10T00:00:00Z' };
const CSRF = 'c'.repeat(43);
const signedOut = { customer: null, csrfToken: null };

/** Routes fetch calls by "METHOD /path"; the session can change during a test. */
function mockApi(routes: Record<string, (init?: RequestInit) => Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input).split('?')[0]!;
    const handler = routes[`${init?.method ?? 'GET'} ${path}`];
    return handler ? handler(init) : json(404, { error: { code: 'not_found', message: 'Not found' } });
  });
}

function Where() {
  const l = useLocation();
  return <p data-testid="where">{`${l.pathname}${l.search}`}</p>;
}

const renderAt = (url: string, routes: ReactNode) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <CartProvider>
          <Routes>{routes}</Routes>
          <Where />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('protected actions for visitors', () => {
  it('offers Sign in and Create account, both returning to the same product quote request', async () => {
    mockApi({ 'GET /api/customer/auth/session': () => json(200, signedOut) });
    renderAt('/contact?product=SEED-001&type=quote', <Route path="/contact" element={<ContactPage />} />);
    expect(await screen.findByRole('heading', { name: 'Sign in to request a quotation' })).toBeInTheDocument();
    // No form is shown to visitors, but the company contact details are.
    expect(screen.queryByLabelText('Message')).toBeNull();
    const next = encodeURIComponent('/contact?product=SEED-001&type=quote');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', `/signin?next=${next}`);
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', `/signup?next=${next}`);
  });

  it('asks a signed-in but unverified customer to confirm their email, then re-checks', async () => {
    let verified = false;
    mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: { ...CUSTOMER, emailVerified: verified }, csrfToken: CSRF }),
    });
    renderAt('/checkout', <Route path="/checkout" element={<AuthGate action="check out"><p>checkout form</p></AuthGate>} />);
    expect(await screen.findByRole('heading', { name: 'Confirm your email to check out' })).toBeInTheDocument();
    expect(screen.queryByText('checkout form')).toBeNull();
    verified = true;
    await userEvent.click(screen.getByRole('button', { name: 'I’ve confirmed my email' }));
    expect(await screen.findByText('checkout form')).toBeInTheDocument();
  });

  it('keeps the cart and sends visitors to sign in from the cart, returning to checkout', async () => {
    window.localStorage.setItem(CART_KEY, JSON.stringify([{ itemCode: 'SEED-001', qty: 2 }]));
    mockApi({
      'GET /api/customer/auth/session': () => json(200, signedOut),
      'POST /api/cart/quote': () =>
        json(200, { lines: [{ itemCode: 'SEED-001', name: 'Tomato Seeds', uom: 'Nos', qty: 2, unitPrice: 10, lineTotal: 20 }], currency: 'INR', subtotal: 20, itemCount: 2 }),
    });
    renderAt('/cart', <Route path="/cart" element={<CartPage />} />);
    const signIn = await screen.findByRole('link', { name: 'Sign in to check out' });
    expect(signIn).toHaveAttribute('href', '/signin?next=%2Fcheckout');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup?next=%2Fcheckout');
    expect(screen.queryByRole('link', { name: 'Proceed to checkout' })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(CART_KEY)!)).toEqual([{ itemCode: 'SEED-001', qty: 2 }]);
  });
});

describe('return to the intended action', () => {
  it('remembers the destination at sign-up and uses it at sign-in after email confirmation', async () => {
    mockApi({
      'GET /api/customer/auth/session': () => json(200, signedOut),
      'POST /api/customer/auth/register': () => json(202, { message: 'Check your inbox.' }),
    });
    renderAt('/signup?next=%2Fcheckout', <Route path="/signup" element={<SignUpPage />} />);
    await userEvent.type(await screen.findByLabelText('Full name'), 'Kavya Rao');
    await userEvent.type(screen.getByLabelText('Email'), 'kavya@example.com');
    await userEvent.type(screen.getByLabelText('Mobile number'), '+91 98765 43210');
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'Green-Fields-2026');
    await userEvent.type(screen.getByLabelText('Confirm password', { selector: 'input' }), 'Green-Fields-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/signin?next=%2Fcheckout');
    expect(rememberedReturnPath()).toBe('/checkout');
  });

  it('signs in to the remembered destination when the link has no next parameter, then forgets it', async () => {
    rememberReturnPath('/contact?product=SEED-001&type=quote');
    mockApi({
      'GET /api/customer/auth/session': () => json(200, signedOut),
      'POST /api/customer/auth/login': () => json(200, { customer: CUSTOMER, csrfToken: CSRF }),
    });
    renderAt('/signin', <Route path="/signin" element={<SignInPage />} />);
    await userEvent.type(await screen.findByLabelText('Email'), CUSTOMER.email);
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'Green-Fields-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/contact?product=SEED-001&type=quote'));
    expect(rememberedReturnPath()).toBeNull();
  });

  it('never stores or follows an external or malformed return path', () => {
    for (const bad of ['https://evil.example/x', '//evil.example', '/\\evil.example', '/%2F%2Fevil.example', '/signin?next=/x']) {
      rememberReturnPath(bad);
      expect(rememberedReturnPath()).toBeNull();
    }
    window.localStorage.setItem('agrismart.returnTo.v1', JSON.stringify({ path: '//evil.example', at: Date.now() }));
    expect(rememberedReturnPath()).toBeNull();
    window.localStorage.setItem('agrismart.returnTo.v1', JSON.stringify({ path: '/checkout', at: Date.now() - 25 * 60 * 60 * 1000 }));
    expect(rememberedReturnPath()).toBeNull(); // expired
  });

  it('keeps the unsent inquiry when the session expired and restores it after signing in again', async () => {
    let session: unknown = { customer: CUSTOMER, csrfToken: CSRF };
    mockApi({
      'GET /api/customer/auth/session': () => json(200, session),
      'POST /api/inquiries': () => {
        session = signedOut; // the server-side session has expired
        return json(401, { error: { code: 'unauthorized', message: 'Authentication required' } });
      },
    });
    const view = renderAt(
      '/contact?product=SEED-001',
      <>
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/signin" element={<p>sign in page</p>} />
      </>,
    );
    await userEvent.type(await screen.findByLabelText('Message'), 'Do you have this in 5 kg bags?');
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('sign in page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(`/signin?next=${encodeURIComponent('/contact?product=SEED-001')}`);
    view.unmount();

    session = { customer: CUSTOMER, csrfToken: CSRF };
    renderAt('/contact?product=SEED-001', <Route path="/contact" element={<ContactPage />} />);
    expect(await screen.findByLabelText('Message')).toHaveValue('Do you have this in 5 kg bags?');
  });
});

describe('sign out from a protected page', () => {
  it('goes home, not to sign in, even when sign-out finishes before navigation', async () => {
    mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: CUSTOMER, csrfToken: CSRF }),
      'POST /api/customer/auth/logout': () => new Response(null, { status: 204 }),
    });
    function Page() {
      const { signOut } = useAuth();
      return <button onClick={() => void signOut()}>Sign out now</button>; // no navigate('/') first
    }
    renderAt(
      '/account/addresses',
      <>
        <Route path="/account/addresses" element={<RequireCustomer><Page /></RequireCustomer>} />
        <Route path="/" element={<p>home</p>} />
        <Route path="/signin" element={<p>sign in page</p>} />
      </>,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out now' }));
    expect(await screen.findByText('home')).toBeInTheDocument();
  });
});

describe('sign out', () => {
  it('clears unsent drafts and the remembered destination', async () => {
    saveDraft('checkout', { line1: '1 Orchard Lane' });
    rememberReturnPath('/checkout');
    mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: CUSTOMER, csrfToken: CSRF }),
      'POST /api/customer/auth/logout': () => new Response(null, { status: 204 }),
    });
    function SignOut() {
      const { customer, signOut } = useAuth();
      return customer ? <button onClick={() => void signOut()}>Sign out</button> : <p>signed out</p>;
    }
    renderAt('/', <Route path="/" element={<SignOut />} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('signed out')).toBeInTheDocument();
    expect(Object.keys(window.sessionStorage).filter((k) => k.startsWith('agrismart.draft.'))).toEqual([]);
    expect(rememberedReturnPath()).toBeNull();
  });
});
