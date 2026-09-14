import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { resolveStorageImageUrl } from '@/lib/storage-url';

export type ConnectionVendor = {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
  mutual: boolean;
};

export function vendorFollowDocId(userId: string, vendorId: string): string {
  return `${userId}_${vendorId}`;
}

export async function isFollowingVendor(userId: string, vendorId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'vendor_follows', vendorFollowDocId(userId, vendorId)));
  return snap.exists();
}

export async function followVendor(userId: string, vendorId: string): Promise<void> {
  const id = vendorFollowDocId(userId, vendorId);
  await setDoc(doc(db, 'vendor_follows', id), {
    userId,
    vendorId,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowVendor(userId: string, vendorId: string): Promise<void> {
  await deleteDoc(doc(db, 'vendor_follows', vendorFollowDocId(userId, vendorId)));
}

export async function fetchFollowedVendorIds(userId: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, 'vendor_follows'), where('userId', '==', userId)),
  );
  return snap.docs.map((d) => String(d.data().vendorId ?? '')).filter(Boolean);
}

/** Users who connected to this vendor storefront. */
export async function fetchFollowerUserIds(vendorId: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, 'vendor_follows'), where('vendorId', '==', vendorId)),
  );
  return snap.docs.map((d) => String(d.data().userId ?? '')).filter(Boolean);
}

async function loadVendorCard(vendorId: string): Promise<Omit<ConnectionVendor, 'mutual'> | null> {
  const snap = await getDoc(doc(db, 'vendors', vendorId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const images =
    data.images && typeof data.images === 'object' && !Array.isArray(data.images)
      ? (data.images as Record<string, unknown>)
      : {};
  const logo = String(images.logo ?? data.ownerPhotoURL ?? '').trim();
  return {
    id: vendorId,
    name: String(data.businessName ?? 'Vendor'),
    avatarUrl: logo ? resolveStorageImageUrl(logo) || logo : '',
    verified: data.verified === true,
  };
}

/**
 * Vendors the viewer follows, with mutual = that vendor's owner also follows the viewer
 * (viewer must have a vendor storefront for mutual to be possible).
 */
export async function fetchFollowingConnections(
  userId: string,
  viewerIsVendor: boolean,
): Promise<ConnectionVendor[]> {
  const followingIds = await fetchFollowedVendorIds(userId);
  const rows: ConnectionVendor[] = [];

  await Promise.all(
    followingIds.map(async (vendorId) => {
      const card = await loadVendorCard(vendorId);
      if (!card) return;
      let mutual = false;
      if (viewerIsVendor && vendorId !== userId) {
        mutual = await isFollowingVendor(vendorId, userId);
      }
      rows.push({ ...card, mutual });
    }),
  );

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

/**
 * People who follow this vendor. Mutual = viewer also follows that person's vendor page
 * (only when the follower is themselves a vendor with the same uid).
 */
export async function fetchFollowerConnections(vendorId: string): Promise<ConnectionVendor[]> {
  const followerIds = await fetchFollowerUserIds(vendorId);
  const rows: ConnectionVendor[] = [];

  await Promise.all(
    followerIds.map(async (followerId) => {
      // Prefer their vendor card when they are a vendor; otherwise show user profile name.
      const vendorCard = await loadVendorCard(followerId);
      if (vendorCard) {
        const mutual = await isFollowingVendor(vendorId, followerId);
        rows.push({ ...vendorCard, mutual });
        return;
      }
      const userSnap = await getDoc(doc(db, 'users', followerId));
      if (!userSnap.exists()) return;
      const data = userSnap.data() as Record<string, unknown>;
      const photo = String(data.photoURL ?? '').trim();
      rows.push({
        id: followerId,
        name: String(data.name ?? 'Member'),
        avatarUrl: photo ? resolveStorageImageUrl(photo) || photo : '',
        verified: false,
        mutual: false,
      });
    }),
  );

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
