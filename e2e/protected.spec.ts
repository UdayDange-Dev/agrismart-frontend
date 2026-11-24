import { expect, test, type Page } from '@playwright/test';
import {
  apiFromPage,
  control,
  linkFrom,
  newPerson,
  newVerifiedCustomer,
  PASSWORD,
  signIn,
  signOutViaHeader,
  signUp,
  verifyEmail,
  waitForMail,
  watchConsole,
} from './support';

/**
 * Buying, inquiries and quotation requests need a signed-in customer with a confirmed email.
 * Visitors can browse freely; when they try a protected action they are offered Sign in and
 * Create account, and come back to the same action (with its product context) afterwards.
 */

async function fillSignIn(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function fillAddress(page: Page) {
  await page.getByLabel('Address line 1').fill('1 Orchard Lane');
  await page.getByLabel('City / village').fill('Nashik');
  await page.getByLabel('State').fill('Maharashtra');
  await page.getByLabel('PIN code').fill('422001');
}

test('visitors browse freely, but the quote form asks them to sign in or create an account', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/products/TOOL-100');
  await expect(page.getByRole('heading', { name: 'Drip Kit' })).toBeVisible();
  await page.getByRole('link', { name: 'Request a quote', exact: true }).click();
  await expect(page).toHaveURL('/contact?product=TOOL-100&type=quote');
  await expect(page.getByRole('heading', { name: 'Sign in to request a quotation' })).toBeVisible();
  await expect(page.getByLabel('Message')).toHaveCount(0);
  // Company contact details stay available to everyone.
  await expect(page.getByRole('main').getByRole('link', { name: /@/ })).toBeVisible();
  expect(problems).toEqual([]);
});

test('return to action: create account → confirm email in a new tab → sign in → same quote form', async ({ page, context }) => {
  const p = newPerson('return');
  await page.goto('/contact?product=TOOL-100&type=quote');
  await page.getByRole('main').getByRole('link', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/signup\?next=%2Fcontact%3Fproduct%3DTOOL-100%26type%3Dquote$/);
  await page.getByLabel('Full name').fill(p.name);
  await page.getByLabel('Email').fill(p.email);
  await page.getByLabel('Mobile number').fill(p.phone);
  await page.getByLabel('Password', { exact: true }).fill(p.password);
  await page.getByLabel('Confirm password', { exact: true }).fill(p.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  // The confirmation link usually opens in a new tab from the email client.
  const { path, token } = linkFrom(await waitForMail(p.email, /Confirm your Agrismart email/));
  const tab = await context.newPage();
  await tab.goto(`${path}#token=${token}`);
  await tab.getByRole('button', { name: 'Confirm email address' }).click();
  await expect(tab.getByText('Your email address is confirmed.')).toBeVisible();
  await tab.getByRole('link', { name: 'Sign in to continue' }).click();
  await fillSignIn(tab, p.email);
  await expect(tab).toHaveURL('/contact?product=TOOL-100&type=quote');
  await expect(tab.getByText('Quotation for product TOOL-100')).toBeVisible();
  await expect(tab.getByLabel('Full name')).toHaveValue(p.name);
});

test('the cart survives sign-in; checkout and the order need an account; a delivery address can be saved', async ({ page }) => {
  const p = await newVerifiedCustomer(page, 'cartkeep');
  await signOutViaHeader(page);

  await page.goto('/products/SEED-001');
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/cart');
  await expect(page.getByRole('link', { name: 'Proceed to checkout' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Sign in to check out' }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2Fcheckout$/);
  await expect(page.getByText('Sign in to continue. You will return to where you left off.')).toBeVisible();
  await fillSignIn(page, p.email);

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText('₹499.00').first()).toBeVisible(); // the visitor's cart, priced by the server
  await expect(page.getByRole('main').getByText(`Signed in as ${p.email}`)).toBeVisible();
  await fillAddress(page);
  await page.getByLabel('Save this address to my account').check();
  await page.getByLabel(/I understand this is an order request/).check();
  await page.getByRole('button', { name: 'Submit order request' }).click();
  await expect(page.getByText(/Your order request has been received/)).toBeVisible();

  await page.goto('/account/addresses');
  await expect(page.locator('address').filter({ hasText: '1 Orchard Lane' })).toBeVisible();
  // Next time, the saved address can be picked at checkout.
  await page.goto('/products/FERT-010');
  await page.getByRole('button', { name: 'Buy now' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole('radio', { name: /1 Orchard Lane/ }).check();
  await expect(page.getByLabel('City / village')).toHaveValue('Nashik');
});

test('"Buy now" as a visitor keeps the item and returns to checkout after sign-in', async ({ page }) => {
  const p = await newVerifiedCustomer(page, 'buynow');
  await signOutViaHeader(page);
  await page.goto('/products/FERT-010');
  await page.getByRole('button', { name: 'Buy now' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'Sign in to check out' })).toBeVisible();
  await expect(page.getByText('Organic Fertilizer 5kg × 1')).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await fillSignIn(page, p.email);
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel('Address line 1')).toBeVisible();
  await expect(page.getByText('Organic Fertilizer 5kg × 1')).toBeVisible();
});

test('an unconfirmed account must confirm its email before checkout; confirming elsewhere unlocks it', async ({ page, context }) => {
  const p = newPerson('unverified');
  await signUp(page, p);
  await signIn(page, p.email);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/products/FERT-010');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Confirm your email to check out' })).toBeVisible();
  await expect(page.getByLabel('Address line 1')).toHaveCount(0);
  // The API refuses too, whatever the browser shows.
  const session = await apiFromPage(page, '/api/customer/auth/session');
  const blocked = await apiFromPage(page, '/api/inquiries', {
    method: 'POST',
    body: { name: 'Kavya Rao', message: 'Trying without confirming my email.' },
    headers: { 'X-CSRF-Token': String(session.body.csrfToken) },
  });
  expect(blocked.status).toBe(403);
  expect(blocked.body.error?.code).toBe('email_unverified');

  const tab = await context.newPage();
  await verifyEmail(tab, p.email);
  await page.getByRole('button', { name: 'I’ve confirmed my email' }).click();
  await expect(page.getByLabel('Address line 1')).toBeVisible();
});

