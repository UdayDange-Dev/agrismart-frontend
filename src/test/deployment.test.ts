import { describe, expect, it } from 'vitest';
import raw from '../../vercel.json?raw';

/**
 * Guards the Vercel deployment contract (vercel.json):
 *  - /api/* is proxied to the backend, which keeps the session cookies first-party;
 *  - the origin-gate secret is injected server-side from an environment variable, never inline;
 *  - per-user API responses are not cached by the CDN;
 *  - the SPA gets the strict security headers and its fallback never swallows /api.
 */

interface Transform {
  type: string;
  op: string;
  target: { key: string };
  args: string;
  env?: string[];
}
interface VercelConfig {
  routes: { src: string; dest: string; headers?: Record<string, string>; transforms?: Transform[] }[];
  rewrites: { source: string; destination: string }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

const config = JSON.parse(raw) as VercelConfig;

describe('vercel.json', () => {
  const api = config.routes.find((r) => r.src === '/api/(.*)');

  it('proxies /api/* to an https backend, preserving the path', () => {
    expect(api).toBeDefined();
    const dest = new URL(api!.dest.replace('$1', 'x'));
    expect(dest.protocol).toBe('https:');
    expect(dest.pathname).toBe('/api/x');
    expect(dest.username + dest.password + dest.search).toBe('');
  });

  it('sets the origin-gate header from a server-side env var (replacing any client value)', () => {
    const t = api!.transforms?.find((x) => x.target.key === 'x-agrismart-origin-secret');
    expect(t).toMatchObject({ type: 'request.headers', op: 'set', args: '$ORIGIN_SECRET', env: ['ORIGIN_SECRET'] });
    // Never a literal secret, never a public VITE_ variable.
    expect(raw).not.toMatch(/VITE_[A-Z_]*SECRET/);
  });

  it('opts proxied API responses out of CDN caching', () => {
    expect(api!.headers?.['x-vercel-enable-rewrite-caching']).toBe('0');
  });

  it('serves the SPA for client routes but never for /api', () => {
    const spa = config.rewrites.find((r) => r.destination === '/index.html');
    expect(spa).toBeDefined();
    const re = new RegExp(`^${spa!.source}$`);
    expect(re.test('/products/ABC-1')).toBe(true);
    expect(re.test('/account/orders')).toBe(true);
    expect(re.test('/api/products')).toBe(false);
  });

  it('applies the strict security headers to the site', () => {
    const site = config.headers.find((h) => h.source === '/((?!api/).*)');
    const get = (k: string) => site?.headers.find((h) => h.key === k)?.value ?? '';
    const csp = get('Content-Security-Policy');
    for (const d of ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) {
      expect(csp).toContain(d);
    }
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
    expect(get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(get('X-Frame-Options')).toBe('DENY');
    expect(get('X-Content-Type-Options')).toBe('nosniff');
  });
});
