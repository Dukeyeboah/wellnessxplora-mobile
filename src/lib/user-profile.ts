import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { UserRole } from '@/lib/auth-context';
import { resolveStorageImageUrl } from '@/lib/storage-url';

export type UserLocation = {
  country: string;
  city: string;
  area: string;
};

export type UserContact = {
  email?: string;
  phone?: string;
  whatsapp?: string;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL: string;
  bannerURL: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  interests: string[];
  location: UserLocation;
  contact: UserContact;
  profileComplete: boolean;
};

function roleFromDoc(data: Record<string, unknown>): UserRole {
  const role = data.role;
  if (role === 'vendor') return 'vendor';
  return 'explorer';
}

export function mapUserProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const loc =
    data.location && typeof data.location === 'object' && !Array.isArray(data.location)
      ? (data.location as Record<string, unknown>)
      : {};
  const contact =
    data.contact && typeof data.contact === 'object' && !Array.isArray(data.contact)
      ? (data.contact as Record<string, unknown>)
      : {};

  return {
    uid,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: roleFromDoc(data),
    photoURL: resolveStorageImageUrl(String(data.photoURL ?? '')),
    bannerURL: resolveStorageImageUrl(String(data.bannerURL ?? '')),
    username: data.username ? String(data.username) : undefined,
    firstName: data.firstName ? String(data.firstName) : undefined,
    lastName: data.lastName ? String(data.lastName) : undefined,
    interests: Array.isArray(data.interests) ? data.interests.map(String) : [],
    location: {
      country: String(loc.country ?? ''),
      city: String(loc.city ?? ''),
      area: String(loc.area ?? ''),
    },
    contact: {
      email: contact.email ? String(contact.email) : undefined,
      phone: contact.phone ? String(contact.phone) : undefined,
      whatsapp: contact.whatsapp ? String(contact.whatsapp) : undefined,
    },
    profileComplete: data.profileComplete === true,
  };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return mapUserProfile(uid, snap.data() as Record<string, unknown>);
}

export type ExplorerProfilePatch = {
  name: string;
  firstName?: string;
  lastName?: string;
  interests: string[];
  location: UserLocation;
  contact: UserContact;
  photoURL?: string;
};

export async function updateExplorerProfile(uid: string, patch: ExplorerProfilePatch): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    name: patch.name.trim(),
    firstName: patch.firstName?.trim() ?? '',
    lastName: patch.lastName?.trim() ?? '',
    interests: patch.interests,
    location: patch.location,
    contact: patch.contact,
    ...(patch.photoURL != null ? { photoURL: patch.photoURL } : {}),
    profileComplete: true,
    updatedAt: serverTimestamp(),
  });
}

export type VendorProfileDoc = {
  businessName: string;
  description: string;
  categorySlugs: string[];
  location: UserLocation;
  contact: UserContact & {
    contactPersonName?: string;
    showWhatsappPublic?: boolean;
    showPhonePublic?: boolean;
    showEmailPublic?: boolean;
  };
  logoUrl: string;
  coverUrl: string;
  slug?: string;
  verified: boolean;
  foundingMember: boolean;
};

export async function fetchVendorProfileDoc(vendorId: string): Promise<VendorProfileDoc | null> {
  const snap = await getDoc(doc(db, 'vendors', vendorId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const loc =
    data.location && typeof data.location === 'object' && !Array.isArray(data.location)
      ? (data.location as Record<string, unknown>)
      : {};
  const contact =
    data.contact && typeof data.contact === 'object' && !Array.isArray(data.contact)
      ? (data.contact as Record<string, unknown>)
      : {};
  const images =
    data.images && typeof data.images === 'object' && !Array.isArray(data.images)
      ? (data.images as Record<string, unknown>)
      : {};
  const categories = Array.isArray(data.category) ? data.category.map(String) : [];

  return {
    businessName: String(data.businessName ?? ''),
    description: String(data.description ?? ''),
    categorySlugs: categories,
    location: {
      country: String(loc.country ?? ''),
      city: String(loc.city ?? ''),
      area: String(loc.area ?? ''),
    },
    contact: {
      email: contact.email ? String(contact.email) : undefined,
      phone: contact.phone ? String(contact.phone) : undefined,
      whatsapp: contact.whatsapp ? String(contact.whatsapp) : undefined,
      contactPersonName: contact.contactPersonName
        ? String(contact.contactPersonName)
        : undefined,
      showWhatsappPublic: contact.showWhatsappPublic !== false,
      showPhonePublic: contact.showPhonePublic === true,
      showEmailPublic: contact.showEmailPublic === true,
    },
    logoUrl: resolveStorageImageUrl(String(images.logo ?? '')),
    coverUrl: resolveStorageImageUrl(String(images.cover ?? '')),
    slug: data.slug ? String(data.slug) : undefined,
    verified: data.verified === true,
    foundingMember: data.foundingMember === true,
  };
}

export type VendorProfilePatch = {
  businessName: string;
  description: string;
  categorySlugs: string[];
  location: UserLocation;
  contact: UserContact & {
    contactPersonName?: string;
    showWhatsappPublic?: boolean;
    showPhonePublic?: boolean;
    showEmailPublic?: boolean;
  };
  logoPath?: string;
  coverPath?: string;
};

export async function updateVendorProfile(
  vendorId: string,
  uid: string,
  patch: VendorProfilePatch,
): Promise<void> {
  const vendorRef = doc(db, 'vendors', vendorId);
  const existingSnap = await getDoc(vendorRef);
  const existingImages =
    existingSnap.exists() &&
    existingSnap.data()?.images &&
    typeof existingSnap.data()?.images === 'object'
      ? (existingSnap.data()?.images as Record<string, unknown>)
      : {};

  const vendorUpdate: Record<string, unknown> = {
    businessName: patch.businessName.trim(),
    description: patch.description.trim(),
    category: patch.categorySlugs,
    location: patch.location,
    contact: patch.contact,
    updatedAt: serverTimestamp(),
  };

  if (patch.logoPath != null || patch.coverPath != null) {
    vendorUpdate.images = {
      logo: patch.logoPath ?? String(existingImages.logo ?? ''),
      cover: patch.coverPath ?? String(existingImages.cover ?? ''),
    };
  }

  await updateDoc(vendorRef, vendorUpdate);

  await updateDoc(doc(db, 'users', uid), {
    name: patch.businessName.trim(),
    updatedAt: serverTimestamp(),
  });
}