test('the API refuses visitors, and customers cannot reach each other’s inquiries or addresses', async ({ page, browser }) => {
  await page.goto('/');
  const order = {
    customer: { name: 'Kavya Rao', phone: '9876543210' },
    shippingAddress: { line1: '1 Orchard Lane', city: 'Nashik', state: 'Maharashtra', postalCode: '422001' },
    items: [{ itemCode: 'SEED-001', qty: 1 }],
    acceptTerms: true,
  };
  expect((await apiFromPage(page, '/api/orders', { method: 'POST', body: order })).status).toBe(401);
  expect((await apiFromPage(page, '/api/inquiries', { method: 'POST', body: { name: 'Kavya Rao', message: 'Anonymous inquiry text' } })).status).toBe(401);
  expect((await apiFromPage(page, '/api/customer/inquiries')).status).toBe(401);
  expect((await apiFromPage(page, '/api/customer/addresses')).status).toBe(401);

  await newVerifiedCustomer(page, 'owner');
  await page.goto('/contact');
  await page.getByLabel('Message').fill('Do you deliver to Satara district?');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  const ref = (await page.getByText(/^INQ-[A-Z0-9]{10}$/).textContent())!;
  await page.getByRole('link', { name: 'My inquiries & quotes' }).click();
  await expect(page.getByRole('heading', { name: `Inquiry ${ref}` })).toBeVisible();
  await page.goto('/account/addresses');
  await page.getByRole('button', { name: 'Add an address' }).click();
  await page.getByLabel('Label (optional, e.g. Farm or Home)').fill('Farm');
  await fillAddress(page);
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.getByText('The address was saved.')).toBeVisible();
  const addressId = ((await apiFromPage(page, '/api/customer/addresses')).body.items as { id: string }[])[0]!.id;

  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await newVerifiedCustomer(other, 'snoop');
  const csrf = String((await apiFromPage(other, '/api/customer/auth/session')).body.csrfToken);
  expect((await apiFromPage(other, `/api/customer/inquiries/${ref}`)).status).toBe(404);
  expect(JSON.stringify((await apiFromPage(other, '/api/customer/inquiries')).body)).not.toContain(ref);
  const edit = await apiFromPage(other, `/api/customer/addresses/${addressId}`, {
    method: 'PATCH',
    body: { line1: 'Stolen', city: 'X City', state: 'Y State', postalCode: '000000' },
    headers: { 'X-CSRF-Token': csrf },
  });
  expect(edit.status).toBe(404);
  expect((await apiFromPage(other, `/api/customer/addresses/${addressId}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrf } })).status).toBe(404);
  await otherCtx.close();
  await page.reload();
  await expect(page.getByText('1 Orchard Lane')).toBeVisible();
});

test('a session that expires while writing an inquiry keeps the text through sign-in', async ({ page }) => {
  const p = await newVerifiedCustomer(page, 'draft');
  await page.goto('/contact?product=SEED-001');
  await page.getByLabel('Message').fill('Do you have this in 5 kg bags for my nursery?');
  await control('expire-sessions');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2Fcontact%3Fproduct%3DSEED-001$/);
  await fillSignIn(page, p.email);
  await expect(page).toHaveURL('/contact?product=SEED-001');
  await expect(page.getByLabel('Message')).toHaveValue('Do you have this in 5 kg bags for my nursery?');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.getByRole('heading', { name: 'Inquiry received' })).toBeVisible();
});

test('the browser only ever talks to this site: ERPNext stays server-side', async ({ page, baseURL }) => {
  const origins = new Set<string>();
  page.on('request', (r) => {
    if (!r.url().startsWith('data:')) origins.add(new URL(r.url()).origin);
  });
  await newVerifiedCustomer(page, 'serveronly');
  await page.goto('/products?q=tomato');
  await page.goto('/products/SEED-001');
  await page.goto('/contact?product=SEED-001&type=quote');
  await page.getByLabel('Message').fill('Quote for 10 packets, please.');
  await page.getByRole('button', { name: 'Request quotation' }).click();
  await expect(page.getByRole('heading', { name: 'Quotation request received' })).toBeVisible();
  expect([...origins]).toEqual([new URL(baseURL!).origin]);

  // No ERPNext settings or credentials are compiled into the JavaScript.
  const scripts = await page.evaluate(() => Array.from(document.scripts, (s) => s.src).filter(Boolean));
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts) {
    const code = await (await page.request.get(src)).text();
    expect(code).not.toMatch(/ERPNEXT_|api_secret|apiSecret|testsecret|SMTP_PASS/i);
  }
});
