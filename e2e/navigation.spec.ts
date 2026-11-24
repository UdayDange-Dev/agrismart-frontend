import { expect, test, type Page } from '@playwright/test';
import { watchConsole } from './support';

/** Navbar routes, the ERPNext category menu, solution pages and history/refresh behaviour (desktop). */

interface Cat {
  name: string;
  label: string;
  count: number;
  children: { name: string; label: string; count: number }[];
}

const banner = (page: Page) => page.getByRole('banner');

/** Marks the document; the mark survives client-side navigation but not a full page load. */
const markDocument = (page: Page) => page.evaluate(() => ((window as unknown as { __spa: number }).__spa = 1));
const stillSameDocument = (page: Page) => page.evaluate(() => (window as unknown as { __spa?: number }).__spa === 1);

test('every navbar link goes to its route without a page reload and marks the current page', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/contact');
  await markDocument(page);

  await page.locator('.main-bar .brand').click();
  await expect(page).toHaveURL(/\/$/);

  const nav: [string, RegExp, string][] = [
    ['Products', /\/products$/, 'Products'],
    ['Solutions', /\/solutions$/, 'Solutions built around how you farm'],
    ['Contact', /\/contact$/, 'Contact our team'],
    ['Home', /\/$/, 'Smarter farm inputs for healthier harvests'],
  ];
  for (const [name, url, heading] of nav) {
    const link = banner(page).getByRole('link', { name, exact: true });
    await link.click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'page');
  }

  await banner(page).getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2F$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

  await banner(page).getByRole('link', { name: /^Cart, / }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(banner(page).getByRole('link', { name: /^Cart, / })).toHaveAttribute('aria-current', 'page');

  await banner(page).getByRole('link', { name: 'Request an inquiry' }).click();
  await expect(page).toHaveURL(/\/contact$/);

  // Products stays highlighted on product detail and filtered listings.
  await page.goto('/products/SEED-001');
  await expect(banner(page).getByRole('link', { name: 'Products', exact: true })).toHaveAttribute('aria-current', 'page');
  await markDocument(page);
  await banner(page).getByRole('link', { name: 'Solutions', exact: true }).click();
  await expect(page).toHaveURL(/\/solutions$/);
  expect(await stillSameDocument(page)).toBe(true); // React Router navigation, no full reload

  await expect(page.locator('header a[href="#"]')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('every category in the Products menu opens the matching ERPNext Item Group listing', async ({ page }) => {
  const categories = ((await (await page.request.get('/api/categories')).json()) as { items: Cat[] }).items;
  expect(categories.map((c) => c.label)).toEqual([
    'Crop Nutrition',
    'Crop Protection',
    'Electrical & Control',
    'Equipments',
    'Gardening & Landscaping',
    'Hardware',
    'Irrigation',
    'Planting Material',
    'Protected Agriculture',
    'Seeds',
    'Solar',
    'Water Pumps & Motors',
  ]);

  await page.goto('/');
  const toggle = banner(page).getByRole('button', { name: 'Products menu' });
  for (const c of categories) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.mega__list').getByRole('link', { name: new RegExp(`^${c.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d`) }).click();
    // The exact ERPNext name is in the URL, percent-encoded (spaces, "&").
    await expect(page).toHaveURL(`/products?category=${encodeURIComponent(c.name)}`);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false'); // menu closes after selection
    await expect(page.getByRole('heading', { level: 1, name: c.label })).toBeVisible();
    await expect(page.getByText(`${c.count} ${c.count === 1 ? 'product' : 'products'} in ${c.label}`)).toBeVisible();
    await expect(page.locator('.product-grid .product-card')).toHaveCount(c.count);
    await expect(page.getByLabel('Category', { exact: true })).toHaveValue(c.name);
    if (c.count === 0) await expect(page.getByText(`No products are listed in ${c.label} yet.`, { exact: false })).toBeVisible();
  }
});

test('sub-category chips narrow the filter; clearing the filter shows all products', async ({ page }) => {
  await page.goto('/products?category=SEEDS');
  await expect(page.getByRole('heading', { level: 1, name: 'Seeds' })).toBeVisible();
  const group = page.getByRole('group', { name: 'Category filter' });
  await expect(group.getByRole('button', { name: 'All Seeds' })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Vegetable Seeds 1', exact: true }).click();
  await expect(page).toHaveURL('/products?category=VEGETABLE+SEEDS');
  await expect(page.getByRole('heading', { level: 1, name: 'Vegetable Seeds' })).toBeVisible();
  await expect(group.getByRole('button', { name: 'Vegetable Seeds 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.product-grid .product-card')).toHaveCount(1);
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('SEEDS'); // its top-level group stays selected

  await group.getByRole('button', { name: 'Clear category filter Vegetable Seeds' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible();
  await expect(page.locator('.product-grid .product-card')).toHaveCount(4);

  // The select also changes the category.
  await page.getByLabel('Category', { exact: true }).selectOption('IRRIGATION');
  await expect(page).toHaveURL('/products?category=IRRIGATION');
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await page.getByRole('link', { name: 'View all products' }).first().click();
  await expect(page).toHaveURL(/\/products$/);
});

test('a readable category name in the URL selects the same ERPNext group', async ({ page }) => {
  await page.goto('/products?category=Irrigation');
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('IRRIGATION');
  await expect(page.getByRole('link', { name: 'Drip Kit', exact: true })).toBeVisible();
});

test('browser back/forward and refresh keep the route and the category filter', async ({ page }) => {
  await page.goto('/');
  await banner(page).getByRole('link', { name: 'Products', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByLabel('Category', { exact: true }).selectOption('IRRIGATION');
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await banner(page).getByRole('link', { name: 'Solutions', exact: true }).click();
  await page.getByRole('main').getByRole('link', { name: /Learn more about Seeds & planting material/ }).click();
  await expect(page).toHaveURL(/\/solutions\/seeds-nursery$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/solutions$/);
  await page.goBack();
  await expect(page).toHaveURL('/products?category=IRRIGATION');
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('IRRIGATION');
});

test('direct URL entry and refresh work on every main route', async ({ page }) => {
  const routes: [string, string][] = [
    ['/', 'Smarter farm inputs for healthier harvests'],
    ['/products', 'Products'],
    ['/products?category=WATER%20PUMPS%20%26%20MOTORS', 'Water Pumps & Motors'],
    ['/products?category=ELECTRICAL%20%26%20CONTROL', 'Electrical & Control'],
    ['/products/SEED-001', 'Hybrid Tomato Seeds (100g)'],
    ['/solutions', 'Solutions built around how you farm'],
    ['/solutions/irrigation', 'Irrigation & water management'],
    ['/solutions/agronomy-support', 'Agronomy support'],
    ['/contact', 'Contact our team'],
    ['/signin', 'Sign in'],
    ['/cart', 'Your cart is empty'],
    ['/solutions/does-not-exist', 'Page not found'],
  ];
  for (const [url, heading] of routes) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test.describe('small laptop screen', () => {
  test.use({ viewport: { width: 1024, height: 640 } });
  test('the mega menu stays inside the viewport and scrolls within itself', async ({ page }) => {
    await page.goto('/');
    await banner(page).getByRole('button', { name: 'Products menu' }).click();
    const panel = page.locator('.nav-dropdown--mega .nav-dropdown__panel');
    await expect(panel).toBeVisible();
    await page.waitForTimeout(400); // entrance transition
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1024);
    expect(box.y + box.height).toBeLessThanOrEqual(640);
    const last = page.locator('.mega__list').getByRole('link', { name: /^Water Pumps & Motors/ });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test('keyboard: the Products link opens its menu with ArrowDown; Escape closes and returns focus', async ({ page }) => {
  await page.goto('/');
  const link = banner(page).getByRole('link', { name: 'Products', exact: true });
  const toggle = banner(page).getByRole('button', { name: 'Products menu' });
  await link.focus();
  await page.keyboard.press('ArrowDown');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.mega__list a').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mega__list a').nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  // Enter on the toggle opens; Enter on a category navigates and closes the menu.
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mega__list a').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/products?category=CROP%20NUTRITION');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('mouse: a menu opened by hover stays open when its chevron is then clicked; a second click closes it', async ({ page }) => {
  await page.goto('/');
  const toggle = banner(page).getByRole('button', { name: 'Products menu' });
  await banner(page).getByRole('link', { name: 'Products', exact: true }).hover();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(300);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
