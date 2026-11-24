# Agrismart storefront (frontend)

The React 19 + Vite 8 storefront for Agrismart. The API is a separate repository
(`agrismart-backend`, hosted on Render). In production, Vercel serves this app and proxies
`/api/*` to the backend, so the browser only ever talks to one origin.

## Security model

- **Same origin.** Every API call goes to `/api` on the storefront's own domain (`vercel.json`
  rewrites it to Render). That keeps the `SameSite=Strict`, `HttpOnly` session cookies, the CSRF
  token and the CSP `connect-src 'self'` working. `VITE_API_BASE_URL` must stay a path, and the
  build fails if it is set to a URL.
- **Nothing secret in the bundle.** Every `VITE_*` variable is public. ERPNext and MongoDB are
  reachable only from the backend.
- **Origin secret.** `vercel.json` injects the server-side Vercel variable `ORIGIN_SECRET` as a
  request header on proxied `/api` calls, using a route transform that replaces any client value.
  The backend refuses requests without it. It is not a `VITE_` variable and never appears in the
  build.
- **Security headers.** CSP, HSTS, `X-Frame-Options: DENY`, nosniff, Referrer-Policy,
  Permissions-Policy and COOP are set in `vercel.json`. `vite preview` reads the same headers, so
  the browser tests exercise the real CSP.
- **Not part of the security boundary.** Hiding a page or button is UX only. The backend
  enforces sign-in, verified email, roles and ownership on every request.
- **Browser storage.** The cart (item codes and quantities), form drafts and a return path are
  stored, plus order access tokens in `sessionStorage`. Nothing auth-related is stored. The CSRF
  token lives in memory only.

## Run locally

```bash
npm ci
npm run dev            # http://127.0.0.1:5173, proxies /api to http://127.0.0.1:4000
```

Start the backend next to it (`npm run dev:mock` in the backend repository).

## Quality checks

```bash
npm run typecheck && npm run lint && npm test && npm run build
# Browser tests (Chromium) need the backend checkout next to this one, with npm ci done:
npx playwright install chromium
E2E_BACKEND_DIR=../Agrismart-Backend npm run test:e2e
```

## Deploy to Vercel (test environment)

Nothing here deploys automatically. Steps for a person with access to the Vercel account:

1. Deploy the backend first (backend README) and note its URL, e.g.
   `https://agrismart-backend.onrender.com`.
2. Set `routes[0].dest` in `vercel.json` to `https://<your-service>.onrender.com/api/$1` if the
   service name differs. Commit the change.
3. Push this repository to GitHub, then in Vercel choose **Add New > Project**, import it, keep
   framework **Vite**, build `npm run build`, output `dist`.
4. Under **Settings > Environment Variables**, add:
   - `ORIGIN_SECRET`: the same value as the backend's `ORIGIN_SHARED_SECRET`. Mark it
     **Sensitive** and scope it to Production (and Preview, if previews should reach the API).
   - Optional, all public: `VITE_API_BASE_URL=/api`, `VITE_APP_NAME`, `VITE_SUPPORT_EMAIL`,
     `VITE_SUPPORT_PHONE`.
5. Set the backend's `CORS_ALLOWED_ORIGINS` and `APP_PUBLIC_URL` to the Vercel production origin.
   Preview URLs are not allowlisted, so previews can browse but not sign in or submit forms. That
   is intended.

### Post-deploy checks (required before calling it production-ready)

These depend on Vercel's handling of external rewrites, which can't be tested locally:

- Sign up, verify email, sign in, add to cart, place an order request and send an inquiry. This
  proves `Cookie`, `Set-Cookie` and `Origin` pass through the rewrite.
- Search and page through products (`/products?q=…&page=2`). This proves query strings are
  forwarded.
- Check that product images load (`/api/products/<code>/image`).
- `curl -i https://<service>.onrender.com/api/products` must return **403**. Only the health
  endpoints answer directly.
- In DevTools, the response headers on `/` must include the CSP and HSTS. API responses must not
  show `x-vercel-cache: HIT` for `/api/customer/*`.
- In the backend logs, `Origin gate: first proxied request accepted` should show
  `forwardedForEntries` of 1 or more. Rate limits must apply per visitor, so after 10 failed
  sign-ins from one network, another network must still be able to sign in.

## Push to GitHub (manual, when approved)

```bash
# Create an EMPTY private repository named agrismart-frontend on GitHub first.
git remote add origin git@github.com:<your-org>/agrismart-frontend.git
git status --short        # must be empty
git push -u origin main
```
