import {
  addDoc,
  collection,
  deleteDoc,
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

export type DashboardListing = {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'service';
  price?: number;
  currency?: string;
  categorySlug?: string;
  categoryTitle?: string;
  imageUrl?: string;
  isActive: boolean;
  isAvailable: boolean;
  sortOrder?: number;
};

export type ListingDraftInput = {
  title: string;
  description: string;
  type: 'product' | 'service';
  categorySlug: string;
  price: string;
  currency: string;
  isActive: boolean;
  isAvailable: boolean;
};

export function createEmptyListingDraft(): ListingDraftInput {
  return {
    title: '',
    description: '',
    type: 'product',
    categorySlug: '',
    price: '',
    currency: 'GHS',
    isActive: true,
    isAvailable: true,
  };
}

function mapListingDoc(id: string, data: Record<string, unknown>): DashboardListing {
  const images = Array.isArray(data.images) ? data.images : [];
  const firstImage = images[0] != null ? resolveStorageImageUrl(String(images[0])) : '';
  const categorySlug = Array.isArray(data.categories)
    ? String(data.categories[0] ?? '')
    : typeof data.category === 'string'
      ? data.category
      : '';
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    type: data.type === 'service' ? 'service' : 'product',
    price: typeof data.price === 'number' ? data.price : undefined,
    currency: data.currency ? String(data.currency) : 'GHS',
    categorySlug: categorySlug || undefined,
    categoryTitle: category?.title,
    imageUrl: firstImage || undefined,
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

export async function createVendorListing(
  vendorId: string,
  draft: ListingDraftInput,
): Promise<string> {
  const price = Number(draft.price);
  const ref = await addDoc(collection(db, 'listings'), {
    vendorId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    type: draft.type,
    category: draft.categorySlug,
    categories: draft.categorySlug ? [draft.categorySlug] : [],
    price: Number.isFinite(price) && price > 0 ? price : 0,
    currency: draft.currency || 'GHS',
    images: [],
    isActive: draft.isActive,
    isAvailable: draft.isAvailable,
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
  const price = Number(draft.price);
  await updateDoc(doc(db, 'listings', listingId), {
    title: draft.title.trim(),
    description: draft.description.trim(),
    type: draft.type,
    category: draft.categorySlug,
    categories: draft.categorySlug ? [draft.categorySlug] : [],
    price: Number.isFinite(price) && price > 0 ? price : 0,
    currency: draft.currency || 'GHS',
    isActive: draft.isActive,
    isAvailable: draft.isAvailable,
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
  return {
    title: listing.title,
    description: listing.description,
    type: listing.type,
    categorySlug: listing.categorySlug ?? '',
    price: listing.price != null ? String(listing.price) : '',
    currency: listing.currency ?? 'GHS',
    isActive: listing.isActive,
    isAvailable: listing.isAvailable,
  };
}
