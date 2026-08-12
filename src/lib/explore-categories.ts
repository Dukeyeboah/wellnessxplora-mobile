/** Subset of website explore categories — enough for hub carousels + queries. */

export type ExploreCategory = {
  slug: string;
  title: string;
  tagline: string;
};

/** Same fixed hub rows as the website Explore “All” view. */
export const HUB_CAROUSEL_CATEGORIES: ExploreCategory[] = [
  {
    slug: 'natural-foods',
    title: 'Natural foods & products',
    tagline: 'Farm-fresh & natural',
  },
  {
    slug: 'teas-juices-healthy-drinks',
    title: 'Teas, Juices & Healthy Drinks',
    tagline: 'Herbal teas, juices & purposeful hydration',
  },
  {
    slug: 'natural-home-products',
    title: 'Natural Home products',
    tagline: 'Non-toxic home care',
  },
];

/** Old Firestore slugs → current slug (same map as the website). */
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  'organic-foods': 'natural-foods',
  'teas-beverages': 'teas-juices-healthy-drinks',
  'healthy-drinks-juices': 'teas-juices-healthy-drinks',
  'natural-cleaning': 'natural-home-products',
  'home-lifestyle': 'natural-home-products',
};

export function resolveCategorySlug(slug: string): string {
  return LEGACY_CATEGORY_SLUGS[slug] ?? slug;
}

/** Query both canonical + legacy slug values so older docs still match. */
export function categorySlugsForQuery(canonicalSlug: string): string[] {
  const slugs = new Set<string>([canonicalSlug]);
  for (const [legacy, target] of Object.entries(LEGACY_CATEGORY_SLUGS)) {
    if (target === canonicalSlug) slugs.add(legacy);
  }
  return [...slugs];
}

export function hubCarouselTitle(category: ExploreCategory): string {
  return `Popular in ${category.title.toLowerCase()}`;
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
