import { existsSync, readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Green-Fields-2026';

let counter = 0;
/** Unique, obviously fake test identities (never real mailboxes). */
export function newPerson(label = 'buyer') {
  counter += 1;
  const id = `${Date.now().toString(36)}${counter}`;
  return {
    name: 'Kavya Rao',
    email: `e2e-${label}-${id}@example.test`,
    phone: '+91 98765 43210',
    password: PASSWORD,
  };
}
export type Person = ReturnType<typeof newPerson>;

interface Mail {
  to: string;
  subject: string;
  text: string;
  at: number;
}

function readOutbox(): Mail[] {
  const file = process.env.E2E_OUTBOX!;
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Mail);
}

/** Waits for the newest email to `to` matching `subject` and returns it. */
export async function waitForMail(to: string, subject: RegExp, after = 0): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(() => {
      found = readOutbox()
        .filter((m) => m.to === to && subject.test(m.subject) && m.at >= after)
        .at(-1);
      return Boolean(found);
    }, { timeout: 10_000 })
    .toBe(true);
  return found!;
}

export function linkFrom(mail: Mail): { path: string; token: string } {
  const m = mail.text.match(/https?:\/\/[^/\s]+(\/[a-z-]+)#token=([A-Za-z0-9_-]{43})/);
  if (!m) throw new Error(`no token link in "${mail.subject}"`);
  return { path: m[1]!, token: m[2]! };
}

/** Test-only time travel on the dev stack (localhost control endpoint). */
export async function control(action: 'expire-tokens' | 'expire-sessions'): Promise<void> {
  const res = await fetch(`${process.env.E2E_CONTROL_URL}/${action}`, {
    method: 'POST',
    headers: { 'x-dev-control': process.env.E2E_CONTROL_SECRET! },
  });
  if (res.status !== 204) throw new Error(`control ${action} failed: ${res.status}`);
}

export async function signUp(page: Page, p: Person): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill(p.name);
  await page.getByLabel('Email').fill(p.email);
  await page.getByLabel('Mobile number').fill(p.phone);
  await page.getByLabel('Password', { exact: true }).fill(p.password);
  await page.getByLabel('Confirm password', { exact: true }).fill(p.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
}

export async function verifyEmail(page: Page, email: string): Promise<void> {
  const { path, token } = linkFrom(await waitForMail(email, /Confirm your Agrismart email/));
  await page.goto(`${path}#token=${token}`);
  await page.getByRole('button', { name: 'Confirm email address' }).click();
  await expect(page.getByText('Your email address is confirmed.')).toBeVisible();
}

export async function signIn(page: Page, email: string, password = PASSWORD, path = '/signin'): Promise<void> {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Registers, verifies and signs in a fresh customer. */
export async function newVerifiedCustomer(page: Page, label = 'buyer'): Promise<Person> {
  const p = newPerson(label);
  await signUp(page, p);
  await verifyEmail(page, p.email);
  await signIn(page, p.email);
  await expect(page).toHaveURL(/\/account$/);
  return p;
}

/** Calls the API from inside the page (same origin, with the browser's cookies). */
export function apiFromPage(page: Page, path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, {
        method: init.method ?? 'GET',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // empty body
      }
      return { status: res.status, body: body as { error?: { code?: string } } & Record<string, unknown> };
    },
    { path, init },
  );
}

/** Collects CSP violations and uncaught page errors during a test. */
export function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Content Security Policy|Refused to/i.test(msg.text())) problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

/** Signs out through the header: the Account dropdown on desktop, the drawer on small screens. */
export async function signOutViaHeader(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
  } else {
    await page.getByRole('banner').getByRole('button', { name: 'Account' }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click();
  }
  await expect(page).toHaveURL(/\/$/);
}
