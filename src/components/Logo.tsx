/**
 * The official AGRI SMART logo (user-supplied artwork, unmodified).
 *  - /images/agrismart-logo.png is a byte-identical copy of the supplied file (fallback).
 *  - agrismart-logo-{64,128,192,240}.webp are proportional downscales of the same artwork for
 *    fast loading; no cropping, recolouring or effects.
 * Explicit width/height reserve the space before the image loads (no layout shift).
 * The logo has a white background: only place it on white or very light surfaces.
 */
export const LOGO_ALT = 'AGRI SMART — a smart way of farming';
const WEBP_SRCSET = [64, 128, 192, 240].map((w) => `/images/agrismart-logo-${w}.webp ${w}w`).join(', ');

export function Logo({ size, className, priority = false }: { size: number; className?: string; priority?: boolean }) {
  return (
    <picture className={`logo${className ? ` ${className}` : ''}`}>
      <source type="image/webp" srcSet={WEBP_SRCSET} sizes={`${size}px`} />
      <img
        src="/images/agrismart-logo.png"
        alt={LOGO_ALT}
        width={size}
        height={size}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </picture>
  );
}
