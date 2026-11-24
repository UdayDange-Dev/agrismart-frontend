import { useEffect, useState } from 'react';
import { api, type Category, type CategoryCount } from '../api/client';

/**
 * Product categories from the live ERPNext catalogue, shared by the header mega menu,
 * the homepage and the footer. One request per 5 minutes per page load.
 */
const TTL_MS = 5 * 60 * 1000;
let cache: { data: Category[]; at: number } | null = null;
let inflight: Promise<Category[]> | null = null;

function load(): Promise<Category[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  inflight ??= api
    .categories()
    .then((r) => {
      cache = { data: r.items, at: Date.now() };
      return r.items;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export interface CategoriesState {
  categories: Category[];
  status: 'loading' | 'ready' | 'error';
}

export function useCategories(): CategoriesState {
  const [state, setState] = useState<CategoriesState>(() =>
    cache ? { categories: cache.data, status: 'ready' } : { categories: [], status: 'loading' },
  );
  useEffect(() => {
    let active = true;
    load().then(
      (categories) => active && setState({ categories, status: 'ready' }),
      () => active && setState((s) => ({ categories: s.categories, status: 'error' })),
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
}

/**
 * Resolves a `?category=` value (exact ERPNext name, case-insensitive) against the navigation
 * categories: returns the matching group and the top-level group it belongs to, if known.
 */
export function findCategory(categories: Category[], name: string): { match: CategoryCount; top: Category } | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  for (const top of categories) {
    if (top.name.toLowerCase() === wanted) return { match: top, top };
    const child = top.children.find((c) => c.name.toLowerCase() === wanted);
    if (child) return { match: child, top };
  }
  return null;
}

/** Test helper: forget cached categories between tests. */
export function resetCategoriesCache(): void {
  cache = null;
  inflight = null;
}
