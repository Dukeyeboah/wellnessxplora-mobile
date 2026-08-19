import {
  addDoc,
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

export type ListingCommentRow = {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: Date;
};

export type ListingRatingStats = {
  avg: number;
  count: number;
};

export function listingRatingDocId(listingId: string, userId: string): string {
  return `${listingId}_${userId}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function loadListingRatingStats(
  listingIds: string[],
): Promise<Map<string, ListingRatingStats>> {
  const stats = new Map<string, ListingRatingStats>();
  const ids = [...new Set(listingIds.filter(Boolean))];
  if (ids.length === 0) return stats;

  await Promise.all(
    chunk(ids, 10).map(async (group) => {
      const snap = await getDocs(
        query(collection(db, 'listing_ratings'), where('listingId', 'in', group)),
      );
      const sums = new Map<string, { sum: number; count: number }>();
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        const listingId = String(data.listingId ?? '');
        const rating = Number(data.rating);
        if (!listingId || !Number.isFinite(rating)) continue;
        const prev = sums.get(listingId) ?? { sum: 0, count: 0 };
        sums.set(listingId, { sum: prev.sum + rating, count: prev.count + 1 });
      }
      for (const [listingId, row] of sums) {
        stats.set(listingId, {
          avg: row.count > 0 ? row.sum / row.count : 0,
          count: row.count,
        });
      }
    }),
  );

  return stats;
}

export async function getMyListingRating(
  listingId: string,
  userId: string,
): Promise<number | null> {
  const snap = await getDoc(doc(db, 'listing_ratings', listingRatingDocId(listingId, userId)));
  if (!snap.exists()) return null;
  const n = Number(snap.data().rating);
  return Number.isFinite(n) ? n : null;
}

export async function setMyListingRating(
  listingId: string,
  vendorId: string,
  userId: string,
  rating: number,
): Promise<void> {
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
  const ref = doc(db, 'listing_ratings', listingRatingDocId(listingId, userId));
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      listingId,
      vendorId,
      userId,
      rating,
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      rating,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function loadListingComments(listingId: string): Promise<ListingCommentRow[]> {
  const snap = await getDocs(
    query(collection(db, 'listing_comments'), where('listingId', '==', listingId)),
  );
  return snap.docs
    .map((d) => {
      const x = d.data() as Record<string, unknown>;
      const ts = x.createdAt as { toDate?: () => Date } | undefined;
      return {
        id: d.id,
        userId: String(x.userId ?? ''),
        userName: String(x.userName ?? 'Member'),
        userPhotoURL: String(x.userPhotoURL ?? '').trim() || undefined,
        text: String(x.text ?? ''),
        createdAt: ts?.toDate ? ts.toDate() : new Date(),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function addListingComment(input: {
  listingId: string;
  vendorId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text: string;
}): Promise<void> {
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error('Comment cannot be empty');
  await addDoc(collection(db, 'listing_comments'), {
    listingId: input.listingId,
    vendorId: input.vendorId,
    userId: input.userId,
    userName: input.userName,
    userPhotoURL: input.userPhotoURL ?? '',
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}
