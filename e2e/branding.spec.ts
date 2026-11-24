import { expect, test, type Page } from '@playwright/test';

const ALT = 'AGRI SMART — a smart way of farming';

async function shot(page: Page, name: string) {
  if (process.env.UI_SHOTS) await page.screenshot({ path: `${process.env.UI_SHOTS}/${name}.png` });
}

/** Loaded, square (aspect ratio preserved) and rendered at the expected size. */
async function expectLogo(page: Page, scope: 'banner' | 'contentinfo' | 'main', size: number, attrSize = size) {
  const img = page.getByRole(scope).getByRole('img', { name: ALT });
  await expect(img).toBeVisible();
  const info: { complete: boolean; natural: number[]; box: number[]; attrs: (string | null)[]; src: string } = await img.evaluate((el: HTMLImageElement) => ({
    complete: el.complete,
    natural: [el.naturalWidth, el.naturalHeight],
    box: [el.getBoundingClientRect().width, el.getBoundingClientRect().height],
    attrs: [el.getAttribute('width'), el.getAttribute('height')],
    src: el.currentSrc,
  }));
  expect(info.complete).toBe(true);
  const [nw = 0, nh = 0] = info.natural;
  const [bw = 0, bh = 0] = info.box;
  expect(nw).toBeGreaterThan(0);
  expect(nw).toBe(nh); // original 1:1 artwork
  expect(Math.round(bw)).toBe(Math.round(bh)); // not stretched
  expect(Math.round(bw)).toBe(size);
  // width/height attributes reserve a 1:1 box before load (CSS may scale it, e.g. on phones)
  expect(info.attrs).toEqual([String(attrSize), String(attrSize)]);
  expect(info.src).toMatch(/\/images\/agrismart-logo(-\d+\.webp|\.png)$/);
}

test('official logo in the header and footer; legal name in company information', async ({ page }) => {
  await page.goto('/');
  await expectLogo(page, 'banner', 72);
  await expect(page.getByRole('banner').getByRole('link', { name: `${ALT} Home` })).toHaveAttribute('href', '/');
  await page.waitForTimeout(900);
  await shot(page, 'brand-header');

  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
  await expectLogo(page, 'contentinfo', 120);
  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText('AGRI SMART is a brand of AGRI SMART FARM SOLUTIONS LLP.');
  await expect(footer).toContainText(`© ${new Date().getFullYear()} AGRI SMART FARM SOLUTIONS LLP. All rights reserved.`);
  await page.waitForTimeout(700);
  await shot(page, 'brand-footer');
  await expect(page).toHaveTitle('AGRI SMART — a smart way of farming');
});

test('header logo shrinks smoothly on scroll without reflowing the page', async ({ page }) => {
  await page.goto('/products');
  const img = page.getByRole('banner').getByRole('img', { name: ALT });
  await page.mouse.wheel(0, 900);
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
  await page.waitForTimeout(400);
  const t = await img.evaluate((el) => getComputedStyle(el).transform);
  expect(t).toMatch(/^matrix\(0\.78/); // transform-only shrink
  expect(await img.getAttribute('width')).toBe('72'); // layout size unchanged
  await shot(page, 'brand-header-scrolled');
});

test('logo does not cause layout shift while loading (cold cache)', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Slow the logo down to make any missing size reservation visible as a shift.
  await page.route('**/images/agrismart-logo*', async (route) => {
    await new Promise((r) => setTimeout(r, 700));
    await route.continue();
  });
  await page.goto(`${baseURL}/signin`);
  await page.waitForTimeout(1500);
  const shifts = await page.evaluate(
    () =>
      new Promise<{ value: number; sources: string[] }[]>((resolve) => {
        const out: { value: number; sources: string[] }[] = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean; sources?: { node?: Node }[] }[]) {
            if (!e.hadRecentInput) out.push({ value: e.value, sources: (e.sources ?? []).map((s) => { const n = s.node as Element | undefined; return n ? `${n.nodeName}.${typeof n.className === 'string' ? n.className : ''} ${n.getAttribute?.('src') ?? ''}` : ''; }) });
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(out), 300);
      }),
  );
  const logoShifts = shifts.filter((s) => s.sources.some((src) => src.includes('agrismart-logo') || /(^|[ .])logo( |$)/.test(src)));
  expect(logoShifts).toEqual([]);
  const cls = shifts.reduce((n, s) => n + s.value, 0);
  expect(cls, JSON.stringify(shifts)).toBeLessThan(0.05);
  await expectLogo(page, 'main', 96); // sign-in card logo
  await shot(page, 'brand-signin');
  await context.close();
});

test('favicons and the original logo file are served', async ({ request }) => {
  for (const [path, type] of [
    ['/favicon-32.png', 'image/png'],
    ['/favicon-48.png', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
    ['/icon-192.png', 'image/png'],
    ['/images/agrismart-logo.png', 'image/png'],
    ['/images/agrismart-logo-128.webp', 'image/webp'],
  ] as const) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toContain(type);
  }
  expect((await (await request.get('/images/agrismart-logo.png')).body()).length).toBe(656385); // unmodified original
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('logo is responsive in the header and drawer', async ({ page }) => {
    await page.goto('/');
    await expectLogo(page, 'banner', 58, 72);
    await page.waitForTimeout(800);
    await shot(page, 'brand-mobile');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const drawerLogo = page.getByRole('dialog').getByRole('img', { name: ALT });
    await expect(drawerLogo).toBeVisible();
    await page.waitForTimeout(700);
    await shot(page, 'brand-mobile-drawer');
  });
});
