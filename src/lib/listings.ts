import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import {
  categorySlugsForQuery,
  EXPLORE_CATEGORIES,
  getCategoryBySlug,
  HUB_CAROUSEL_CATEGORIES,
  hubCarouselTitle,
  resolveCategorySlug,
  shuffleArray,
  type ExploreCategory,
} from '@/lib/explore-categories';
import { db } from '@/lib/firebase';
import { loadListingRatingStats } from '@/lib/listing-feedback';
import { resolveStorageImageUrl } from '@/lib/storage-url';

export type ExploreListing = {
  id: string;
  title: string;
  description: string;
  price?: number;
  currency?: string;
  imageUrl: string;
  vendorId: string;
  vendorName: string;
  vendorAvatarUrl: string;
  vendorVerified: boolean;
  vendorFoundingMember: boolean;
  ratingAvg: number;
  ratingCount: number;
  locationCountry?: string;
  categorySlug?: string;
};

export type ExploreVendor = {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
  foundingMember: boolean;
  city?: string;
  country?: string;
  categories: string[];
  rating: number;
  reviewCount: number;
};

type ListingDoc = Omit<
  ExploreListing,
  | 'vendorName'
  | 'vendorAvatarUrl'
  | 'vendorVerified'
  | 'vendorFoundingMember'
  | 'ratingAvg'
  | 'ratingCount'
>;

export type ExploreCarouselSection = {
  slug: string;
  title: string;
  subtitle: string;
  listings: ExploreListing[];
};

const HUB_CARD_LIMIT = 12;

type VendorMeta = {
  name: string;
  avatarUrl: string;
  verified: boolean;
  foundingMember: boolean;
  country: string;
};

function locationFromDoc(data: Record<string, unknown>): Record<string, unknown> {
  return data.location && typeof data.location === 'object' && !Array.isArray(data.location)
    ? (data.location as Record<string, unknown>)
    : {};
}

function mapVendorDoc(id: string, data: Record<string, unknown>): ExploreVendor {
  const loc = locationFromDoc(data);
  const categories = Array.isArray(data.category)
    ? data.category.map((c) => String(c))
    : typeof data.category === 'string'
      ? [data.category]
      : [];

  const rating = typeof data.rating === 'number' ? data.rating : 0;
  const reviewCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

  return {
    id,
    name: String(data.businessName ?? 'Vendor'),
    avatarUrl: vendorAvatarFromDoc(data),
    verified: data.verified === true,
    foundingMember: data.foundingMember === true,
    city: typeof loc.city === 'string' ? loc.city : undefined,
    country: typeof loc.country === 'string' ? loc.country.trim() : undefined,
    categories,
    rating,
    reviewCount,
  };
}

function firstImageFromListing(data: Record<string, unknown>): string {
  const images = Array.isArray(data.images) ? data.images : [];
  for (const img of images) {
    if (img == null) continue;
    const resolved = resolveStorageImageUrl(String(img));
    if (resolved) return resolved;
  }
  if (data.imageUrl) {
    return resolveStorageImageUrl(String(data.imageUrl));
  }
  return '';
}

function vendorAvatarFromDoc(data: Record<string, unknown>): string {
  const images =
    data.images && typeof data.images === 'object' && !Array.isArray(data.images)
      ? (data.images as Record<string, unknown>)
      : {};
  const logo = typeof images.logo === 'string' ? images.logo : '';
  const cover = typeof images.cover === 'string' ? images.cover : '';
  const ownerPhoto = typeof data.ownerPhotoURL === 'string' ? data.ownerPhotoURL : '';
  return resolveStorageImageUrl(logo || ownerPhoto || cover);
}

