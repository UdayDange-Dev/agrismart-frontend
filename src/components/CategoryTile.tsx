import { Link } from 'react-router-dom';
import { categoryUrl, type CategoryCount } from '../api/client';
import { categoryMedia, mediaSrc, mediaSrcSet } from '../lib/categoryMedia';
import { ArrowRight, CategoryIcon } from './Icons';

/**
 * Photo tile for an ERPNext top-level Item Group: image, icon badge, readable label, range
 * description and live product count. The whole tile is one link to the filtered listing.
 */
export function CategoryTile({ category, compact = false }: { category: CategoryCount; compact?: boolean }) {
  const media = categoryMedia(category.name);
  return (
    <Link to={categoryUrl(category.name)} className={`category-card${compact ? ' category-card--compact' : ''}`}>
      <span className="category-card__media">
        <img src={mediaSrc(media)} srcSet={mediaSrcSet(media)} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" alt="" loading="lazy" decoding="async" />
      </span>
      <span className="category-card__icon" aria-hidden="true">
        <CategoryIcon name={category.name} size={compact ? 20 : 24} />
      </span>
      <span className="category-card__body">
        <span className="category-card__name">{category.label}</span>
        {media.blurb ? <span className="category-card__blurb">{media.blurb}</span> : null}
        <span className="category-card__count">
          {category.count > 0 ? `${category.count} ${category.count === 1 ? 'product' : 'products'}` : 'Ask for availability'}
          <ArrowRight size={16} className="category-card__go" />
        </span>
      </span>
    </Link>
  );
}
