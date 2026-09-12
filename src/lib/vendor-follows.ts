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
