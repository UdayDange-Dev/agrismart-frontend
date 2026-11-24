import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RequireCustomer } from '../components/RequireCustomer';
import { AuthProvider } from '../lib/auth';
import { safeNextPath } from '../lib/redirect';
import { validateNewPassword } from '../lib/validation';
import { AccountPage } from '../pages/account/AccountPage';
import { ResetPasswordPage, VerifyEmailPage } from '../pages/account/RecoveryPages';
import { SignInPage } from '../pages/account/SignInPage';
import { SignUpPage } from '../pages/account/SignUpPage';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const CUSTOMER = { email: 'kavya@example.com', name: 'Kavya Rao', phone: '+919876543210', emailVerified: true, createdAt: '2026-10-10T00:00:00Z' };
const CSRF = 'c'.repeat(43);

/** Routes fetch calls by path; records every call for assertions. */
function mockApi(routes: Record<string, (init?: RequestInit) => Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input).split('?')[0]!;
    const handler = routes[`${init?.method ?? 'GET'} ${path}`];
    return handler ? handler(init) : json(404, { error: { code: 'not_found', message: 'Not found' } });
  });
}

function Where() {
  const l = useLocation();
  return <p data-testid="where">{`${l.pathname}${l.search}${l.hash}`}</p>;
}

const renderAt = (url: string, routes: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>{routes}</Routes>
        <Where />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('safe post-login redirects', () => {
  it('allows internal paths only', () => {
    expect(safeNextPath('/account/orders')).toBe('/account/orders');
    expect(safeNextPath('/products?q=seed#top')).toBe('/products?q=seed#top');
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/%0d%0aSet-Cookie', '/%2F%2Fevil.example', '/%5Cevil.example', '/%E0%A4%A', '\u0000/x', '/signin?next=/x', 'account', null, '']) {
      expect(safeNextPath(bad)).toBe('/account');
    }
  });
});

describe('password rules (client mirror of the server policy)', () => {
  it('flags weak passwords', () => {
    expect(validateNewPassword('short')).toBeDefined();
    expect(validateNewPassword('alllowercase1234')).toBeDefined();
    expect(validateNewPassword('Password1234')).toBeDefined();
    expect(validateNewPassword('Kavya-Fields-2026', { name: 'Kavya Rao' })).toBeDefined();
    expect(validateNewPassword('Green-Fields-2026', { email: 'kavya@example.com' })).toBeUndefined();
  });
});

