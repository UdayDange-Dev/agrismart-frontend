import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Only VITE_* variables reach the browser bundle. They are PUBLIC: never put secrets in them.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

/**
 * VITE_API_BASE_URL must be a same-origin path (default /api). In production Vercel rewrites
 * /api/* to the backend (vercel.json), which keeps the SameSite=Strict session cookies, the CSRF
 * check and the CSP (`connect-src 'self'`) working. An absolute URL would make every API call
 * cross-site, so sign-in would silently fail; the build refuses it instead.
 */
function apiBase(mode: string): string {
  const value = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL?.trim() || '/api';
  if (!/^\/[A-Za-z0-9/_-]*$/.test(value) || value.startsWith('//')) {
    throw new Error('VITE_API_BASE_URL must be a same-origin path such as /api (the Vercel rewrite proxies it), not a URL');
  }
  return value.replace(/\/+$/, '') || '/api';
}

/**
 * `vite preview` serves the production build with the SAME security headers as Vercel, read from
 * vercel.json (single source of truth), so the browser test suite exercises the real CSP.
 * HTTPS-only parts are dropped for http://127.0.0.1.
 */
function productionHeaders(): Record<string, string> {
  const file = fileURLToPath(new URL('./vercel.json', import.meta.url));
  const config = JSON.parse(readFileSync(file, 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const site = config.headers.find((h) => h.source === '/((?!api/).*)');
  const headers: Record<string, string> = {};
  for (const { key, value } of site?.headers ?? []) {
    if (key === 'Strict-Transport-Security') continue;
    headers[key] = key === 'Content-Security-Policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value;
  }
  return headers;
}

export default defineConfig(({ mode }) => {
  const base = apiBase(mode);
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        // Dev only: forwards the API path to the local backend so the browser stays same-origin.
        [base]: { target: apiTarget, changeOrigin: false },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      headers: productionHeaders(),
      proxy: { [base]: { target: apiTarget, changeOrigin: false } },
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // do not publish source maps in production
      target: 'es2022',
      assetsInlineLimit: 0, // keep a strict CSP without data: URIs for assets
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
