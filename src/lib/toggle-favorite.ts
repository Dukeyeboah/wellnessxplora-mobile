import type { Router } from 'expo-router';

import {
  addListingBookmark,
  addVendorBookmark,
  ensureDefaultBookmarkList,
  isListingBookmarked,
  isVendorBookmarked,
  removeListingBookmark,
  removeVendorBookmark,
  type ListingBookmarkInput,
  type VendorBookmarkInput,
} from '@/lib/bookmarks';
import { requireAuth } from '@/lib/require-auth';

export async function toggleListingFavorite(
  isSignedIn: boolean,
  router: Router,
  userId: string,
  input: ListingBookmarkInput,
): Promise<boolean> {
  if (!requireAuth(isSignedIn, router, 'favorite')) return false;

  const status = await isListingBookmarked(userId, input.listingId);
  if (status.bookmarked && status.bookmarkId) {
    await removeListingBookmark(status.bookmarkId, userId);
    return false;
  }

  const { defaultList } = await ensureDefaultBookmarkList(userId);
  await addListingBookmark(userId, defaultList.id, input);
  return true;
}

export async function toggleVendorFavorite(
  isSignedIn: boolean,
  router: Router,
  userId: string,
  input: VendorBookmarkInput,
): Promise<boolean> {
  if (!requireAuth(isSignedIn, router, 'favorite')) return false;

  const status = await isVendorBookmarked(userId, input.vendorId);
  if (status.bookmarked && status.bookmarkId) {
    await removeVendorBookmark(status.bookmarkId, userId);
    return false;
  }

  const { defaultList } = await ensureDefaultBookmarkList(userId);
  await addVendorBookmark(userId, defaultList.id, input);
  return true;
}

export async function getListingFavoriteState(
  userId: string | undefined,
  listingId: string,
): Promise<boolean> {
  if (!userId) return false;
  const status = await isListingBookmarked(userId, listingId);
  return status.bookmarked;
}

export async function getVendorFavoriteState(
  userId: string | undefined,
  vendorId: string,
): Promise<boolean> {
  if (!userId) return false;
  const status = await isVendorBookmarked(userId, vendorId);
  return status.bookmarked;
}