describe('sign in', () => {
  it('shows the generic server error and does not reveal account existence', async () => {
    mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }),
      'POST /api/customer/auth/login': () => json(401, { error: { code: 'invalid_credentials', message: 'Invalid email or password' } }),
    });
    renderAt('/signin', <Route path="/signin" element={<SignInPage />} />);
    await userEvent.type(await screen.findByLabelText('Email'), 'kavya@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Wrong-Password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue(''); // password cleared
  });

  it('returns to a safe "next" destination and ignores external ones', async () => {
    mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }),
      'POST /api/customer/auth/login': () => json(200, { customer: CUSTOMER, csrfToken: CSRF }),
    });
    renderAt(
      '/signin?next=https%3A%2F%2Fevil.example%2Fphish',
      <>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/account" element={<p>account page</p>} />
      </>,
    );
    await userEvent.type(await screen.findByLabelText('Email'), 'kavya@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Green-Fields-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/account$/));
    // Nothing auth-related is persisted in web storage.
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('toggles password visibility accessibly', async () => {
    mockApi({ 'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }) });
    renderAt('/signin', <Route path="/signin" element={<SignInPage />} />);
    const input = await screen.findByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('sign up', () => {
  it('validates before sending and maps server field errors', async () => {
    const spy = mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }),
      'POST /api/customer/auth/register': () =>
        json(400, { error: { code: 'validation_error', message: 'The request contains invalid data', details: [{ path: 'phone', message: 'Enter a valid phone number' }] } }),
    });
    renderAt('/signup', <Route path="/signup" element={<SignUpPage />} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(spy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);

    await userEvent.type(screen.getByLabelText('Full name'), 'Kavya Rao');
    await userEvent.type(screen.getByLabelText('Email'), 'kavya@example.com');
    await userEvent.type(screen.getByLabelText('Mobile number'), '+91 98765 43210');
    await userEvent.type(screen.getByLabelText('Password'), 'Green-Fields-2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Green-Fields-2027');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Confirm password'));
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Green-Fields-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
    const body = JSON.parse(String(spy.mock.calls.find(([, i]) => i?.method === 'POST')![1]!.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['confirmPassword', 'email', 'name', 'password', 'phone', 'website']);
  });
});

describe('protected pages', () => {
  it('redirects signed-out visitors to sign in with a return path', async () => {
    mockApi({ 'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }) });
    renderAt(
      '/account/orders',
      <>
        <Route path="/account/orders" element={<RequireCustomer><p>orders</p></RequireCustomer>} />
        <Route path="/signin" element={<p>sign in page</p>} />
      </>,
    );
    expect(await screen.findByText('sign in page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/signin?next=%2Faccount%2Forders');
  });

  it('sends the in-memory CSRF token with account changes', async () => {
    const spy = mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: CUSTOMER, csrfToken: CSRF }),
      'PATCH /api/customer/account': () => json(200, { customer: { ...CUSTOMER, name: 'Kavya S Rao' } }),
    });
    renderAt('/account', <Route path="/account" element={<RequireCustomer><AccountPage /></RequireCustomer>} />);
    const name = await screen.findByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Kavya S Rao');
    await userEvent.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByText('Your details were saved.')).toBeInTheDocument();
    const patch = spy.mock.calls.find(([, init]) => init?.method === 'PATCH')!;
    expect((patch[1]!.headers as Record<string, string>)['X-CSRF-Token']).toBe(CSRF);
    expect(patch[1]!.credentials).toBe('same-origin');
  });
});

describe('password reset page', () => {
  it('reads the token from the fragment, removes it from the URL and submits it', async () => {
    const token = 't'.repeat(43);
    const spy = mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }),
      'POST /api/customer/auth/reset-password': () => json(200, { message: 'Your password has been changed.' }),
    });
    renderAt(`/reset-password#token=${token}`, <Route path="/reset-password" element={<ResetPasswordPage />} />);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/reset-password$/));
    await userEvent.type(screen.getByLabelText('New password'), 'Harvest-Moon-77');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Harvest-Moon-77');
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument();
    const call = spy.mock.calls.find(([url]) => String(url).endsWith('/reset-password'))!;
    expect(JSON.parse(String(call[1]!.body))).toEqual({ token, password: 'Harvest-Moon-77', confirmPassword: 'Harvest-Moon-77' });
  });

  it('uses the newest link when several are opened in the same tab, and resets for each visit', async () => {
    const A = 'a'.repeat(43);
    const B = 'b'.repeat(43);
    const sent: string[] = [];
    mockApi({
      'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }),
      'POST /api/customer/auth/verify-email': (init) => {
        const { token } = JSON.parse(String(init?.body)) as { token: string };
        sent.push(token);
        return token === B && sent.filter((t) => t === B).length === 1
          ? json(200, { result: 'verified', message: 'Your email address is confirmed.' })
          : json(400, { error: { code: 'invalid_token', message: 'This link is invalid or has expired. Please request a new one.' } });
      },
    });
    function OpenLink({ token }: { token: string }) {
      const navigate = useNavigate();
      return <button onClick={() => navigate(`/verify-email#token=${token}`)}>open {token[0]}</button>;
    }
    renderAt(
      `/verify-email#token=${A}`,
      <Route path="/verify-email" element={<><VerifyEmailPage /><OpenLink token={B} /></>} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm email address' }));
    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'open b' })); // newer link, same tab
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm email address' }));
    expect(await screen.findByText('Your email address is confirmed.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'open b' })); // same link again
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm email address' }));
    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
    expect(sent).toEqual([A, B, B]);
  });

  it('shows a helpful message when the link has no valid token', async () => {
    mockApi({ 'GET /api/customer/auth/session': () => json(200, { customer: null, csrfToken: null }) });
    renderAt('/reset-password#token=<script>', <Route path="/reset-password" element={<ResetPasswordPage />} />);
    expect(await screen.findByText('Reset link not valid')).toBeInTheDocument();
  });
});
