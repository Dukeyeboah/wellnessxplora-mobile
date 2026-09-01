import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { fetchListingById, fetchVendorById } from '@/lib/listings';
import { resolveStorageImageUrl } from '@/lib/storage-url';

function requireAuthUid(expectedUserId?: string): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to use favorites.');
  if (expectedUserId != null && expectedUserId !== uid) {
    throw new Error('Session mismatch. Please sign in again.');
  }
  return uid;
}

export interface BookmarkList {
  id: string;
  userId: string;
  name: string;
  group: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorBookmark {
  id: string;
  userId: string;
  listId: string;
  vendorId: string;
  vendorName: string;
  category: string;
  categorySlug: string;
  location: string;
  imageUrl?: string;
  verified?: boolean;
  foundingMember?: boolean;
  createdAt: Date;
}

export interface VendorBookmarkInput {
  vendorId: string;
  vendorName: string;
  category: string;
  categorySlug: string;
  location: string;
  imageUrl?: string;
  verified?: boolean;
  foundingMember?: boolean;
}

export interface ListingBookmark {
  id: string;
  userId: string;
  listId: string;
  listingId: string;
  vendorId: string;
  listingTitle: string;
  listingType: 'product' | 'service';
  vendorName: string;
  category: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  createdAt: Date;
  description?: string;
  vendorAvatarUrl?: string;
  foundingMember?: boolean;
}

export interface ListingBookmarkInput {
  listingId: string;
  vendorId: string;
  listingTitle: string;
  listingType: 'product' | 'service';
  vendorName: string;
  category: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
}

export const DEFAULT_LIST_NAME = 'Saved vendors';
export const DEFAULT_LIST_GROUP = 'General';
export const BOOKMARK_LIST_GROUPS = ['General', 'Trips', 'Favourites', 'Research', 'Other'] as const;

function bookmarkDocId(listId: string, vendorId: string): string {
  return `${listId}_${vendorId}`;
}

function listingBookmarkDocId(listId: string, listingId: string): string {
  return `${listId}_${listingId}`;
}

function tsToDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export async function fetchBookmarkLists(userId: string): Promise<BookmarkList[]> {
  const uid = requireAuthUid(userId);
  const q = query(collection(db, 'bookmark_lists'), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        userId: String(x.userId ?? ''),
        name: String(x.name ?? ''),
        group: String(x.group ?? DEFAULT_LIST_GROUP),
        createdAt: tsToDate(x.createdAt),
        updatedAt: tsToDate(x.updatedAt),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchUserBookmarks(userId: string): Promise<VendorBookmark[]> {
  const uid = requireAuthUid(userId);
  const q = query(collection(db, 'bookmarks'), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        userId: String(x.userId ?? ''),
        listId: String(x.listId ?? ''),
        vendorId: String(x.vendorId ?? ''),
        vendorName: String(x.vendorName ?? ''),
        category: String(x.category ?? ''),
        categorySlug: String(x.categorySlug ?? ''),
        location: String(x.location ?? ''),
        imageUrl: String(x.imageUrl ?? '').trim() || undefined,
        verified: typeof x.verified === 'boolean' ? x.verified : undefined,
        foundingMember: typeof x.foundingMember === 'boolean' ? x.foundingMember : undefined,
        createdAt: tsToDate(x.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function fetchUserListingBookmarks(userId: string): Promise<ListingBookmark[]> {
  const uid = requireAuthUid(userId);
  const q = query(collection(db, 'listing_bookmarks'), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        userId: String(x.userId ?? ''),
        listId: String(x.listId ?? ''),
        listingId: String(x.listingId ?? ''),
        vendorId: String(x.vendorId ?? ''),
        listingTitle: String(x.listingTitle ?? ''),
        listingType: (x.listingType === 'product' ? 'product' : 'service') as 'product' | 'service',
        vendorName: String(x.vendorName ?? ''),
        category: String(x.category ?? ''),
        price: typeof x.price === 'number' ? x.price : undefined,
        currency: x.currency ? String(x.currency) : undefined,
        imageUrl: x.imageUrl ? resolveStorageImageUrl(String(x.imageUrl)) : undefined,
        createdAt: tsToDate(x.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function ensureDefaultBookmarkList(
  userId: string,
): Promise<{ defaultList: BookmarkList; lists: BookmarkList[] }> {
  const lists = await fetchBookmarkLists(userId);
  const existing = lists.find((l) => l.name === DEFAULT_LIST_NAME);
  if (existing) return { defaultList: existing, lists };

  const uid = requireAuthUid(userId);
  const ref = await addDoc(collection(db, 'bookmark_lists'), {
    userId: uid,
    name: DEFAULT_LIST_NAME,
    group: DEFAULT_LIST_GROUP,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const defaultList: BookmarkList = {
    id: ref.id,
    userId: uid,
    name: DEFAULT_LIST_NAME,
    group: DEFAULT_LIST_GROUP,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { defaultList, lists: [...lists, defaultList].sort((a, b) => a.name.localeCompare(b.name)) };
}

export async function createBookmarkList(
  userId: string,
  name: string,
  group: string,
): Promise<BookmarkList> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('List name is required');
  const uid = requireAuthUid(userId);
  const ref = await addDoc(collection(db, 'bookmark_lists'), {
    userId: uid,
    name: trimmed,
    group: group.trim() || DEFAULT_LIST_GROUP,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    id: ref.id,
    userId: uid,
    name: trimmed,
    group: group.trim() || DEFAULT_LIST_GROUP,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function addVendorBookmark(
  userId: string,
  listId: string,
  vendor: VendorBookmarkInput,
): Promise<VendorBookmark> {
  const uid = requireAuthUid(userId);
  const id = bookmarkDocId(listId, vendor.vendorId);
  const saved = await fetchUserBookmarks(uid);
  if (saved.some((b) => b.listId === listId && b.vendorId === vendor.vendorId)) {
    throw new Error('This vendor is already in that list.');
  }
  await setDoc(doc(db, 'bookmarks', id), {
    userId: uid,
    listId,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    category: vendor.category,
    categorySlug: vendor.categorySlug,
    location: vendor.location,
    imageUrl: String(vendor.imageUrl ?? '').trim(),
    verified: vendor.verified === true,
    foundingMember: vendor.foundingMember === true,
    createdAt: serverTimestamp(),
  });
  return {
    id,
    userId: uid,
    listId,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    category: vendor.category,
    categorySlug: vendor.categorySlug,
    location: vendor.location,
    imageUrl: vendor.imageUrl,
    createdAt: new Date(),
  };
}

export async function removeVendorBookmark(bookmarkId: string, userId: string): Promise<void> {
  const ref = doc(db, 'bookmarks', bookmarkId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data()?.userId !== userId) return;
  await deleteDoc(ref);
}

export async function addListingBookmark(
  userId: string,
  listId: string,
  listing: ListingBookmarkInput,
): Promise<ListingBookmark> {
  const uid = requireAuthUid(userId);
  const id = listingBookmarkDocId(listId, listing.listingId);
  const saved = await fetchUserListingBookmarks(uid);
  if (saved.some((b) => b.listId === listId && b.listingId === listing.listingId)) {
    throw new Error('This offering is already in that list.');
  }
  await setDoc(doc(db, 'listing_bookmarks', id), {
    userId: uid,
    listId,
    listingId: listing.listingId,
    vendorId: listing.vendorId,
    listingTitle: listing.listingTitle,
    listingType: listing.listingType,
    vendorName: listing.vendorName,
    category: listing.category,
    price: listing.price ?? null,
    currency: String(listing.currency ?? ''),
    imageUrl: String(listing.imageUrl ?? ''),
    createdAt: serverTimestamp(),
  });
  return {
    id,
    userId: uid,
    listId,
    listingId: listing.listingId,
    vendorId: listing.vendorId,
    listingTitle: listing.listingTitle,
    listingType: listing.listingType,
    vendorName: listing.vendorName,
    category: listing.category,
    price: listing.price,
    currency: listing.currency,
    imageUrl: listing.imageUrl,
    createdAt: new Date(),
  };
}

export async function removeListingBookmark(bookmarkId: string, userId: string): Promise<void> {
  const ref = doc(db, 'listing_bookmarks', bookmarkId);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data()?.userId !== userId) return;
  await deleteDoc(ref);
}

export async function isVendorBookmarked(
  userId: string,
  vendorId: string,
): Promise<{ bookmarked: boolean; bookmarkId?: string }> {
  const all = await fetchUserBookmarks(userId);
  const hit = all.find((b) => b.vendorId === vendorId);
  if (!hit) return { bookmarked: false };
  return { bookmarked: true, bookmarkId: hit.id };
}

export async function isListingBookmarked(
  userId: string,
  listingId: string,
): Promise<{ bookmarked: boolean; bookmarkId?: string }> {
  const all = await fetchUserListingBookmarks(userId);
  const hit = all.find((b) => b.listingId === listingId);
  if (!hit) return { bookmarked: false };
  return { bookmarked: true, bookmarkId: hit.id };
}

export async function enrichVendorBookmarks(bookmarks: VendorBookmark[]): Promise<VendorBookmark[]> {
  return Promise.all(
    bookmarks.map(async (b) => {
      if (b.imageUrl?.trim()) return b;
      try {
        const vendor = await fetchVendorById(b.vendorId);
        if (!vendor) return b;
        return {
          ...b,
          imageUrl: vendor.avatarUrl || b.imageUrl,
          verified: vendor.verified,
          foundingMember: vendor.foundingMember,
        };
      } catch {
        return b;
      }
    }),
  );
}

export async function enrichListingBookmarks(
  bookmarks: ListingBookmark[],
): Promise<ListingBookmark[]> {
  return Promise.all(
    bookmarks.map(async (b) => {
      try {
        const listing = await fetchListingById(b.listingId);
        if (!listing) return b;
        return {
          ...b,
          description: listing.description,
          imageUrl: b.imageUrl || listing.imageUrl,
          price: b.price ?? listing.price,
          currency: b.currency || listing.currency,
          vendorAvatarUrl: listing.vendorAvatarUrl,
        };
      } catch {
        return b;
      }
    }),
  );
}

export async function deleteBookmarkList(listId: string, userId: string): Promise<void> {
  const listRef = doc(db, 'bookmark_lists', listId);
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists() || listSnap.data()?.userId !== userId) {
    throw new Error('List not found.');
  }
  const [vendorBookmarks, listingBookmarks] = await Promise.all([
    fetchUserBookmarks(userId),
    fetchUserListingBookmarks(userId),
  ]);
  for (const b of vendorBookmarks.filter((x) => x.listId === listId)) {
    await deleteDoc(doc(db, 'bookmarks', b.id));
  }
  for (const b of listingBookmarks.filter((x) => x.listId === listId)) {
    await deleteDoc(doc(db, 'listing_bookmarks', b.id));
  }
  await deleteDoc(listRef);
}
