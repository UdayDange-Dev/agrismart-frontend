import { expect, test, type Page } from '@playwright/test';
import { newVerifiedCustomer, watchConsole } from './support';

/** Redesign: homepage journey, photography, category tiles, solution pages and footer (desktop). */

/** Scrolls through the page so lazy images and scroll reveals load, then lists broken images. */
async function brokenImages(page: Page): Promise<string[]> {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(60);
  }
  await page.waitForLoadState('networkidle');
  return page.evaluate(() =>
    Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
  );
}

test('homepage tells the story from hero to footer, with working CTAs and contact links', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/');
  const main = page.getByRole('main');
  await expect(page.getByRole('heading', { level: 1, name: 'Smarter farm inputs for healthier harvests' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Explore products' })).toHaveAttribute('href', '/products');
  await expect(main.getByRole('link', { name: 'Request an inquiry' }).first()).toHaveAttribute('href', '/contact');

  const headings = await main.getByRole('heading', { level: 2 }).allTextContents();
  expect(headings).toEqual([
    'Shop by category',
    'Featured products',
    'Built around how you farm',
    'Put water where the roots are',
    'Feed the soil, protect the crop',
    'A strong start for every crop',
    'Everything else the farm needs',
    'Genuine farm inputs at MRP, with expert support',
    'A supplier you can plan a season around',
    'Planning a bulk order or a new installation?',
  ]);

  // Company contact details are real, working links.
  const band = page.locator('.cta-band');
  await expect(band.getByRole('link', { name: '+91 93739 47000' })).toHaveAttribute('href', 'tel:+919373947000');
  await expect(band.getByRole('link', { name: 'agrismartfarmsolutionsllp@gmail.com' })).toHaveAttribute(
    'href',
    'mailto:agrismartfarmsolutionsllp@gmail.com',
  );
  expect(await brokenImages(page)).toEqual([]);
  expect(problems).toEqual([]);
});

test('category photo tiles open the filtered ERPNext listing', async ({ page }) => {
  await page.goto('/');
  const tiles = page.locator('.category-grid .category-card');
  await expect(tiles.first()).toBeVisible();
  // Only groups with products are featured, each with its live count.
  for (const text of await tiles.allTextContents()) expect(text).toMatch(/\d+ products?/);
  await tiles.filter({ hasText: 'Irrigation' }).click();
  await expect(page).toHaveURL('/products?category=IRRIGATION');
  await expect(page.getByRole('heading', { level: 1, name: 'Irrigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Drip Kit', exact: true })).toBeVisible();
});

test('range sections link to their solution page and live category', async ({ page }) => {
  await page.goto('/');
  const water = page.locator('section', { has: page.getByRole('heading', { name: 'Put water where the roots are' }) });
  await expect(water.getByRole('link', { name: 'Water Pumps & Motors' })).toHaveAttribute('href', '/products?category=WATER%20PUMPS%20%26%20MOTORS');
  await water.getByRole('link', { name: 'Explore the solution' }).click();
  await expect(page).toHaveURL(/\/solutions\/irrigation$/);
});

test('every solution page renders its range, related categories and contact details', async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto('/solutions');
  const links = page.getByRole('main').locator('.solution-card__link');
  await expect(links).toHaveCount(7);
  const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
  for (const href of hrefs) {
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The range' })).toBeVisible();
    await expect(page.getByRole('complementary').getByRole('link', { name: '+91 93739 47000' })).toHaveAttribute('href', 'tel:+919373947000');
    expect(await brokenImages(page), href).toEqual([]);
  }
  // A solution with live products shows them, two per row in the content column.
  await page.goto('/solutions/irrigation');
  await expect(page.getByRole('heading', { name: 'Products in Irrigation' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /^Irrigation\s*Drip and sprinkler/ })).toHaveAttribute('href', '/products?category=IRRIGATION');
  expect(problems).toEqual([]);
});

test('catalogue header and tiles: whole catalogue, then a category with its own photo and breadcrumb', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Browse by category' })).toBeVisible();
  expect(await brokenImages(page)).toEqual([]);
  await page.goto('/products?category=VEGETABLE%20SEEDS');
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs).toHaveText('Products / Seeds / Vegetable Seeds');
  await crumbs.getByRole('link', { name: 'Seeds' }).click();
  await expect(page).toHaveURL('/products?category=SEEDS');
  await expect(page.locator('.page-hero__bg')).toHaveAttribute('src', /cat-seeds-1600\.webp$/);
});

test('footer links reach real pages and contact details work', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'agrismartfarmsolutionsllp@gmail.com' })).toHaveAttribute('href', 'mailto:agrismartfarmsolutionsllp@gmail.com');
  await expect(footer.getByRole('link', { name: '+91 93739 47000' })).toHaveAttribute('href', 'tel:+919373947000');
  await footer.getByRole('link', { name: 'Crop protection' }).click();
  await expect(page).toHaveURL(/\/solutions\/crop-protection$/);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Seeds', exact: true }).click();
  await expect(page).toHaveURL('/products?category=SEEDS');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('photo zoom and page-header entrance are switched off', async ({ page }) => {
    await page.goto('/solutions/irrigation');
    expect(await page.locator('.page-hero__bg').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    expect(await page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});

test('quote form: validation, then a quotation request from a product card gets a reference', async ({ page }) => {
  const problems = watchConsole(page);
  await newVerifiedCustomer(page, 'quote');
  await page.goto('/products?category=IRRIGATION');
  await page.getByRole('link', { name: 'Request a quote for Drip Kit' }).click();
  await expect(page).toHaveURL('/contact?product=TOOL-100&type=quote');
  await expect(page.getByRole('heading', { level: 1, name: 'Request a quotation' })).toBeVisible();
  await expect(page.getByText('Quotation for product TOOL-100')).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveValue('Kavya Rao'); // from the account
  await page.getByRole('button', { name: 'Request quotation' }).click();
  await expect(page.getByLabel('Message')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Quantity (optional)').fill('4');
  await page.getByLabel('Message').fill('Please quote drip kits for two acres of pomegranate.');
  await page.getByRole('button', { name: 'Request quotation' }).click();
  await expect(page.getByRole('heading', { name: 'Quotation request received' })).toBeVisible();
  await expect(page.getByText(/^INQ-[A-Z0-9]{10}$/)).toBeVisible();
  expect(problems).toEqual([]);
});
