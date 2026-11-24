import { expect, test } from '@playwright/test';
import { newPerson, signUp, verifyEmail } from './support';

/** Runs in the mobile-chromium project (Pixel 7 viewport, touch). */
const pages = [
  '/',
  '/products',
  '/products?category=IRRIGATION',
  '/products/SEED-001',
  '/solutions',
  '/solutions/irrigation',
  '/cart',
  '/signup',
  '/signin',
  '/forgot-password',
  '/contact',
];

for (const path of pages) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('navigation collapses into a menu; it has Sign in but no Sign up', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('link', { name: 'Sign up' })).toHaveCount(0);
  await dialog.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/signin(\?|$)/);
  await expect(dialog).toBeHidden();
  // Registration itself is still available from the sign-in page.
  await expect(page.getByRole('main').getByRole('link', { name: 'Create an account' })).toBeVisible();
});

test('mobile menu navigates to a category, a solution and the products page, closing each time', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  const dialog = page.getByRole('dialog');
  await menu.click();
  await dialog.getByRole('button', { name: 'Product categories' }).click();
  await dialog.getByRole('link', { name: 'Water Pumps & Motors' }).click();
  await expect(page).toHaveURL(/\/products\?category=WATER%20PUMPS%20%26%20MOTORS$/);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'Water Pumps & Motors' })).toBeVisible();
  await expect(page.getByText('No products are listed in Water Pumps & Motors yet.', { exact: false })).toBeVisible();

  await menu.click();
  await dialog.getByRole('button', { name: 'Solution pages' }).click();
  await dialog.getByRole('link', { name: 'Seeds & planting material' }).click();
  await expect(page).toHaveURL(/\/solutions\/seeds-nursery$/);
  await expect(dialog).toBeHidden();

  await menu.click();
  await dialog.getByRole('link', { name: 'Products', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible();
});

test('sign up, verify and sign in on a phone; form controls are touch-sized', async ({ page }) => {
  const p = newPerson('mobile');
  await signUp(page, p);
  await verifyEmail(page, p.email);
  await page.goto('/signin');
  const button = page.getByRole('button', { name: 'Sign in', exact: true });
  const box = (await button.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.getByLabel('Email').fill(p.email);
  await page.getByLabel('Password', { exact: true }).fill(p.password);
  await button.click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('mobile drawer: focus moves inside, Tab is trapped, Escape closes and restores focus, page scroll is locked', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 40; i++) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await dialog.getByRole('button', { name: 'Product categories' }).click();
  await expect(dialog.getByRole('link', { name: 'All products' })).toBeVisible();
  await page.waitForTimeout(700);
  if (process.env.UI_SHOTS) await page.screenshot({ path: `${process.env.UI_SHOTS}/mobile-drawer.png` });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('mobile homepage renders the hero and CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main').getByRole('link', { name: 'Explore products' })).toBeVisible();
  await page.waitForTimeout(900);
  if (process.env.UI_SHOTS) await page.screenshot({ path: `${process.env.UI_SHOTS}/mobile-home.png` });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Contact' }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('dialog')).toBeHidden();
});
