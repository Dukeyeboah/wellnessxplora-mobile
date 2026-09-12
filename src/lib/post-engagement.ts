import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { fetchPostById, type FeedPost } from '@/lib/feed-posts';

function postLikeDocId(userId: string, postId: string): string {
  return `${userId}_${postId}`;
}

function postSaveDocId(userId: string, postId: string): string {
  return `${userId}_${postId}`;
}

export async function isPostLiked(userId: string, postId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'post_likes', postLikeDocId(userId, postId)));
  return snap.exists();
}

export async function likePost(userId: string, postId: string): Promise<void> {
  const likeId = postLikeDocId(userId, postId);
  const likeRef = doc(db, 'post_likes', likeId);
  const existing = await getDoc(likeRef);
  if (existing.exists()) return;

  await setDoc(likeRef, {
    userId,
    postId,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'posts', postId), { likeCount: increment(1) });
}

export async function unlikePost(userId: string, postId: string): Promise<void> {
  const likeId = postLikeDocId(userId, postId);
  const likeRef = doc(db, 'post_likes', likeId);
  const existing = await getDoc(likeRef);
  if (!existing.exists()) return;

  await deleteDoc(likeRef);
  await updateDoc(doc(db, 'posts', postId), { likeCount: increment(-1) });
}

export async function isPostSaved(userId: string, postId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'post_saves', postSaveDocId(userId, postId)));
  return snap.exists();
}

export async function savePost(userId: string, postId: string): Promise<void> {
  const saveId = postSaveDocId(userId, postId);
  const saveRef = doc(db, 'post_saves', saveId);
  const existing = await getDoc(saveRef);
  if (existing.exists()) return;

  await setDoc(saveRef, {
    userId,
    postId,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'posts', postId), { saveCount: increment(1) });
}

export async function unsavePost(userId: string, postId: string): Promise<void> {
  const saveId = postSaveDocId(userId, postId);
  const saveRef = doc(db, 'post_saves', saveId);
  const existing = await getDoc(saveRef);
  if (!existing.exists()) return;

  await deleteDoc(saveRef);
  await updateDoc(doc(db, 'posts', postId), { saveCount: increment(-1) });
}

export async function fetchUserSavedPostIds(userId: string): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, 'post_saves'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  );
  return snap.docs.map((d) => String(d.data().postId ?? '')).filter(Boolean);
}

/** Saved posts in save order (newest first). Skips missing/unpublished docs. */
export async function fetchUserSavedPosts(userId: string): Promise<FeedPost[]> {
  const ids = await fetchUserSavedPostIds(userId);
  if (ids.length === 0) return [];
  const posts = await Promise.all(ids.map((id) => fetchPostById(id)));
  return posts.filter((p): p is FeedPost => Boolean(p && p.status === 'published'));
}
