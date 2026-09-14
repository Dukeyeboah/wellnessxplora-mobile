import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { resolveStorageImageUrl } from '@/lib/storage-url';
import { getCategoryBySlug } from '@/lib/explore-categories';

export const MAX_LISTING_CATEGORIES = 4;
export const MAX_PRODUCT_LISTING_IMAGES = 1;
export const MAX_SERVICE_LISTING_IMAGES = 5;

export function maxImagesForListingType(type: 'product' | 'service'): number {
  return type === 'service' ? MAX_SERVICE_LISTING_IMAGES : MAX_PRODUCT_LISTING_IMAGES;
}

export type DashboardListing = {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'service';
  price?: number;
  compareAtPrice?: number;
  currency?: string;
  categorySlug?: string;
  categorySlugs: string[];
  categoryTitle?: string;
  imageUrl?: string;
  imageUrls: string[];
  /** Raw storage paths as stored in Firestore `images`. */
  imagePaths: string[];
  isActive: boolean;
  isAvailable: boolean;
  sortOrder?: number;
};

export type ListingDraftInput = {
  title: string;
  description: string;
  type: 'product' | 'service';
  categorySlugs: string[];
  /** Original / listing price shown in the form. */
  price: string;
  discountPrice: string;
  offerDiscount: boolean;
  currency: string;
  isActive: boolean;
  isAvailable: boolean;
};

export function createEmptyListingDraft(): ListingDraftInput {
  return {
    title: '',
    description: '',
    type: 'product',
    categorySlugs: [],
    price: '',
    discountPrice: '',
    offerDiscount: false,
    currency: 'GHS',
    isActive: true,
    isAvailable: true,
  };
}

export function parsePriceField(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function validateListingPrices(
  listingPrice: number,
  discountPrice?: number,
  offerDiscount?: boolean,
): string | null {
  if (!offerDiscount) return null;
  if (listingPrice <= 0) return 'Enter a listing price.';
  if (discountPrice == null || discountPrice <= 0) return 'Enter a discount price.';
  if (discountPrice >= listingPrice) return 'Discount price must be lower than the listing price.';
  return null;
}

export function firestorePricesFromDraft(
  listingPrice: number,
  discountPrice: number,
  offerDiscount: boolean,
): { price: number; compareAtPrice?: number } {
  if (offerDiscount && discountPrice > 0 && listingPrice > discountPrice) {
    return { price: discountPrice, compareAtPrice: listingPrice };
  }
  return { price: listingPrice > 0 ? listingPrice : 0 };
}

function mapListingDoc(id: string, data: Record<string, unknown>): DashboardListing {
  const images = Array.isArray(data.images) ? data.images.map((x) => String(x)) : [];
  const imageUrls = images
    .map((path) => resolveStorageImageUrl(path) || path)
    .filter(Boolean);
  const categorySlugs = Array.isArray(data.categories)
    ? data.categories.map((c) => String(c)).filter(Boolean)
    : typeof data.category === 'string' && data.category
      ? [data.category]
      : [];
  const categorySlug = categorySlugs[0] ?? '';
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;
  const compareAt =
    typeof data.compareAtPrice === 'number' ? data.compareAtPrice : undefined;
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    type: data.type === 'service' ? 'service' : 'product',
    price: typeof data.price === 'number' ? data.price : undefined,
    compareAtPrice: compareAt,
    currency: data.currency ? String(data.currency) : 'GHS',
    categorySlug: categorySlug || undefined,
    categorySlugs,
    categoryTitle: category?.title,
    imageUrl: imageUrls[0],
    imageUrls,
    imagePaths: images,
    isActive: data.isActive !== false,
    isAvailable: data.isAvailable !== false,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
  };
}

export async function fetchVendorListings(vendorId: string): Promise<DashboardListing[]> {
  const q = query(collection(db, 'listings'), where('vendorId', '==', vendorId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapListingDoc(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title));
}

function draftToFirestoreFields(draft: ListingDraftInput, mode: 'create' | 'update') {
  const listingPrice = parsePriceField(draft.price);
  const discountPrice = parsePriceField(draft.discountPrice);
  const prices = firestorePricesFromDraft(listingPrice, discountPrice, draft.offerDiscount);
  const slugs = draft.categorySlugs.slice(0, MAX_LISTING_CATEGORIES);
  const base = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    type: draft.type,
    category: slugs[0] ?? '',
    categories: slugs,
    price: prices.price,
    currency: draft.currency || 'GHS',
    isActive: draft.isActive,
    isAvailable: draft.isAvailable,
  };
  if (prices.compareAtPrice != null) {
    return { ...base, compareAtPrice: prices.compareAtPrice };
  }
  if (mode === 'create') return base;
  return { ...base, compareAtPrice: deleteField() };
}

export async function createVendorListing(
  vendorId: string,
  draft: ListingDraftInput,
  options?: { location?: { country: string; city: string; area: string } },
): Promise<string> {
  const fields = draftToFirestoreFields(draft, 'create');
  const ref = await addDoc(collection(db, 'listings'), {
    vendorId,
    ...fields,
    images: [],
    ...(options?.location ? { location: options.location } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateVendorListingImages(
  listingId: string,
  vendorId: string,
  imagePaths: string[],
): Promise<void> {
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists() || snap.data()?.vendorId !== vendorId) {
    throw new Error('Listing not found.');
  }
  await updateDoc(doc(db, 'listings', listingId), {
    images: imagePaths,
    updatedAt: serverTimestamp(),
  });
}

export async function updateVendorListing(
  listingId: string,
  vendorId: string,
  draft: ListingDraftInput,
): Promise<void> {
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists() || snap.data()?.vendorId !== vendorId) {
    throw new Error('Listing not found.');
  }
  const fields = draftToFirestoreFields(draft, 'update');
  await updateDoc(doc(db, 'listings', listingId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVendorListing(listingId: string, vendorId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists() || snap.data()?.vendorId !== vendorId) {
    throw new Error('Listing not found.');
  }
  await deleteDoc(doc(db, 'listings', listingId));
}

export async function toggleListingActive(
  listingId: string,
  vendorId: string,
  isActive: boolean,
): Promise<void> {
  const snap = await getDoc(doc(db, 'listings', listingId));
  if (!snap.exists() || snap.data()?.vendorId !== vendorId) return;
  await updateDoc(doc(db, 'listings', listingId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
}

export function listingToDraftInput(listing: DashboardListing): ListingDraftInput {
  const hasCompare =
    listing.compareAtPrice != null &&
    listing.compareAtPrice > 0 &&
    listing.price != null &&
    listing.compareAtPrice > listing.price;
  return {
    title: listing.title,
    description: listing.description,
    type: listing.type,
    categorySlugs: listing.categorySlugs.length
      ? listing.categorySlugs
      : listing.categorySlug
        ? [listing.categorySlug]
        : [],
    // When discounted, Firestore price is the sale price and compareAt is original.
    price: hasCompare
      ? String(listing.compareAtPrice)
      : listing.price != null
        ? String(listing.price)
        : '',
    discountPrice: hasCompare && listing.price != null ? String(listing.price) : '',
    offerDiscount: Boolean(hasCompare),
    currency: listing.currency ?? 'GHS',
    isActive: listing.isActive,
    isAvailable: listing.isAvailable,
  };
}
