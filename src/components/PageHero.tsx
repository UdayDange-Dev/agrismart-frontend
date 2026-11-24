import type { ReactNode } from 'react';

/**
 * Full-width photographic page header (catalogue, solutions). The photo is decorative; the
 * deep-green overlay keeps the white text above WCAG AA contrast.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  image,
  widths,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  image: string;
  widths: number[];
  breadcrumbs?: ReactNode;
}) {
  return (
    <section className="page-hero" aria-labelledby="page-title">
      <img
        className="page-hero__bg"
        src={`/images/${image}-${widths[widths.length - 1]}.webp`}
        srcSet={widths.map((w) => `/images/${image}-${w}.webp ${w}w`).join(', ')}
        sizes="100vw"
        alt=""
        decoding="async"
      />
      <div className="container page-hero__inner">
        {breadcrumbs}
        {eyebrow ? <p className="eyebrow anim-rise">{eyebrow}</p> : null}
        <h1 id="page-title" className="anim-rise" style={{ '--d': '80ms' } as React.CSSProperties}>
          {title}
        </h1>
        {lead ? (
          <p className="page-hero__lead anim-rise" style={{ '--d': '160ms' } as React.CSSProperties}>
            {lead}
          </p>
        ) : null}
      </div>
    </section>
  );
}