function listingPrice(data: Record<string, unknown>): number | undefined {
  const raw = data.price;
  const value =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

function listingCategorySlug(data: Record<string, unknown>): string | undefined {
  const values: string[] = [];
  if (typeof data.category === 'string' && data.category) values.push(data.category);
  if (Array.isArray(data.category)) {
    for (const item of data.category) {
      if (item) values.push(String(item));
    }
  }
  if (Array.isArray(data.categories)) {
    for (const item of data.categories) {
      if (item) values.push(String(item));
    }
  }
  for (const value of values) {
    const resolved = resolveCategorySlug(value);
    if (getCategoryBySlug(resolved)) return resolved;
  }
  return values[0] ? resolveCategorySlug(values[0]) : undefined;
}

function mapListingDoc(id: string, data: Record<string, unknown>): ListingDoc {
  const loc = locationFromDoc(data);
  return {
    id,
    title: String(data.title ?? 'Untitled'),
    description: String(data.description ?? ''),
    price: listingPrice(data),
    currency: data.currency ? String(data.currency) : undefined,
    imageUrl: firstImageFromListing(data),
    vendorId: String(data.vendorId ?? ''),
    locationCountry: typeof loc.country === 'string' ? loc.country.trim() : undefined,
    categorySlug: listingCategorySlug(data),
  };
}

async function loadVendorMeta(vendorIds: string[]): Promise<Map<string, VendorMeta>> {
  const vendors = new Map<string, VendorMeta>();
  await Promise.all(
    vendorIds.map(async (id) => {
      try {
        const vendorSnap = await getDoc(doc(db, 'vendors', id));
        if (!vendorSnap.exists()) return;
        const data = vendorSnap.data() as Record<string, unknown>;
        if (data.deactivated === true) return;
        const loc = locationFromDoc(data);
        vendors.set(id, {
          name: String(data.businessName ?? 'Vendor'),
          avatarUrl: vendorAvatarFromDoc(data),
          verified: data.verified === true,
          foundingMember: data.foundingMember === true,
          country: typeof loc.country === 'string' ? loc.country.trim() : '',
        });
      } catch {
        /* ignore */
      }
    }),
  );
  return vendors;
}

async function enrichListings(rows: ListingDoc[]): Promise<ExploreListing[]> {
  const vendorIds = [...new Set(rows.map((r) => r.vendorId).filter(Boolean))];
  const vendors = await loadVendorMeta(vendorIds);
  let ratings = new Map<string, { avg: number; count: number }>();
  try {
    ratings = await loadListingRatingStats(rows.map((r) => r.id));
  } catch {
    /* ratings are optional */
  }

  return rows
    .filter((row) => !row.vendorId || vendors.has(row.vendorId))
    .map((row) => {
      const vendor = row.vendorId ? vendors.get(row.vendorId) : undefined;
      const rating = ratings.get(row.id);
      return {
        ...row,
        vendorName: vendor?.name ?? 'Vendor',
        vendorAvatarUrl: vendor?.avatarUrl ?? '',
        vendorVerified: vendor?.verified ?? false,
        vendorFoundingMember: vendor?.foundingMember ?? false,
        ratingAvg: rating?.avg ?? 0,
        ratingCount: rating?.count ?? 0,
        locationCountry: row.locationCountry || vendor?.country || undefined,
      };
    });
}

/** Same dual query pattern as the website (category field + categories array). */
export async function fetchListingsByCategorySlug(slug: string): Promise<ExploreListing[]> {
  const canonical = resolveCategorySlug(slug);
  const slugsToQuery = categorySlugsForQuery(canonical);
  const byId = new Map<string, ReturnType<typeof mapListingDoc>>();

  await Promise.all(
    slugsToQuery.flatMap((s) => [
      (async () => {
        const snap = await getDocs(
          query(
            collection(db, 'listings'),
            where('category', '==', s),
            where('isActive', '==', true),
          ),
        );
        for (const d of snap.docs) {
          byId.set(d.id, mapListingDoc(d.id, d.data() as Record<string, unknown>));
        }
      })(),
      (async () => {
        const snap = await getDocs(
          query(
            collection(db, 'listings'),
            where('categories', 'array-contains', s),
            where('isActive', '==', true),
          ),
        );
        for (const d of snap.docs) {
          byId.set(d.id, mapListingDoc(d.id, d.data() as Record<string, unknown>));
        }
      })(),
    ]),
  );

  return enrichListings([...byId.values()]);
}

/** “All” hub: three Popular-in carousels with a random sample each. */
export async function fetchExploreHubCarousels(): Promise<ExploreCarouselSection[]> {
  const sections = await Promise.all(
    HUB_CAROUSEL_CATEGORIES.map(async (category: ExploreCategory) => {
      const listings = await fetchListingsByCategorySlug(category.slug);
      return {
        slug: category.slug,
        title: hubCarouselTitle(category),
        subtitle: category.tagline,
        listings: shuffleArray(listings).slice(0, HUB_CARD_LIMIT),
      };
    }),
  );

  return sections.filter((s) => s.listings.length > 0);
}

/**
 * Fetch all listings across a set of category slugs in parallel,
 * deduplicating by id. Mirrors fetchExploreHubListings on the web.
 */
export async function fetchListingsByGroupSlugs(slugs: readonly string[]): Promise<ExploreListing[]> {
  const byId = new Map<string, ExploreListing>();
  await Promise.all(
    slugs.map(async (slug) => {
      const rows = await fetchListingsByCategorySlug(slug);
      for (const row of rows) {
        byId.set(row.id, row);
      }
    }),
  );
  return [...byId.values()];
}

/**
 * Fetch all vendors that list any of the given category slugs in parallel,
 * deduplicating by id. Mirrors fetchExploreHubVendors on the web.
 */
export async function fetchVendorsByGroupSlugs(slugs: readonly string[]): Promise<ExploreVendor[]> {
  const byId = new Map<string, ExploreVendor>();
  await Promise.all(
    slugs.map(async (slug) => {
      const rows = await fetchVendorsByCategorySlug(slug);
      for (const row of rows) {
        byId.set(row.id, row);
      }
    }),
  );
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Products hub — query every explore category slug in parallel (same as the website). */
export async function fetchExploreHubListings(): Promise<ExploreListing[]> {
  const slugs = EXPLORE_CATEGORIES.map((c) => c.slug);
  const rows = await fetchListingsByGroupSlugs(slugs);
  return rows.sort(
    (a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0) || a.title.localeCompare(b.title),
  );
}

/** Vendors hub — query every explore category slug in parallel (same as the website). */
export async function fetchExploreHubVendors(): Promise<ExploreVendor[]> {
  const slugs = EXPLORE_CATEGORIES.map((c) => c.slug);
  return fetchVendorsByGroupSlugs(slugs);
}

/** @deprecated Use fetchExploreHubListings */
export async function fetchExploreProducts(): Promise<ExploreListing[]> {
  return fetchExploreHubListings();
}

/** @deprecated Use fetchExploreHubVendors */
export async function fetchExploreVendors(): Promise<ExploreVendor[]> {
  return fetchExploreHubVendors();
}

/** Vendors that list this category (same query as the website). */
export async function fetchVendorsByCategorySlug(slug: string): Promise<ExploreVendor[]> {
  const canonical = resolveCategorySlug(slug);
  const slugsToQuery = categorySlugsForQuery(canonical);
  const byId = new Map<string, ExploreVendor>();

  await Promise.all(
    slugsToQuery.map(async (s) => {
      const snap = await getDocs(
        query(collection(db, 'vendors'), where('category', 'array-contains', s)),
      );
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        if (data.deactivated === true) continue;
        byId.set(d.id, mapVendorDoc(d.id, data));
      }
    }),
  );

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterListingsBySearch(
  listings: ExploreListing[],
  search: string,
): ExploreListing[] {
  const q = search.trim().toLowerCase();
  if (q.length < 2) return listings;
  return listings.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.vendorName.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q),
  );
}

