import { Link, useParams } from 'react-router-dom';
import { api, categoryUrl, type Category } from '../api/client';
import { CategoryTile } from '../components/CategoryTile';
import { SUPPORT_EMAIL, SUPPORT_PHONE, telHref } from '../components/Header';
import { ArrowRight, MailIcon, PhoneIcon } from '../components/Icons';
import { PageHero } from '../components/PageHero';
import { ProductCard } from '../components/ProductCard';
import { Reveal } from '../components/Reveal';
import { ProductGridSkeleton } from '../components/Skeleton';
import { findSolution, SOLUTIONS, solutionUrl, srcSet, type Solution } from '../components/solutions';
import { ErrorNotice } from '../components/Status';
import { useAsync } from '../lib/useAsync';
import { findCategory, useCategories } from '../lib/useCategories';
import { NotFoundPage } from './NotFoundPage';

/** Live ERPNext categories related to a solution (only groups that exist in the catalogue). */
function relatedCategories(solution: Solution, categories: Category[]): Category[] {
  return solution.categories.map((name) => findCategory(categories, name)?.top).filter((c): c is Category => Boolean(c));
}

function SolutionCard({ s }: { s: Solution }) {
  return (
    <Link to={solutionUrl(s.id)} className="solution-card__link">
      <span className="solution-card__media">
        <img src={`/images/${s.image}-480.webp`} srcSet={srcSet(s.image, s.widths)} sizes="(max-width: 720px) 100vw, 33vw" alt={s.alt} loading="lazy" decoding="async" />
      </span>
      <span className="solution-card__body">
        <span className="solution-card__title">{s.title}</span>
        <span className="solution-card__text">{s.summary}</span>
        <span className="solution-card__more">
          Learn more <span className="visually-hidden">about {s.title}</span> <ArrowRight size={16} />
        </span>
      </span>
    </Link>
  );
}

export function SolutionsPage() {
  return (
    <div className="solutions-page">
      <PageHero
        eyebrow="Solutions"
        title="Solutions built around how you farm"
        lead="From water to soil to seed, choose the inputs that fit your crop, and talk to our team when you need a plan."
        image="band-field"
        widths={[960, 1920]}
      />
      <div className="container page-body">
        <ul className="solution-grid">
          {SOLUTIONS.map((s, i) => (
            <Reveal as="li" key={s.id} className="solution-card" delay={(i % 3) * 90}>
              <SolutionCard s={s} />
            </Reveal>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Up to four live products from the first related category that has any. */
function RelatedProducts({ category }: { category: Category }) {
  const products = useAsync((signal) => api.products({ category: category.name, pageSize: 4 }, signal), [category.name]);
  return (
    <section className="solution-detail__block" aria-labelledby="products-heading">
      <div className="section-heading section-heading--row">
        <div>
          <h2 id="products-heading">Products in {category.label}</h2>
        </div>
        <Link to={categoryUrl(category.name)} className="text-link">
          View all <ArrowRight size={16} />
        </Link>
      </div>
      {products.loading ? <ProductGridSkeleton count={4} /> : null}
      {products.error ? <ErrorNotice error={products.error} /> : null}
      {products.data && products.data.items.length > 0 ? (
        <div className="product-grid">
          {products.data.items.map((p) => (
            <ProductCard key={p.itemCode} product={p} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SolutionDetailPage() {
  const { id } = useParams();
  const solution = findSolution(id);
  const { categories, status } = useCategories();
  if (!solution) return <NotFoundPage />;

  const related = relatedCategories(solution, categories);
  const withProducts = related.find((c) => c.count > 0);
  const subGroups = related.flatMap((c) => c.children);
  const others = SOLUTIONS.filter((s) => s.id !== solution.id);

  return (
    <article className="solution-detail">
      <PageHero
        eyebrow="Solution"
        title={solution.title}
        lead={solution.summary}
        image={solution.image}
        widths={solution.widths}
        breadcrumbs={
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/solutions">Solutions</Link> / <span aria-current="page">{solution.title}</span>
          </nav>
        }
      />
      <div className="container page-body">
        <div className="solution-detail__grid">
          <div>
            <section aria-labelledby="range-heading">
              <p className="eyebrow">What we supply</p>
              <h2 id="range-heading">The range</h2>
              <p className="solution-detail__range">{solution.range}</p>
              {subGroups.length > 0 ? (
                <ul className="solution-detail__subs" aria-label="Product groups with listed products">
                  {subGroups.map((g) => (
                    <li key={g.name}>
                      <Link to={categoryUrl(g.name)}>
                        {g.label} <small>({g.count})</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {solution.categories.length > 0 ? (
              <section className="solution-detail__block" aria-labelledby="related-heading">
                <h2 id="related-heading">Shop related products</h2>
                {status === 'loading' && related.length === 0 ? <p className="muted small">Loading categories…</p> : null}
                {related.length > 0 ? (
                  <ul className="solution-detail__cats">
                    {related.map((c) => (
                      <li key={c.name}>
                        <CategoryTile category={c} />
                      </li>
                    ))}
                  </ul>
                ) : status !== 'loading' && solution.search ? (
                  <Link to={`/products?q=${encodeURIComponent(solution.search)}`} className="text-link">
                    Browse products <ArrowRight size={16} />
                  </Link>
                ) : null}
              </section>
            ) : null}

            {withProducts ? <RelatedProducts category={withProducts} /> : null}
          </div>

          <aside className="solution-detail__aside" aria-labelledby="ask-heading">
            <h2 id="ask-heading">Talk to our team</h2>
            <p>Tell us your crop, acreage and timeline and we will help you choose. We usually reply within one working day.</p>
            <Link to="/contact" className="btn">
              Ask our team <ArrowRight size={18} className="btn-arrow" />
            </Link>
            <Link to="/products" className="btn btn-outline">
              View all products
            </Link>
            <ul className="solution-detail__contact">
              <li>
                <a href={telHref(SUPPORT_PHONE)}>
                  <PhoneIcon size={18} /> {SUPPORT_PHONE}
                </a>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`}>
                  <MailIcon size={18} /> {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </div>

      <section className="section section--tint" aria-labelledby="other-heading">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Explore more</p>
            <h2 id="other-heading">Other solutions</h2>
          </div>
          <ul className="solution-grid">
            {others.map((s) => (
              <li key={s.id} className="solution-card">
                <SolutionCard s={s} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
