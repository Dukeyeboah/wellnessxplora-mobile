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
  HUB_CAROUSEL_CATEGORIES,
  hubCarouselTitle,
  resolveCategorySlug,
  shuffleArray,
  type ExploreCategory,
} from '@/lib/explore-categories';
import { db } from '@/lib/firebase';
import { resolveStorageImageUrl } from '@/lib/storage-url';

export type ExploreListing = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  imageUrl: string;
  vendorId: string;
  vendorName: string;
  vendorAvatarUrl: string;
  vendorVerified: boolean;
};

export type ExploreVendor = {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
  city?: string;
  categories: string[];
};

export type ExploreCarouselSection = {
  slug: string;
  title: string;
  subtitle: string;
  listings: ExploreListing[];
};

const HUB_CARD_LIMIT = 12;
const PRODUCTS_LIMIT = 40;
const VENDORS_LIMIT = 40;

type VendorMeta = {
  name: string;
  avatarUrl: string;
  verified: boolean;
};

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

function mapListingDoc(
  id: string,
  data: Record<string, unknown>,
): Omit<ExploreListing, 'vendorName' | 'vendorAvatarUrl' | 'vendorVerified'> {
  return {
    id,
    title: String(data.title ?? 'Untitled'),
    price: typeof data.price === 'number' ? data.price : undefined,
    currency: data.currency ? String(data.currency) : undefined,
    imageUrl: firstImageFromListing(data),
    vendorId: String(data.vendorId ?? ''),
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
        vendors.set(id, {
          name: String(data.businessName ?? 'Vendor'),
          avatarUrl: vendorAvatarFromDoc(data),
          verified: data.verified === true,
        });
      } catch {
        /* ignore */
      }
    }),
  );
  return vendors;
}

async function enrichListings(
  rows: Omit<ExploreListing, 'vendorName' | 'vendorAvatarUrl' | 'vendorVerified'>[],
): Promise<ExploreListing[]> {
  const vendorIds = [...new Set(rows.map((r) => r.vendorId).filter(Boolean))];
  const vendors = await loadVendorMeta(vendorIds);

  return rows
    .filter((row) => !row.vendorId || vendors.has(row.vendorId))
    .map((row) => {
      const vendor = row.vendorId ? vendors.get(row.vendorId) : undefined;
      return {
        ...row,
        vendorName: vendor?.name ?? 'Vendor',
        vendorAvatarUrl: vendor?.avatarUrl ?? '',
        vendorVerified: vendor?.verified ?? false,
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

/** “Products” tab — active listings (client search filters later). */
export async function fetchExploreProducts(
  max = PRODUCTS_LIMIT,
): Promise<ExploreListing[]> {
  const snap = await getDocs(
    query(collection(db, 'listings'), where('isActive', '==', true), limit(max)),
  );
  const rows = snap.docs.map((d) => mapListingDoc(d.id, d.data() as Record<string, unknown>));
  return enrichListings(rows);
}

/** “Vendors” tab — public vendor cards. */
export async function fetchExploreVendors(max = VENDORS_LIMIT): Promise<ExploreVendor[]> {
  const snap = await getDocs(query(collection(db, 'vendors'), limit(max)));
  const rows: ExploreVendor[] = [];

  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (data.deactivated === true) continue;
    const loc =
      data.location && typeof data.location === 'object' && !Array.isArray(data.location)
        ? (data.location as Record<string, unknown>)
        : {};
    const categories = Array.isArray(data.category)
      ? data.category.map((c) => String(c))
      : typeof data.category === 'string'
        ? [data.category]
        : [];

    rows.push({
      id: d.id,
      name: String(data.businessName ?? 'Vendor'),
      avatarUrl: vendorAvatarFromDoc(data),
      verified: data.verified === true,
      city: typeof loc.city === 'string' ? loc.city : undefined,
      categories,
    });
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name));
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
      l.vendorName.toLowerCase().includes(q),
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
  if (typeof listing.price !== 'number') return 'Price on request';
  const code = (listing.currency ?? 'GHS').toUpperCase();
  if (code === 'GHS') return `₵${listing.price}`;
  return `${code} ${listing.price}`;
}

/** Kept for any Phase 4a callers / refresh paths. */
export async function fetchExploreListingsPreview(max = 24): Promise<ExploreListing[]> {
  return fetchExploreProducts(max);
}
