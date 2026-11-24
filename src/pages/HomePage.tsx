import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, categoryUrl, type Category } from '../api/client';
import { CategoryTile } from '../components/CategoryTile';
import { CountUp } from '../components/CountUp';
import { SUPPORT_EMAIL, SUPPORT_PHONE, telHref } from '../components/Header';
import { ArrowRight, CheckIcon, ClipboardIcon, HeadsetIcon, MailIcon, PhoneIcon, ShieldIcon, TagIcon } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { Reveal } from '../components/Reveal';
import { CategorySkeleton, ProductGridSkeleton } from '../components/Skeleton';
import { SOLUTIONS, solutionUrl, srcSet } from '../components/solutions';
import { ErrorNotice } from '../components/Status';
import { categoryMedia } from '../lib/categoryMedia';
import { prefersReducedMotion } from '../lib/motion';
import { useAsync } from '../lib/useAsync';
import { findCategory, useCategories } from '../lib/useCategories';

/** Subtle parallax for the hero photo (transform only, rAF-throttled, off for reduced motion). */
function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const el = ref.current;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        el.style.transform = `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return ref;
}

/** What the website and team actually do (no invented statistics, awards or history). */
const BENEFITS = [
  { icon: TagIcon, title: 'Transparent MRP pricing', text: 'Every price comes straight from our ERP price list, so the website and our counter always agree.' },
  { icon: ShieldIcon, title: 'Genuine, traceable products', text: 'Products are listed only when they are active in our catalogue with a valid current price.' },
  { icon: HeadsetIcon, title: 'Advice before you buy', text: 'Our team helps you choose the right inputs for your crop, soil and season.' },
  { icon: ClipboardIcon, title: 'Confirmed before payment', text: 'We confirm stock, taxes and delivery with you before any payment is taken.' },
];

const STEPS = [
  { title: 'Browse live prices', text: 'Search the catalogue and compare products at current MRP.' },
  { title: 'Send an order request', text: 'Add items to your cart and submit. No payment online.' },
  { title: 'We confirm the details', text: 'Our team checks stock, taxes and delivery and contacts you.' },
  { title: 'Delivery to your farm', text: 'Pay as agreed and receive your inputs where you need them.' },
];

/** Solutions featured on the homepage (agronomy support appears in the value and inquiry sections). */
const RANGE_SOLUTIONS = SOLUTIONS.filter((s) => s.categories.length > 0);

function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  id: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={`section-heading${children ? ' section-heading--row' : ''}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        {lead ? <p className="section-lead">{lead}</p> : null}
      </div>
      {children}
    </Reveal>
  );
}

