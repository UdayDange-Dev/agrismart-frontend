import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (real Chromium) against the production build served by `vite preview` with the
 * production security headers, backed by `npm run dev:mock` (real API + in-memory MongoDB +
 * mock ERPNext). Nothing external is contacted and no real email is sent.
 *
 *   npx playwright install chromium   # once
 *   npm run test:e2e
 *
 * The backend is a separate repository: E2E_BACKEND_DIR points at its checkout (with
 * `npm ci` done), default ../Agrismart-Backend next to this repository.
 */
// Set once in the runner process; workers inherit these.
process.env.E2E_OUTBOX ??= join(tmpdir(), `agrismart-e2e-outbox-${Date.now()}.jsonl`);
process.env.E2E_CONTROL_SECRET ??= randomBytes(24).toString('hex');
// Ports are configurable so the suite can run next to a developer's own dev servers.
const API_PORT = process.env.E2E_API_PORT ?? '4000';
const WEB_PORT = process.env.E2E_WEB_PORT ?? '4173';
const CONTROL_PORT = process.env.E2E_CONTROL_PORT ?? '4100';
process.env.E2E_CONTROL_URL ??= `http://127.0.0.1:${CONTROL_PORT}`;

const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
const BACKEND_DIR = process.env.E2E_BACKEND_DIR ?? '../Agrismart-Backend';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // one shared backend; keeps the run deterministic
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testMatch: /(mobile|accessibility)\.spec\.ts/ },
  ],
  webServer: [
    {
      command: `npm --prefix "${BACKEND_DIR}" run dev:mock`,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        DEV_MAIL_OUTBOX: process.env.E2E_OUTBOX,
        PORT: API_PORT,
        DEV_CONTROL_PORT: CONTROL_PORT,
        DEV_CONTROL_SECRET: process.env.E2E_CONTROL_SECRET,
        DEV_RELAX_RATE_LIMITS: '1',
        APP_PUBLIC_URL: BASE_URL,
        DEV_ADMIN_PASSWORD: 'E2e-Admin-Password-42',
      },
    },
    {
      command: `npm run build && npm run preview -- --port ${WEB_PORT}`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      url: BASE_URL,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
