import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  deleteField,
  type Timestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { resolveStorageImageUrl } from '@/lib/storage-url';

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'explorer' | 'vendor';
  profileComplete: boolean;
  createdAt?: Date;
  location: string;
  photoURL?: string;
  bannerURL?: string;
  authProvider?: string;
  deactivated?: boolean;
};

export type AdminVendorRow = {
  id: string;
  businessName: string;
  verified: boolean;
  foundingMember: boolean;
  categories: string[];
  ownerEmail?: string;
  ownerName?: string;
  logoUrl?: string;
  coverUrl?: string;
  ownerId?: string;
  ownerPhotoURL?: string;
  deactivated?: boolean;
};

function tsToDate(value: Timestamp | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

export type AdminStats = {
  totalUsers: number;
  explorers: number;
  vendors: number;
  vendorProfiles: number;
  verifiedVendors: number;
  pendingVerifications: number;
  activeListings: number;
  totalBookmarks: number;
};

export type AdminVerificationRow = {
  id: string;
  vendorId: string;
  businessName: string;
  status: string;
  ownerEmail?: string;
  ownerName?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  denialReason?: string;
};

function normalizeVerificationStatus(raw: unknown): string {
  if (raw === 'pending') return 'pending_review';
  if (raw === 'denied') return 'rejected';
  if (raw === 'approved' || raw === 'rejected' || raw === 'pending_review') {
    return raw;
  }
  return 'pending_review';
}

export function isPendingVerificationStatus(status: string): boolean {
  return status === 'pending' || status === 'pending_review';
}

async function mapVerificationDoc(
  id: string,
  data: Record<string, unknown>,
): Promise<AdminVerificationRow> {
  const vendorId = String(data.vendorId ?? id);
  let businessName = String(data.businessName ?? '');
  if (!businessName) {
    const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));
    if (vendorSnap.exists()) {
      businessName = String(vendorSnap.data()?.businessName ?? 'Vendor');
    }
  }
  return {
    id,
    vendorId,
    businessName,
    status: normalizeVerificationStatus(data.status),
    ownerEmail: data.ownerEmail ? String(data.ownerEmail) : undefined,
    ownerName: data.ownerName ? String(data.ownerName) : undefined,
    submittedAt: tsToDate(data.submittedAt as Timestamp | Date | undefined),
    reviewedAt: tsToDate(data.reviewedAt as Timestamp | Date | undefined),
    denialReason: data.denialReason ? String(data.denialReason) : undefined,
  };
}

export async function fetchAllVerifications(): Promise<AdminVerificationRow[]> {
  const snap = await getDocs(collection(db, 'verification_applications'));
  const rows = await Promise.all(
    snap.docs.map((d) => mapVerificationDoc(d.id, d.data() as Record<string, unknown>)),
  );
  return rows.sort((a, b) => {
    const aPending = isPendingVerificationStatus(a.status) ? 0 : 1;
    const bPending = isPendingVerificationStatus(b.status) ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0);
  });
}

export async function fetchPendingVerifications(): Promise<AdminVerificationRow[]> {
  const all = await fetchAllVerifications();
  return all.filter((row) => isPendingVerificationStatus(row.status));
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const [
    usersSnap,
    explorersSnap,
    vendorsRoleSnap,
    vendorDocsSnap,
    verifiedSnap,
    pendingSnap,
    listingsSnap,
    bookmarksSnap,
  ] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'explorer'))),
    getCountFromServer(query(collection(db, 'users'), where('role', '==', 'vendor'))),
    getCountFromServer(collection(db, 'vendors')),
    getCountFromServer(query(collection(db, 'vendors'), where('verified', '==', true))),
    getCountFromServer(
      query(
        collection(db, 'verification_applications'),
        where('status', 'in', ['pending', 'pending_review']),
      ),
    ),
    getCountFromServer(query(collection(db, 'listings'), where('isActive', '==', true))),
    getCountFromServer(collection(db, 'bookmarks')),
  ]);

  return {
    totalUsers: usersSnap.data().count,
    explorers: explorersSnap.data().count,
    vendors: vendorsRoleSnap.data().count,
    vendorProfiles: vendorDocsSnap.data().count,
    verifiedVendors: verifiedSnap.data().count,
    pendingVerifications: pendingSnap.data().count,
    activeListings: listingsSnap.data().count,
    totalBookmarks: bookmarksSnap.data().count,
  };
}