function Hero() {
  const media = useParallax<HTMLDivElement>();
  const { categories: all, status } = useCategories();
  const categories = all.filter((c) => c.count > 0); // statistics count only groups with products
  const products = categories.reduce((n, c) => n + c.count, 0);
  return (
    <section className="hero" aria-labelledby="hero-title">
      {/* Clips the zooming / parallax photo; the at-a-glance bar below may overlap the next section. */}
      <div className="hero__clip">
        <div className="hero__media" ref={media}>
          <img
            src="/images/hero-orchard-1280.webp"
            srcSet={srcSet('hero-orchard', [768, 1280, 1920])}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="hero__overlay" />
      </div>
      <div className="container hero__content">
        <p className="hero__eyebrow anim-rise" style={{ '--d': '0ms' } as React.CSSProperties}>
          AGRI SMART · a smart way of farming
        </p>
        <h1 id="hero-title" className="hero__title anim-rise" style={{ '--d': '120ms' } as React.CSSProperties}>
          Smarter farm inputs for <span className="hero__highlight">healthier harvests</span>
        </h1>
        <p className="hero__lead anim-rise" style={{ '--d': '240ms' } as React.CSSProperties}>
          Irrigation, seeds, crop nutrition and tools at transparent MRP prices, backed by people who understand your fields.
        </p>
        <div className="hero__actions anim-rise" style={{ '--d': '360ms' } as React.CSSProperties}>
          <Link to="/products" className="btn btn-light btn-lg">
            Explore products <ArrowRight size={20} className="btn-arrow" />
          </Link>
          <Link to="/contact" className="btn btn-ghost-light btn-lg">
            Request an inquiry
          </Link>
        </div>
      </div>
      <div className="container hero__bar-wrap">
        <dl className="hero__bar anim-rise" style={{ '--d': '520ms' } as React.CSSProperties} aria-label="At a glance">
          {status === 'ready' && products > 0 ? (
            <>
              <div>
                <dt>Products in our live catalogue</dt>
                <dd>
                  <CountUp value={products} />
                </dd>
              </div>
              <div>
                <dt>Product categories</dt>
                <dd>
                  <CountUp value={categories.length} />
                </dd>
              </div>
            </>
          ) : null}
          <div>
            <dt>Prices</dt>
            <dd className="hero__bar-text">MRP, live from our ERP</dd>
          </div>
          <div className="hero__bar-contact">
            <dt>Talk to our team</dt>
            <dd className="hero__bar-text">
              <a href={telHref(SUPPORT_PHONE)}>
                <PhoneIcon size={18} /> {SUPPORT_PHONE}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Categories() {
  const { categories: all, status } = useCategories();
  const categories = all.filter((c) => c.count > 0); // the full list of groups is in the Products menu
  return (
    <section className="section" aria-labelledby="cat-heading">
      <div className="container">
        <SectionHeading eyebrow="Our range" title="Shop by category" id="cat-heading" lead="Everything in our catalogue, organised the way you plan your season.">
          <Link to="/products" className="text-link">
            All products <ArrowRight size={18} />
          </Link>
        </SectionHeading>
        {status === 'loading' && all.length === 0 ? <CategorySkeleton /> : null}
        {status === 'error' && all.length === 0 ? (
          <p className="notice notice-error">Categories are temporarily unavailable. Please try again shortly.</p>
        ) : null}
        {status === 'ready' && categories.length === 0 ? <p className="empty card">No categories are available yet.</p> : null}
        {categories.length > 0 ? (
          <ul className="category-grid">
            {categories.map((c, i) => (
              <Reveal as="li" key={c.name} delay={Math.min(i, 7) * 70}>
                <CategoryTile category={c} />
              </Reveal>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function Featured() {
  const products = useAsync((signal) => api.products({ pageSize: 8 }, signal), []);
  return (
    <section className="section section--tint" aria-labelledby="featured-heading">
      <div className="container">
        <SectionHeading eyebrow="From the catalogue" title="Featured products" id="featured-heading">
          <Link to="/products" className="text-link">
            View all products <ArrowRight size={18} />
          </Link>
        </SectionHeading>
        {products.loading ? <ProductGridSkeleton count={4} /> : null}
        {products.error ? <ErrorNotice error={products.error} /> : null}
        {products.data && products.data.items.length === 0 ? (
          <div className="empty card">
            <p>No products are published yet. Please check back soon or send us an inquiry.</p>
          </div>
        ) : null}
        {products.data && products.data.items.length > 0 ? (
          <div className="product-grid">
            {products.data.items.map((p, i) => (
              <Reveal key={p.itemCode} delay={Math.min(i, 3) * 80}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Solutions() {
  return (
    <section className="section" id="solutions" aria-labelledby="solutions-heading">
      <div className="container">
        <SectionHeading
          eyebrow="Solutions"
          title="Built around how you farm"
          id="solutions-heading"
          lead="From water to soil to seed, choose the inputs that fit your crop and talk to us when you need a plan."
        >
          <Link to="/solutions" className="text-link">
            All solutions <ArrowRight size={18} />
          </Link>
        </SectionHeading>
        <ul className="solution-grid">
          {RANGE_SOLUTIONS.map((s, i) => (
            <Reveal as="li" key={s.id} id={s.id} className="solution-card" delay={(i % 3) * 90}>
              <Link to={solutionUrl(s.id)} className="solution-card__link">
                <span className="solution-card__media">
                  <img
                    src={`/images/${s.image}-480.webp`}
                    srcSet={srcSet(s.image, s.widths)}
                    sizes="(max-width: 720px) 100vw, 33vw"
                    alt={s.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="solution-card__body">
                  <span className="solution-card__title">{s.title}</span>
                  <span className="solution-card__text">{s.summary}</span>
                  <span className="solution-card__more">
                    Learn more <span className="visually-hidden">about {s.title}</span> <ArrowRight size={16} />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Live ERPNext top-level categories for the given names (only those that exist). */
function useLiveCategories(names: string[]): Category[] {
  const { categories } = useCategories();
  return names.map((n) => findCategory(categories, n)?.top).filter((c): c is Category => Boolean(c));
}

/** Split image/text section presenting one part of the range, linked to live categories. */
function RangeFeature({
  id,
  eyebrow,
  title,
  text,
  image,
  widths,
  alt,
  categories,
  solutionId,
  reverse = false,
  tint = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  image: string;
  widths: number[];
  alt: string;
  categories: string[];
  solutionId: string;
  reverse?: boolean;
  tint?: boolean;
}) {
  const live = useLiveCategories(categories);
  return (
    <section className={`section${tint ? ' section--tint' : ''}`} aria-labelledby={`${id}-heading`}>
      <div className={`container feature${reverse ? ' feature--reverse' : ''}`}>
        <Reveal className="feature__media">
          <img
            src={`/images/${image}-${widths[0]}.webp`}
            srcSet={srcSet(image, widths)}
            sizes="(max-width: 900px) 100vw, 50vw"
            alt={alt}
            loading="lazy"
            decoding="async"
          />
        </Reveal>
        <Reveal className="feature__body" delay={120}>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-heading`}>{title}</h2>
          <p className="feature__text">{text}</p>
          {live.length > 0 ? (
            <ul className="check-list">
              {live.map((c) => {
                const media = categoryMedia(c.name);
                return (
                  <li key={c.name}>
                    <CheckIcon size={18} className="check-list__icon" />
                    <span>
                      <Link to={categoryUrl(c.name)} className="check-list__link">
                        {c.label}
                      </Link>
                      {media.blurb ? <span className="check-list__text"> {media.blurb}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="feature__actions">
            <Link to={solutionUrl(solutionId)} className="btn">
              Explore the solution <ArrowRight size={18} className="btn-arrow" />
            </Link>
            {live[0] ? (
              <Link to={categoryUrl(live[0].name)} className="btn btn-outline">
                Browse {live[0].label}
              </Link>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const SUPPLY_GROUPS = ['PROTECTED AGRICULTURE', 'EQUIPMENTS', 'HARDWARE', 'ELECTRICAL & CONTROL', 'SOLAR', 'GARDENING & LANDSCAPING'];

function Supplies() {
  const live = useLiveCategories(SUPPLY_GROUPS);
  if (live.length === 0) return null;
  return (
    <section className="section section--tight-top" aria-labelledby="supplies-heading">
      <div className="container">
        <SectionHeading
          eyebrow="Equipment & supplies"
          title="Everything else the farm needs"
          id="supplies-heading"
          lead="Protected cultivation, machines and tools, fittings, electrical and solar supplies, and garden essentials."
        >
          <Link to="/solutions/farm-equipment" className="text-link">
            Farm equipment & supplies <ArrowRight size={18} />
          </Link>
        </SectionHeading>
        <ul className="supply-grid">
          {live.map((c, i) => (
            <Reveal as="li" key={c.name} delay={(i % 3) * 70}>
              <CategoryTile category={c} compact />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Values() {
  return (
    <>
      <section className="photo-band" aria-labelledby="band-heading">
        <img
          className="photo-band__bg"
          src="/images/band-field-960.webp"
          srcSet={srcSet('band-field', [960, 1920])}
          sizes="100vw"
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="photo-band__overlay" />
        <Reveal className="container photo-band__inner">
          <p className="eyebrow eyebrow--light">Why AGRI SMART</p>
          <h2 id="band-heading">Genuine farm inputs at MRP, with expert support</h2>
          <p>One supplier for the season: seed and nutrition, irrigation, protection and equipment.</p>
        </Reveal>
      </section>
      <section className="section section--tint" aria-labelledby="why-heading">
        <div className="container">
          <SectionHeading eyebrow="Our promise" title="A supplier you can plan a season around" id="why-heading" />
          <ul className="benefit-grid">
            {BENEFITS.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} className="benefit" delay={i * 90}>
                <span className="benefit__icon">
                  <Icon size={26} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </ul>
          <Reveal as="ol" className="steps" aria-label="How ordering works">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step__num" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}

function InquiryBand() {
  return (
    <section className="cta-band" aria-labelledby="cta-heading">
      <Reveal className="container cta-band__inner">
        <div>
          <p className="eyebrow">Talk to our team</p>
          <h2 id="cta-heading">Planning a bulk order or a new installation?</h2>
          <p>Tell us your crop, acreage and timeline. We usually reply within one working day.</p>
          <p className="cta-band__contact">
            <a href={telHref(SUPPORT_PHONE)}>
              <PhoneIcon size={18} /> {SUPPORT_PHONE}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <MailIcon size={18} /> {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
        <div className="cta-band__actions">
          <Link to="/contact" className="btn btn-lg">
            Request an inquiry <ArrowRight size={20} className="btn-arrow" />
          </Link>
          <Link to="/products" className="btn btn-outline btn-lg">
            Browse catalogue
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <Featured />
      <Solutions />
      <RangeFeature
        id="water"
        eyebrow="Irrigation & water management"
        title="Put water where the roots are"
        text="Drip and sprinkler components, with the pipes, filters, valves and pumps that feed them, to cut waste in every season."
        image="feature-drip"
        widths={[640, 1200]}
        alt="A young grapevine watered by a drip line"
        categories={['IRRIGATION', 'WATER PUMPS & MOTORS']}
        solutionId="irrigation"
      />
      <RangeFeature
        id="nutrition"
        eyebrow="Crop nutrition & crop protection"
        title="Feed the soil, protect the crop"
        text="Fertilisers and soil inputs matched to your crop stage, and biological and chemical protection products, with advice from our team on what to use."
        image="cat-protection"
        widths={[480, 960]}
        alt="A boom sprayer working a row crop"
        categories={['CROP NUTRITION', 'CROP PROTECTION']}
        solutionId="crop-nutrition"
        reverse
        tint
      />
      <RangeFeature
        id="seeds"
        eyebrow="Seeds & planting material"
        title="A strong start for every crop"
        text="Quality seeds and planting material for strong, uniform germination and healthy young plants."
        image="cat-seeds"
        widths={[480, 960]}
        alt="Ripe wheat ears in a field"
        categories={['SEEDS', 'PLANTING MATERIAL']}
        solutionId="seeds-nursery"
      />
      <Supplies />
      <Values />
      <InquiryBand />
    </>
  );
}
