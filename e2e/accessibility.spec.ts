import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { newVerifiedCustomer, signOutViaHeader } from './support';

/** Automated WCAG 2.1 A/AA checks (axe-core) on desktop and mobile; serious/critical must be zero. */
async function audit(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

for (const path of ['/', '/products', '/products?category=SEEDS', '/solutions', '/solutions/irrigation', '/signup', '/signin', '/forgot-password', '/reset-password', '/verify-email', '/contact', '/admin']) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await audit(page)).toEqual([]);
  });
}

test('no serious accessibility violations on account pages and in form error states', async ({ page }) => {
  await newVerifiedCustomer(page, 'a11y');
  expect(await audit(page)).toEqual([]);
  for (const path of ['/account/orders', '/account/inquiries', '/account/addresses', '/contact?type=quote']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await audit(page)).toEqual([]);
  }
  await page.goto('/account/addresses');
  await page.getByRole('button', { name: 'Add an address' }).click();
  await page.getByRole('button', { name: 'Save address' }).click();
  expect(await audit(page)).toEqual([]);
  await signOutViaHeader(page);
  // The sign-in prompt that replaces protected forms for visitors.
  await page.goto('/contact?product=SEED-001&type=quote');
  await page.waitForLoadState('networkidle');
  expect(await audit(page)).toEqual([]);
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();
  expect(await audit(page)).toEqual([]);
});
