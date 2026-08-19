export type ExploreCategory = {
  slug: string;
  title: string;
  tagline: string;
};

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    slug: 'teas-juices-healthy-drinks',
    title: 'Teas, Juices & Healthy Drinks',
    tagline: 'Herbal teas, juices & purposeful hydration',
  },
  {
    slug: 'natural-foods',
    title: 'Natural foods & products',
    tagline: 'Fresh and natural',
  },
  {
    slug: 'bakeries',
    title: 'Bakeries',
    tagline: 'Artisan breads & treats',
  },
  {
    slug: 'vitamins-supplements',
    title: 'Vitamins & supplements',
    tagline: 'Daily support & balance',
  },
  {
    slug: 'fitness-yoga',
    title: 'Fitness & Yoga',
    tagline: 'Move with intention',
  },
  {
    slug: 'spas-massage-wellness',
    title: 'Spas, Massage Therapy & Wellness',
    tagline: 'Restore, recharge & therapeutic care',
  },
  {
    slug: 'skincare-aromatherapy',
    title: 'Skin, Haircare & Aromatherapy',
    tagline: 'Glow, hair care, self-care & scent',
  },
  {
    slug: 'holistic-naturopathic-alternative-remedies',
    title: 'Holistic, Naturopathic & Alternative Remedies',
    tagline: 'Whole-person & complementary care',
  },
  {
    slug: 'workshops-retreats',
    title: 'Workshops & retreats',
    tagline: 'Immersive learning & rest',
  },
  {
    slug: 'eco-friendly-sustainable-products',
    title: 'Eco-friendly & Sustainable Products',
    tagline: 'Low-impact, lighter footprint choices',
  },
  {
    slug: 'natural-home-products',
    title: 'Natural Home products',
    tagline: 'Non-toxic home care',
  },
  {
    slug: 'pet-wellness',
    title: 'Pet wellness',
    tagline: 'Care for companions',
  },
];

const HUB_SLUGS = [
  'natural-foods',
  'teas-juices-healthy-drinks',
  'natural-home-products',
] as const;

/** Same fixed hub rows as the website Explore “All” view. */
export const HUB_CAROUSEL_CATEGORIES: ExploreCategory[] = HUB_SLUGS.map((slug) => {
  const category = EXPLORE_CATEGORIES.find((c) => c.slug === slug);
  if (!category) throw new Error(`Missing hub category: ${slug}`);
  return category;
});

/** Old Firestore slugs → current slug (same map as the website). */
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  'organic-foods': 'natural-foods',
  'teas-beverages': 'teas-juices-healthy-drinks',
  'healthy-drinks-juices': 'teas-juices-healthy-drinks',
  'spas-wellness': 'spas-massage-wellness',
  'massage-therapy': 'spas-massage-wellness',
  skincare: 'skincare-aromatherapy',
  aromatherapy: 'skincare-aromatherapy',
  haircare: 'skincare-aromatherapy',
  'skin-haircare-aromatherapy': 'skincare-aromatherapy',
  'holistic-naturopathic-remedies': 'holistic-naturopathic-alternative-remedies',
  'alternative-medicines': 'holistic-naturopathic-alternative-remedies',
  'eco-friendly-products': 'eco-friendly-sustainable-products',
  'sustainable-living': 'eco-friendly-sustainable-products',
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

export function getCategoryBySlug(slug: string): ExploreCategory | undefined {
  const resolved = resolveCategorySlug(slug);
  return EXPLORE_CATEGORIES.find((c) => c.slug === resolved);
}

function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Map a Firestore category slug or display title to a canonical slug. */
export function categorySlugFromLabel(label: string): string {
  const resolved = resolveCategorySlug(slugifyLabel(label));
  if (getCategoryBySlug(resolved)) return resolved;
  const byTitle = EXPLORE_CATEGORIES.find(
    (c) => c.title.toLowerCase() === label.trim().toLowerCase(),
  );
  return byTitle?.slug ?? resolved;
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
