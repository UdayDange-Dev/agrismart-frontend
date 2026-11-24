/// <reference types="vite/client" />

// Every VITE_* value is compiled into the public bundle. Only declare non-secret values here.
interface ImportMetaEnv {
  /** Same-origin API path, default /api (proxied to the backend by vercel.json). Not a URL. */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
  readonly VITE_SUPPORT_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
