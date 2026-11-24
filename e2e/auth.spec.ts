import { expect, test } from '@playwright/test';
import {
  apiFromPage,
  control,
  linkFrom,
  newPerson,
  newVerifiedCustomer,
  PASSWORD,
  signIn,
  signUp,
  verifyEmail,
  waitForMail,
  signOutViaHeader,
  watchConsole,
} from './support';

test.describe('sign up', () => {
  test('validates fields in the browser before submitting', async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Please enter your name.')).toBeVisible();
    await expect(page.getByText('Please enter your email.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');

    await page.getByLabel('Full name').fill('Kavya Rao');
    await page.getByLabel('Email').fill('kavya@example.test');
    await page.getByLabel('Mobile number').fill('12');
    await page.getByLabel('Password', { exact: true }).fill('password1234');
    await page.getByLabel('Confirm password', { exact: true }).fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter a valid phone number.')).toBeVisible();
    await expect(page.getByText('Include upper and lower case letters and a number.')).toBeVisible();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('password visibility toggle', async ({ page }) => {
    await page.goto('/signup');
    const pw = page.getByLabel('Password', { exact: true });
    await pw.fill('Secret-Value-123');
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(pw).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(pw).toHaveAttribute('type', 'password');
  });

  test('duplicate registration shows the same neutral message and emails the owner', async ({ page }) => {
    const p = newPerson('dup');
    await signUp(page, p);
    const first = await page.getByRole('status').textContent();
    await signUp(page, { ...p, name: 'Someone Else' });
    expect(await page.getByRole('status').textContent()).toBe(first);
    await waitForMail(p.email, /Your Agrismart account/); // owner notified, nothing created
  });
});

test.describe('verification, sign in and sign out', () => {
  test('full journey: sign up, verify, sign in, sign out', async ({ page, context }) => {
    const problems = watchConsole(page);
    const p = newPerson('journey');
    await signUp(page, p);
    await verifyEmail(page, p.email);

    // The token is removed from the address bar after reading it.
    expect(page.url()).not.toContain('token=');

    await signIn(page, p.email, 'Wrong-Password-99');
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');

    await signIn(page, p.email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('button', { name: 'Account' })).toBeVisible();

    // Session cookie is HttpOnly (invisible to JS) and nothing auth-related is in web storage.
    expect(await page.evaluate(() => document.cookie)).not.toContain('agrismart_customer');
    const cookie = (await context.cookies()).find((c) => c.name === 'agrismart_customer')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Strict');
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(storage).not.toMatch(/csrf|session|password|token/i);

    await signOutViaHeader(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
    await page.goto('/account');
    await expect(page).toHaveURL(/\/signin\?next=%2Faccount$/);
    expect(problems).toEqual([]);
  });

  test('verification links are single-use; resent link supersedes the old one', async ({ page }) => {
    const p = newPerson('verify');
    await signUp(page, p);
    const first = linkFrom(await waitForMail(p.email, /Confirm your Agrismart email/));
    await signIn(page, p.email);
    await expect(page.getByText('Please confirm your email address.')).toBeVisible();
    const before = Date.now();
    await page.getByRole('button', { name: 'Resend confirmation email' }).click();
    await expect(page.getByText(/a new link is on its way/)).toBeVisible();
    const second = linkFrom(await waitForMail(p.email, /Confirm your Agrismart email/, before));
    expect(second.token).not.toBe(first.token);

    await page.goto(`/verify-email#token=${first.token}`);
    await page.getByRole('button', { name: 'Confirm email address' }).click();
    await expect(page.getByText('This link is invalid or has expired. Please request a new one.')).toBeVisible();

    await page.goto(`/verify-email#token=${second.token}`);
    await page.getByRole('button', { name: 'Confirm email address' }).click();
    await expect(page.getByText('Your email address is confirmed.')).toBeVisible();

    await page.goto(`/verify-email#token=${second.token}`);
    await page.getByRole('button', { name: 'Confirm email address' }).click();
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
  });

  test('expired verification link is rejected', async ({ page }) => {
    const p = newPerson('expired');
    await signUp(page, p);
    const { token } = linkFrom(await waitForMail(p.email, /Confirm your Agrismart email/));
    await control('expire-tokens');
    await page.goto(`/verify-email#token=${token}`);
    await page.getByRole('button', { name: 'Confirm email address' }).click();
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
  });

  test('returns to the intended page after sign-in, but never to an external site', async ({ page, baseURL }) => {
    // Same-origin check that works with any configured test port.
    const onSite = (path: string) => (url: URL) => url.origin === new URL(baseURL!).origin && url.pathname === path;
    const p = await newVerifiedCustomer(page, 'next');
    await signOutViaHeader(page);

    await page.goto('/account/orders');
    await expect(page).toHaveURL(/\/signin\?next=%2Faccount%2Forders$/);
    await page.getByLabel('Email').fill(p.email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/account\/orders$/);

    await signOutViaHeader(page);
    await signIn(page, p.email, PASSWORD, '/signin?next=https%3A%2F%2Fevil.example%2Fphish');
    await expect(page).toHaveURL(onSite('/account'));
    await signOutViaHeader(page);
    await signIn(page, p.email, PASSWORD, '/signin?next=%2F%2Fevil.example');
    await expect(page).toHaveURL(onSite('/account'));
  });

  test('shows a loading state while signing in', async ({ page }) => {
    await page.route('**/api/customer/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto('/signin');
    await page.getByLabel('Email').fill('nobody@example.test');
    await page.getByLabel('Password', { exact: true }).fill('Whatever-Pass-1');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('shows a friendly message when rate limited', async ({ page }) => {
    await page.route('**/api/customer/auth/login', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { code: 'rate_limited', message: 'x' } }) }),
    );
    await signIn(page, 'someone@example.test', 'Whatever-Pass-1');
    await expect(page.getByText('Too many requests. Please wait a moment and try again.')).toBeVisible();
  });
});

test.describe('password recovery', () => {
  test('forgot → reset → sign in with the new password; old password and reused link fail', async ({ page, browser }) => {
    const p = await newVerifiedCustomer(page, 'reset');
    // A second device that is signed in must be signed out by the reset.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, p.email);
    await expect(otherPage).toHaveURL(/\/account$/);

    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(p.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/If an account exists for that email/)).toBeVisible();
    const { path, token } = linkFrom(await waitForMail(p.email, /Reset your Agrismart password/));
    expect(path).toBe('/reset-password');

    await page.goto(`${path}#token=${token}`);
    await expect(page).toHaveURL(/\/reset-password$/); // token stripped from the URL
    await page.getByLabel('New password', { exact: true }).fill('Harvest-Moon-77');
    await page.getByLabel('Confirm new password', { exact: true }).fill('Harvest-Moon-77');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText(/Your password has been changed/)).toBeVisible();

    await otherPage.goto('/account');
    await expect(otherPage).toHaveURL(/\/signin/);
    await other.close();

    await signIn(page, p.email, PASSWORD);
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await signIn(page, p.email, 'Harvest-Moon-77');
    await expect(page).toHaveURL(/\/account$/);

    await page.goto(`${path}#token=${token}`);
    await page.getByLabel('New password', { exact: true }).fill('Another-Pass-88');
    await page.getByLabel('Confirm new password', { exact: true }).fill('Another-Pass-88');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
  });

  test('unknown email gets the same response; superseded and expired links are rejected', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('nobody-here@example.test');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const unknownMsg = await page.getByRole('status').textContent();

    const p = newPerson('supersede');
    await signUp(page, p);
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(p.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    expect(await page.getByRole('status').textContent()).toBe(unknownMsg);
    const first = linkFrom(await waitForMail(p.email, /Reset your/));

    const before = Date.now();
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(p.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const second = linkFrom(await waitForMail(p.email, /Reset your/, before));

    const tryReset = async (token: string) => {
      await page.goto(`/reset-password#token=${token}`);
      await page.getByLabel('New password', { exact: true }).fill('Harvest-Moon-77');
      await page.getByLabel('Confirm new password', { exact: true }).fill('Harvest-Moon-77');
      await page.getByRole('button', { name: 'Set new password' }).click();
    };
    await tryReset(first.token);
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();

    await control('expire-tokens');
    await tryReset(second.token);
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
  });

  test('malformed reset link shows guidance', async ({ page }) => {
    await page.goto('/reset-password#token=%3Cscript%3E');
    await expect(page.getByRole('heading', { name: 'Reset link not valid' })).toBeVisible();
  });
});

test.describe('sessions and CSRF', () => {
  test('expired session sends the customer back to sign in', async ({ page }) => {
    await newVerifiedCustomer(page, 'session');
    await control('expire-sessions');
    await page.goto('/account');
    await expect(page).toHaveURL(/\/signin\?next=%2Faccount$/);
  });

  test('state-changing requests without the CSRF token are rejected', async ({ page }) => {
    await newVerifiedCustomer(page, 'csrf');
    const noToken = await apiFromPage(page, '/api/customer/account', { method: 'PATCH', body: { name: 'Mallory X' } });
    expect(noToken.status).toBe(403);
    expect(noToken.body.error?.code).toBe('csrf_failed');
    const badToken = await apiFromPage(page, '/api/customer/account', { method: 'PATCH', body: { name: 'Mallory X' }, headers: { 'X-CSRF-Token': 'x'.repeat(43) } });
    expect(badToken.status).toBe(403);
    const logout = await apiFromPage(page, '/api/customer/auth/logout', { method: 'POST' });
    expect(logout.status).toBe(403);
    // The UI itself works because it sends the in-memory token.
    await page.goto('/account');
    await page.getByLabel('Full name').fill('Kavya S Rao');
    await page.getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByText('Your details were saved.')).toBeVisible();
  });

  test('a cross-site page cannot make authenticated changes', async ({ page, context, baseURL }) => {
    await newVerifiedCustomer(page, 'xsite');
    // Simulate an attacker page on another origin submitting a form to our API.
    const attacker = await context.newPage();
    await attacker.route('http://attacker.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<form id=f method=POST action="${baseURL}/api/customer/auth/logout"></form><script>f.submit()</script>`,
      }),
    );
    const response = attacker.waitForResponse('**/api/customer/auth/logout');
    await attacker.goto('http://attacker.test/');
    expect((await response).status()).toBe(403);
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible(); // still signed in
  });
});
