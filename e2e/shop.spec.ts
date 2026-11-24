import { expect, test, type Page } from '@playwright/test';
import { apiFromPage, newVerifiedCustomer, signIn, signOutViaHeader, watchConsole } from './support';

async function placeOrder(page: Page): Promise<string> {
  await page.goto('/products/SEED-001');
  await expect(page.getByRole('heading', { name: 'Hybrid Tomato Seeds (100g)' })).toBeVisible();
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout');
  await expect(page.getByText(/the order will appear in/)).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Kavya Rao'); // prefilled from the account
  await page.getByLabel('Address line 1').fill('1 Orchard Lane');
  await page.getByLabel('City / village').fill('Nashik');
  await page.getByLabel('State').fill('Maharashtra');
  await page.getByLabel('PIN code').fill('422001');
  await page.getByLabel(/I understand this is an order request/).check();
  await expect(page.getByText('₹499.00').first()).toBeVisible(); // server-priced subtotal
  await page.getByRole('button', { name: 'Submit order request' }).click();
  await expect(page.getByText(/Your order request has been received/)).toBeVisible();
  const ref = page.url().match(/AGS-[A-HJ-NP-Z2-9]{10}/)![0];
  return ref;
}

test('storefront browsing works under the production CSP', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Smarter farm inputs/ })).toBeVisible();
  await page.goto('/products?q=tomato');
  await expect(page.getByRole('link', { name: 'Hybrid Tomato Seeds (100g)', exact: true })).toBeVisible();
  // Image comes through the API image proxy and must actually decode under the CSP.
  const imageResponse = page.waitForResponse('**/api/products/SEED-001/image');
  await page.goto('/products/SEED-001');
  expect((await imageResponse).status()).toBe(200);
  const img = page.getByRole('img', { name: 'Hybrid Tomato Seeds (100g)' });
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  const csp = (await page.request.get('/')).headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(problems).toEqual([]);
});

test('a customer sees their own orders; another customer cannot', async ({ page, browser }) => {
  await newVerifiedCustomer(page, 'owner');
  const ref = await placeOrder(page);
  await page.goto('/account/orders');
  await expect(page.getByRole('heading', { name: ref })).toBeVisible();

  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await newVerifiedCustomer(other, 'snoop');
  await other.goto('/account/orders');
  await expect(other.getByText('You have not placed any orders yet.')).toBeVisible();
  const steal = await apiFromPage(other, `/api/customer/orders/${ref}`);
  expect(steal.status).toBe(404);
  const list = await apiFromPage(other, '/api/customer/orders');
  expect(JSON.stringify(list.body)).not.toContain(ref);
  // The public order page needs that order's access token, which only the buyer's tab has.
  await other.goto(`/orders/${ref}`);
  await expect(other.getByText(/can only be viewed from the browser session/)).toBeVisible();
  await otherCtx.close();
});

test('client-supplied prices are rejected by the API', async ({ page }) => {
  await page.goto('/');
  const res = await apiFromPage(page, '/api/cart/quote', { method: 'POST', body: { items: [{ itemCode: 'SEED-001', qty: 1, price: 0.01 }] } });
  expect(res.status).toBe(400);
});

test('customers are rejected from administrator APIs and pages', async ({ page }) => {
  await newVerifiedCustomer(page, 'notadmin');
  for (const path of ['/api/admin/orders', '/api/admin/inquiries', '/api/auth/me']) {
    expect((await apiFromPage(page, path)).status).toBe(401);
  }
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  // Customer credentials do not work for staff sign-in.
  await page.getByLabel('Email').fill('admin@agrismart.local');
  await page.getByLabel('Password').fill('Green-Fields-2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test('staff admin can sign in and see orders (separate session)', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Email').fill('admin@agrismart.local');
  await page.getByLabel('Password').fill('E2e-Admin-Password-42');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Back office' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh catalogue' }).click(); // CSRF-protected write
  await expect(page.getByText(/Catalogue refreshed: \d+ products/)).toBeVisible();
  // A staff session does not make the visitor a signed-in customer.
  expect((await apiFromPage(page, '/api/customer/account')).status).toBe(401);
});

test('API errors show a friendly message, not internals', async ({ page }) => {
  await page.route('**/api/products?**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'internal_error', message: 'MongoServerError at 10.0.0.5', requestId: 'req-e2e-1234' } }) }),
  );
  await page.goto('/products');
  await expect(page.getByText('Something went wrong on our side. Please try again later.')).toBeVisible();
  await expect(page.getByText(/MongoServerError/)).toHaveCount(0);
  await expect(page.getByText('Reference: req-e2e-1234')).toBeVisible();
});

test('sign in from checkout returns to checkout', async ({ page }) => {
  const p = await newVerifiedCustomer(page, 'checkout');
  await signOutViaHeader(page);
  await page.goto('/products/FERT-010');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout');
  await page.getByRole('main').getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2Fcheckout$/);
  await signIn(page, p.email, undefined, page.url().replace(/^https?:\/\/[^/]+/, ''));
  await expect(page).toHaveURL(/\/checkout$/);
});
