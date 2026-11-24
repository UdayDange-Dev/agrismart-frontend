import { expect, test, type Page } from '@playwright/test';
import { newVerifiedCustomer, watchConsole } from './support';

/** Optional screenshots for design review: UI_SHOTS=<dir> npx playwright test ui.spec */
async function shot(page: Page, name: string) {
  if (process.env.UI_SHOTS) await page.screenshot({ path: `${process.env.UI_SHOTS}/${name}.png` });
}

const transformOf = (page: Page, selector: string, pseudo?: string) =>
  page.locator(selector).first().evaluate((el, p) => getComputedStyle(el, p ?? null).transform, pseudo);

test.describe('header and navigation (desktop)', () => {
  test('sticky header gains its scrolled state and stays at the top', async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(900); // let the hero entrance finish
    await shot(page, 'home-desktop');
    await expect(page.locator('.site-header')).not.toHaveClass(/is-scrolled/);
    await page.mouse.wheel(0, 1600);
    await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
    const box = await page.locator('.main-bar').boundingBox();
    expect(Math.abs(box!.y)).toBeLessThan(2); // pinned to the top
    await page.waitForTimeout(800);
    await shot(page, 'home-scrolled');
    expect(problems).toEqual([]);
  });

  test('Products mega menu opens on hover and closes when the pointer leaves', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('banner').getByRole('button', { name: 'Products menu' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('banner').getByRole('link', { name: 'Products', exact: true }).hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('.nav-dropdown--mega .nav-dropdown__panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: /Seeds/ })).toBeVisible(); // live ERPNext categories
    await page.waitForTimeout(400);
    await shot(page, 'mega-menu');
    await page.mouse.move(10, 700);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toBeHidden();
  });

  test('dropdowns work by click and keyboard, not only hover', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('banner').getByRole('button', { name: 'Solutions menu' });
    // Click
    await trigger.dispatchEvent('click');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await trigger.dispatchEvent('click');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Keyboard
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Irrigation & water management' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Soil health & crop nutrition' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    // Enter opens, Tab past the last item closes it
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    for (let i = 0; i < 9; i++) await page.keyboard.press('Tab'); // 7 solutions + "All solutions", then out
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('visible focus ring on keyboard focus', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).toBe('solid');
  });

  test('nav link underline animates in on hover', async ({ page }) => {
    await page.goto('/products');
    const link = page.getByRole('banner').getByRole('link', { name: 'Contact', exact: true });
    const before = await link.locator('span').evaluate((el) => getComputedStyle(el, '::after').transform);
    await link.hover();
    await page.waitForTimeout(400);
    const after = await link.locator('span').evaluate((el) => getComputedStyle(el, '::after').transform);
    expect(before).toBe('matrix(0, 0, 0, 1, 0, 0)');
    expect(after).toBe('matrix(1, 0, 0, 1, 0, 0)');
  });

  test('solutions menu opens real solution pages and closes after selection', async ({ page }) => {
    await page.goto('/products');
    const toggle = page.getByRole('banner').getByRole('button', { name: 'Solutions menu' });
    await toggle.click();
    await page.getByRole('banner').getByRole('link', { name: 'Soil health & crop nutrition' }).click();
    await expect(page).toHaveURL(/\/solutions\/crop-nutrition$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Soil health & crop nutrition' })).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Related products link to the live ERPNext category.
    await page.getByRole('main').getByRole('link', { name: /Crop Nutrition/ }).click();
    await expect(page).toHaveURL(/\/products\?category=CROP%20NUTRITION$/);
    await expect(page.getByRole('link', { name: 'Organic Fertilizer 5kg', exact: true })).toBeVisible();
  });

  test('hero CTAs and header CTA link to the catalogue and inquiry form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Explore products' }).click();
    await expect(page).toHaveURL(/\/products$/);
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Request an inquiry' }).first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.getByRole('banner').getByRole('link', { name: 'Request an inquiry' }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('header auth links reflect the session (sign in only, then account menu)', async ({ page }) => {
    await page.goto('/products?q=seed');
    const signIn = page.getByRole('banner').getByRole('link', { name: 'Sign in' });
    await expect(signIn).toHaveAttribute('href', '/signin?next=%2Fproducts%3Fq%3Dseed');
    await expect(page.getByRole('banner').getByText('Sign up')).toHaveCount(0);
    await newVerifiedCustomer(page, 'header');
    const account = page.getByRole('banner').getByRole('button', { name: 'Account' });
    await account.click();
    await expect(page.getByRole('banner').getByRole('link', { name: 'My orders' })).toBeVisible();
    await page.getByRole('banner').getByRole('link', { name: 'My orders' }).click();
    await expect(page).toHaveURL(/\/account\/orders$/);
  });
});

test.describe('homepage sections and cards', () => {
  test('sections reveal on scroll; live categories and products render; card hover effects', async ({ page }) => {
    await page.goto('/');
    const featured = page.getByRole('heading', { name: 'Featured products' });
    await featured.scrollIntoViewIfNeeded();
    await expect(page.locator('.section-heading').nth(1)).toHaveClass(/is-visible/);
    const card = page.locator('.product-card').first();
    await expect(card).toBeVisible();
    await card.hover();
    await page.waitForTimeout(700);
    expect(await card.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none'); // lifted
    await shot(page, 'product-card-hover');
    const categories = page.locator('.category-card');
    await expect(categories.first()).toBeVisible();
    expect(await categories.count()).toBeGreaterThan(0);
    // Hero statistics come from the live catalogue (no invented numbers).
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByText('Products in our live catalogue')).toBeAttached();
    await page.locator('#solutions').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await shot(page, 'solutions');
    await page.locator('.cta-band').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await shot(page, 'cta-footer');
  });

  test('catalogue shows skeletons while loading, then cards', async ({ page }) => {
    await page.route('**/api/products?**', async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    await page.goto('/products');
    await expect(page.locator('.skeleton-card').first()).toBeVisible();
    await shot(page, 'catalogue-loading');
    await expect(page.locator('.product-card:not(.skeleton-card)').first()).toBeVisible();
    await expect(page.locator('.skeleton-card')).toHaveCount(0);
    await page.waitForTimeout(500);
    await shot(page, 'catalogue');
  });

  test('add to cart gives feedback and updates the header badge', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add Hybrid Tomato Seeds (100g) to cart' }).click();
    await expect(page.getByRole('button', { name: 'Add Hybrid Tomato Seeds (100g) to cart' })).toContainText('Added');
    await expect(page.getByRole('banner').getByRole('link', { name: /Cart, 1 item/ })).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('content is shown immediately with no entrance or parallax movement', async ({ page }) => {
    await page.goto('/');
    const title = page.getByRole('heading', { level: 1 });
    expect(await title.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    expect(await transformOf(page, '.hero__media')).toBe('none');
    expect(await page.locator('.reveal').first().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});

test.describe('tablet layout', () => {
  test.use({ viewport: { width: 820, height: 1180 } });
  test('tablet uses the drawer and has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.waitForTimeout(900);
    await shot(page, 'home-tablet');
  });
});
