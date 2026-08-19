import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export function vendorReviewDocId(vendorId: string, userId: string): string {
  return `${vendorId}_${userId}`;
}

export type PublicVendorReview = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  reviewerName: string;
};

function tsMillis(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

export async function fetchVendorReviews(vendorId: string): Promise<PublicVendorReview[]> {
  const snap = await getDocs(query(collection(db, 'reviews'), where('vendorId', '==', vendorId)));
  return snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const n = typeof data.rating === 'number' ? data.rating : Number(data.rating);
      return {
        review: {
          id: d.id,
          userId: String(data.userId ?? ''),
          rating: Number.isFinite(n) ? n : 0,
          comment: String(data.comment ?? ''),
          reviewerName: String(data.reviewerName ?? data.reviewerUsername ?? 'Member').trim(),
        },
        sortTime: tsMillis(data.createdAt ?? data.updatedAt),
      };
    })
    .sort((a, b) => b.sortTime - a.sortTime)
    .map(({ review }) => review);
}

export async function getMyVendorReview(
  vendorId: string,
  userId: string,
): Promise<{ rating: number | null; comment: string }> {
  const snap = await getDoc(doc(db, 'reviews', vendorReviewDocId(vendorId, userId)));
  if (!snap.exists()) return { rating: null, comment: '' };
  const data = snap.data();
  const n = typeof data.rating === 'number' ? data.rating : Number(data.rating);
  return {
    rating: Number.isFinite(n) ? n : null,
    comment: String(data.comment ?? ''),
  };
}

export async function setMyVendorReview(input: {
  vendorId: string;
  userId: string;
  rating: number;
  comment: string;
  reviewerName: string;
}): Promise<{ rating: number; reviewCount: number }> {
  const ref = doc(db, 'reviews', vendorReviewDocId(input.vendorId, input.userId));
  const existing = await getDoc(ref);
  const payload = {
    vendorId: input.vendorId,
    userId: input.userId,
    rating: input.rating,
    comment: input.comment.trim().slice(0, 2000),
    reviewerName: input.reviewerName,
  };
  if (!existing.exists()) {
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
  } else {
    await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
  }

  const reviews = await fetchVendorReviews(input.vendorId);
  const ratings = reviews.map((row) => row.rating).filter((n) => n >= 1 && n <= 5);
  const reviewCount = ratings.length;
  const rating =
    reviewCount > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / reviewCount) * 10) / 10
      : 0;
  await updateDoc(doc(db, 'vendors', input.vendorId), { rating, reviewCount });
  return { rating, reviewCount };
}