export async function approveVerification(vendorId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'verification_applications', vendorId), {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    denialReason: deleteField(),
  });
  batch.update(doc(db, 'vendors', vendorId), { verified: true });
  await batch.commit();
}

export async function denyVerification(vendorId: string, denialReason: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'verification_applications', vendorId), {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    denialReason: denialReason.trim() || 'Application not approved at this time.',
  });
  batch.update(doc(db, 'vendors', vendorId), { verified: false });
  await batch.commit();
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const [userSnap, vendorSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'vendors')),
  ]);

  const vendorByOwner = new Map<
    string,
    { logo?: string; cover?: string; ownerPhotoURL?: string }
  >();
  for (const d of vendorSnap.docs) {
    const v = d.data() as {
      ownerId?: string;
      ownerPhotoURL?: string;
      images?: { logo?: string; cover?: string };
    };
    const ownerId = String(v.ownerId ?? d.id);
    const images = v.images ?? { logo: '', cover: '' };
    vendorByOwner.set(ownerId, {
      logo: images.logo ? String(images.logo) : undefined,
      cover: images.cover ? String(images.cover) : undefined,
      ownerPhotoURL: v.ownerPhotoURL ? String(v.ownerPhotoURL) : undefined,
    });
  }

  return userSnap.docs
    .map((d) => {
      const x = d.data() as Record<string, unknown>;
      const loc =
        x.location && typeof x.location === 'object' && !Array.isArray(x.location)
          ? (x.location as Record<string, unknown>)
          : {};
      const location = [loc.city, loc.country].filter(Boolean).join(', ');
      const vendorMedia = vendorByOwner.get(d.id);
      const photoURL =
        (x.photoURL ? resolveStorageImageUrl(String(x.photoURL)) : undefined) ||
        (vendorMedia?.ownerPhotoURL
          ? resolveStorageImageUrl(vendorMedia.ownerPhotoURL)
          : undefined) ||
        (vendorMedia?.logo ? resolveStorageImageUrl(vendorMedia.logo) : undefined);
      const bannerURL =
        (x.bannerURL ? resolveStorageImageUrl(String(x.bannerURL)) : undefined) ||
        (vendorMedia?.cover ? resolveStorageImageUrl(vendorMedia.cover) : undefined);
      const role: 'explorer' | 'vendor' = x.role === 'vendor' ? 'vendor' : 'explorer';
      return {
        id: d.id,
        name: String(x.name ?? ''),
        email: String(x.email ?? ''),
        username: x.username ? String(x.username) : undefined,
        role,
        profileComplete: x.profileComplete === true,
        createdAt: tsToDate(x.createdAt as Timestamp | Date | undefined),
        location,
        photoURL,
        bannerURL,
        authProvider: x.authProvider ? String(x.authProvider) : undefined,
        deactivated: x.deactivated === true,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchAdminVendors(): Promise<AdminVendorRow[]> {
  const [vendorSnap, userSnap] = await Promise.all([
    getDocs(collection(db, 'vendors')),
    getDocs(collection(db, 'users')),
  ]);
  const usersById = new Map(
    userSnap.docs.map((d) => [d.id, d.data() as Record<string, unknown>]),
  );

  return vendorSnap.docs
    .map((d) => {
      const v = d.data() as Record<string, unknown>;
      const ownerId = String(v.ownerId ?? d.id);
      const owner = usersById.get(ownerId);
      const images =
        v.images && typeof v.images === 'object' && !Array.isArray(v.images)
          ? (v.images as Record<string, unknown>)
          : {};
      const categories = Array.isArray(v.category) ? v.category.map(String) : [];
      return {
        id: d.id,
        businessName: String(v.businessName ?? ''),
        verified: v.verified === true,
        foundingMember: v.foundingMember === true,
        categories,
        ownerEmail: owner?.email ? String(owner.email) : undefined,
        ownerName: owner?.name ? String(owner.name) : undefined,
        logoUrl: images.logo ? resolveStorageImageUrl(String(images.logo)) : undefined,
        coverUrl: images.cover ? resolveStorageImageUrl(String(images.cover)) : undefined,
        ownerId,
        ownerPhotoURL: v.ownerPhotoURL
          ? resolveStorageImageUrl(String(v.ownerPhotoURL))
          : owner?.photoURL
            ? resolveStorageImageUrl(String(owner.photoURL))
            : undefined,
        deactivated: v.deactivated === true || owner?.deactivated === true,
      };
    })
    .sort((a, b) => a.businessName.localeCompare(b.businessName));
}
