import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, type Product } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { AuthProvider } from '../lib/auth';
import { CART_KEY, CartProvider, sanitizeCart } from '../lib/cart';
import { formatPrice, safeRelativeUrl } from '../lib/format';
import { getOrderToken, saveOrderToken } from '../lib/orderTokens';
import { ContactPage } from '../pages/ContactPage';

const product = (over: Partial<Product> = {}): Product => ({
  itemCode: 'SEED-001',
  name: 'Tomato Seeds',
  description: 'Plain text',
  category: 'VEGETABLE SEEDS',
  categoryLabel: 'Vegetable Seeds',
  categoryPath: [
    { name: 'SEEDS', label: 'Seeds' },
    { name: 'VEGETABLE SEEDS', label: 'Vegetable Seeds' },
  ],
  uom: 'Nos',
  price: { amount: 249.5, currency: 'INR' },
  imageUrl: '/api/products/SEED-001/image',
  ...over,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('cart storage', () => {
  it('keeps only item codes and integer quantities from untrusted storage', () => {
    const lines = sanitizeCart([
      { itemCode: 'SEED-001', qty: 2, price: 0.01, name: '<img src=x onerror=alert(1)>' },
      { itemCode: 'SEED-001', qty: 3 },
      { itemCode: '<script>', qty: 1 },
      { itemCode: 'FERT-010', qty: -4 },
      { itemCode: 'FERT-010', qty: 1.5 },
      { itemCode: 'BIG', qty: 999999 },
      'garbage',
      null,
    ]);
    expect(lines).toEqual([
      { itemCode: 'SEED-001', qty: 5 },
      { itemCode: 'BIG', qty: 1000 },
    ]);
    expect(sanitizeCart({ evil: true })).toEqual([]);
  });

  it('recovers from corrupted localStorage', () => {
    window.localStorage.setItem(CART_KEY, '{not json');
    render(
      <MemoryRouter>
        <CartProvider>
          <span>ok</span>
        </CartProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});

describe('rendering untrusted catalogue data', () => {
  it('renders ERPNext text as text, never as HTML', () => {
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
    const { container } = render(
      <MemoryRouter>
        <CartProvider>
          <ProductCard product={product({ description: payload, name: '<b>Bold</b>' })} />
        </CartProvider>
      </MemoryRouter>,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelectorAll('img')).toHaveLength(1); // only the product image itself
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('refuses non-relative image URLs', () => {
    for (const bad of ['javascript:alert(1)', '//evil.example/x.png', 'https://evil.example/x.png', '/\\evil.example', null]) {
      expect(safeRelativeUrl(bad)).toBeNull();
    }
    expect(safeRelativeUrl('/api/products/A/image')).toBe('/api/products/A/image');
  });

  it('shows a quote request instead of add-to-cart when there is no valid price', () => {
    render(
      <MemoryRouter>
        <CartProvider>
          <ProductCard product={product({ price: null })} />
        </CartProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Request a quote for Tomato Seeds' })).toHaveAttribute('href', '/contact?product=SEED-001&type=quote');
    // No price is ever invented: the card says "Ask for price" and shows no amount or currency.
    expect(screen.getByText('Ask for price')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹|INR|\d+\.\d{2}/);
  });

  it('formats a missing price as "Ask for price", never as a number', () => {
    expect(formatPrice(null)).toBe('Ask for price');
    expect(formatPrice({ amount: 249.5, currency: 'INR' })).toBe('₹249.50');
  });
});

describe('API client', () => {
  it('maps server errors to safe user-facing messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(500, { error: { code: 'internal_error', message: 'MongoServerError at 10.0.0.5', requestId: 'req-12345678' } }),
    );
    const err = (await apiFetch('/products').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).not.toContain('Mongo');
    expect(err.requestId).toBe('req-12345678');
  });

  it('only calls same-origin relative API paths', async () => {
    await expect(apiFetch('//evil.example/x')).rejects.toThrow();
    await expect(apiFetch('https://evil.example/x')).rejects.toThrow();
  });

  it('sends cookies only same-origin', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }));
    await apiFetch('/health');
    expect(spy.mock.calls[0]![1]!.credentials).toBe('same-origin');
    expect(spy.mock.calls[0]![0]).toBe('/api/health');
  });
});

describe('order token storage', () => {
  it('stores only well-formed references and tokens', () => {
    saveOrderToken('AGS-ABCDEFGHJK', 'a'.repeat(43));
    saveOrderToken('../../etc', 'a'.repeat(43));
    saveOrderToken('AGS-ABCDEFGHJM', '<script>');
    expect(getOrderToken('AGS-ABCDEFGHJK')).toBe('a'.repeat(43));
    expect(getOrderToken('../../etc')).toBeNull();
    expect(getOrderToken('AGS-ABCDEFGHJM')).toBeNull();
  });
});

describe('contact form (signed-in, verified customer)', () => {
  const SESSION = {
    customer: { email: 'ravi@example.com', name: 'Ravi Kumar', phone: '+919876543210', emailVerified: true, createdAt: '2026-10-01T00:00:00Z' },
    csrfToken: 'c'.repeat(43),
  };
  /** Session lookups get a verified customer; the inquiry POST gets the given response. */
  const mockApi = (inquiry: () => Response) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).startsWith('/api/customer/auth/session') ? jsonResponse(200, SESSION) : inquiry(),
    );
  const renderContact = (url = '/contact') =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <AuthProvider>
          <Routes>
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  const posts = (spy: ReturnType<typeof mockApi>) => spy.mock.calls.filter(([, init]) => init?.method === 'POST');

  it('validates fields client-side before sending', async () => {
    const spy = mockApi(() => jsonResponse(500, {}));
    renderContact();
    const name = await screen.findByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Message must be at least 10 characters.')).toBeInTheDocument();
    expect(posts(spy)).toHaveLength(0);
  });

  it('submits only the expected fields (no email: the API uses the account email), ignores a malformed product parameter and shows the reference', async () => {
    const spy = mockApi(() => jsonResponse(202, { reference: 'INQ-ABCDEFGHJK', duplicate: false, crmSync: 'queued', message: 'Thank you.' }));
    renderContact('/contact?product=%3Cscript%3E');
    expect(await screen.findByLabelText('Full name')).toHaveValue('Ravi Kumar'); // prefilled from the account
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).toBeNull();
    await userEvent.type(screen.getByLabelText('Message'), 'Please send a quote for seeds.');
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('INQ-ABCDEFGHJK')).toBeInTheDocument();
    const [, init] = posts(spy)[0]!;
    const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['kind', 'message', 'name', 'phone', 'website']);
    expect(body).toMatchObject({ kind: 'inquiry', website: '' });
    expect((init!.headers as Record<string, string>)['X-CSRF-Token']).toBe(SESSION.csrfToken);
  });

  it('shows server-side validation messages on the matching field', async () => {
    mockApi(() =>
      jsonResponse(400, {
        error: { code: 'validation_error', message: 'The request contains invalid data', details: [{ path: 'phone', message: 'Enter a valid phone number' }] },
      }),
    );
    renderContact();
    await screen.findByLabelText('Full name');
    await userEvent.type(screen.getByLabelText('Message'), 'Please send a quote for seeds.');
    await userEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
  });
});