export function filterVendorsBySearch(
  vendors: ExploreVendor[],
  search: string,
): ExploreVendor[] {
  const q = search.trim().toLowerCase();
  if (q.length < 2) return vendors;
  return vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      (v.city ?? '').toLowerCase().includes(q) ||
      v.categories.some((c) => c.toLowerCase().includes(q)),
  );
}

export function formatListingPrice(listing: ExploreListing): string {
  if (typeof listing.price !== 'number' || listing.price <= 0) return '';
  const code = (listing.currency ?? 'GHS').toUpperCase();
  if (code === 'GHS') return `₵${listing.price}`;
  return `${code} ${listing.price}`;
}

/** Kept for any Phase 4a callers / refresh paths. */
export async function fetchExploreListingsPreview(max = 24): Promise<ExploreListing[]> {
  const rows = await fetchExploreHubListings();
  return rows.slice(0, max);
}

export type ExploreListingDetail = ExploreListing & {
  description: string;
  type: 'product' | 'service';
  imageUrls: string[];
  categorySlug?: string;
  categoryTitle?: string;
};

export type ExploreVendorDetail = ExploreVendor & {
  description: string;
  coverUrl: string;
  whatsapp?: string;
  phone?: string;
  showWhatsappPublic?: boolean;
  rating: number;
  reviewCount: number;
  locationLabel?: string;
};

/** Single listing page — same collections as Explore cards. */
export async function fetchListingById(id: string): Promise<ExploreListingDetail | null> {
  const snap = await getDoc(doc(db, 'listings', id));
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.isActive === false) return null;

  const images = Array.isArray(data.images) ? data.images : [];
  const imageUrls = images
    .map((img) => (img != null ? resolveStorageImageUrl(String(img)) : ''))
    .filter(Boolean);

  const base = mapListingDoc(snap.id, data);
  const [enriched] = await enrichListings([base]);
  if (!enriched) return null;

  const categorySlug = listingCategorySlug(data);
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;

  return {
    ...enriched,
    description: String(data.description ?? ''),
    type: data.type === 'service' ? 'service' : 'product',
    imageUrls: imageUrls.length ? imageUrls : enriched.imageUrl ? [enriched.imageUrl] : [],
    categorySlug: category?.slug,
    categoryTitle: category?.title,
  };
}

export async function fetchVendorById(id: string): Promise<ExploreVendorDetail | null> {
  const snap = await getDoc(doc(db, 'vendors', id));
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.deactivated === true) return null;

  const loc = locationFromDoc(data);
  const images =
    data.images && typeof data.images === 'object' && !Array.isArray(data.images)
      ? (data.images as Record<string, unknown>)
      : {};
  const contact =
    data.contact && typeof data.contact === 'object' && !Array.isArray(data.contact)
      ? (data.contact as Record<string, unknown>)
      : {};
  const categories = Array.isArray(data.category)
    ? data.category.map((c) => String(c))
    : typeof data.category === 'string'
      ? [data.category]
      : [];
  const city = typeof loc.city === 'string' ? loc.city : undefined;
  const area = typeof loc.area === 'string' ? loc.area : undefined;
  const whatsapp =
    contact.showWhatsappPublic === false
      ? undefined
      : typeof contact.whatsapp === 'string' && contact.whatsapp.trim()
        ? contact.whatsapp.trim()
        : undefined;
  const phone =
    typeof contact.phone === 'string' && contact.phone.trim()
      ? contact.phone.trim()
      : undefined;

  return {
    id: snap.id,
    name: String(data.businessName ?? 'Vendor'),
    avatarUrl: vendorAvatarFromDoc(data),
    verified: data.verified === true,
    foundingMember: data.foundingMember === true,
    city,
    country: typeof loc.country === 'string' ? loc.country.trim() : undefined,
    categories,
    description: String(data.description ?? data.about ?? ''),
    coverUrl: resolveStorageImageUrl(
      typeof images.cover === 'string' ? images.cover : '',
    ),
    whatsapp,
    phone,
    showWhatsappPublic: contact.showWhatsappPublic !== false,
    rating: typeof data.rating === 'number' ? data.rating : Number(data.rating ?? 0) || 0,
    reviewCount:
      typeof data.reviewCount === 'number'
        ? data.reviewCount
        : Number(data.reviewCount ?? 0) || 0,
    locationLabel: [area, city].filter(Boolean).join(' ') || undefined,
  };
}

export async function fetchListingsByVendorId(vendorId: string): Promise<ExploreListing[]> {
  const snap = await getDocs(
    query(
      collection(db, 'listings'),
      where('vendorId', '==', vendorId),
      where('isActive', '==', true),
    ),
  );
  const rows = snap.docs.map((d) => mapListingDoc(d.id, d.data() as Record<string, unknown>));
  return enrichListings(rows);
}
