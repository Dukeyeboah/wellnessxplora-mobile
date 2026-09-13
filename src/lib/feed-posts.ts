import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type UpdateData,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type PostAuthorType = 'wellnessxplora' | 'vendor' | 'user';
export type PostMediaType = 'image' | 'video' | 'none';
export type PostStatus = 'draft' | 'published' | 'archived' | 'removed';
export type PostContentType = 'post' | 'event';

export type PostLinkedEntity = {
  type: string;
  id: string;
  label?: string;
};

export type PostMediaItem = {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
};

export type FeedPost = {
  id: string;
  authorId: string;
  authorType: PostAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  caption: string;
  media: PostMediaItem[];
  mediaType: PostMediaType;
  categorySlugs: string[];
  tags: string[];
  linkedEntities: PostLinkedEntity[];
  status: PostStatus;
  visibility: 'public';
  contentType?: PostContentType;
  featured?: boolean;
  likeCount: number;
  saveCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  eventStartsAt?: Date;
};

export type FeedPage = {
  posts: FeedPost[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
};

export type FeedMode = 'for-you' | 'following';

const PAGE_SIZE = 50;
const FOLLOW_VENDOR_CHUNK = 10;

/** Soft UX limit for feed captions (Firestore rules still allow up to 4000). */
export const POST_CAPTION_MAX_LENGTH = 800;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function tsToDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  return new Date();
}

function mapPostDoc(d: QueryDocumentSnapshot | DocumentSnapshot): FeedPost {
  const x = d.data() as Record<string, unknown>;
  const media = Array.isArray(x.media) ? (x.media as PostMediaItem[]) : [];
  const linkedEntities = Array.isArray(x.linkedEntities)
    ? (x.linkedEntities as PostLinkedEntity[])
    : [];
  const categorySlugs = Array.isArray(x.categorySlugs) ? (x.categorySlugs as string[]) : [];
  const tags = Array.isArray(x.tags) ? (x.tags as string[]) : [];

  return {
    id: d.id,
    authorId: String(x.authorId ?? ''),
    authorType: (x.authorType as PostAuthorType) ?? 'wellnessxplora',
    authorName: String(x.authorName ?? 'WellnessXplora'),
    authorPhotoURL: String(x.authorPhotoURL ?? '').trim() || undefined,
    vendorId: String(x.vendorId ?? '').trim() || undefined,
    caption: String(x.caption ?? ''),
    media,
    mediaType: (x.mediaType as PostMediaType) ?? (media.length ? 'image' : 'none'),
    categorySlugs,
    tags,
    linkedEntities,
    status: (x.status as PostStatus) ?? 'draft',
    visibility: 'public',
    contentType: (x.contentType as PostContentType) ?? 'post',
    featured: x.featured === true,
    likeCount: typeof x.likeCount === 'number' ? x.likeCount : Number(x.likeCount ?? 0),
    saveCount: typeof x.saveCount === 'number' ? x.saveCount : Number(x.saveCount ?? 0),
    createdAt: tsToDate(x.createdAt),
    updatedAt: tsToDate(x.updatedAt),
    publishedAt: x.publishedAt ? tsToDate(x.publishedAt) : undefined,
    eventStartsAt: x.eventStartsAt ? tsToDate(x.eventStartsAt) : undefined,
  };
}

export async function fetchFeedPage(
  options: {
    cursor?: QueryDocumentSnapshot | null;
    pageSize?: number;
    mode?: FeedMode;
    followedVendorIds?: string[];
  } = {},
): Promise<FeedPage> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const mode = options.mode ?? 'for-you';

  if (mode === 'following') {
    return fetchFollowingFeedPage({
      followedVendorIds: options.followedVendorIds ?? [],
      cursor: options.cursor ?? null,
      pageSize,
    });
  }

  let q = query(
    collection(db, 'posts'),
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    orderBy('publishedAt', 'desc'),
    limit(pageSize + 1),
  );

  if (options.cursor) {
    q = query(
      collection(db, 'posts'),
      where('status', '==', 'published'),
      where('visibility', '==', 'public'),
      orderBy('publishedAt', 'desc'),
      startAfter(options.cursor),
      limit(pageSize + 1),
    );
  }

  const snap = await getDocs(q);
  const hasMore = snap.docs.length > pageSize;
  const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

  return {
    posts: pageDocs.map((d) => mapPostDoc(d)),
    lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]! : null,
    hasMore,
  };
}

async function fetchFollowingFeedPage(options: {
  followedVendorIds: string[];
  cursor: QueryDocumentSnapshot | null;
  pageSize: number;
}): Promise<FeedPage> {
  const vendorIds = [...new Set(options.followedVendorIds.filter(Boolean))];
  if (vendorIds.length === 0) {
    return { posts: [], lastDoc: null, hasMore: false };
  }

  const cursorPublishedAt = options.cursor?.data()?.publishedAt;
  const chunks = chunkArray(vendorIds, FOLLOW_VENDOR_CHUNK);

  const snaps = await Promise.all(
    chunks.map((chunk) => {
      if (options.cursor && cursorPublishedAt) {
        return getDocs(
          query(
            collection(db, 'posts'),
            where('status', '==', 'published'),
            where('visibility', '==', 'public'),
            where('vendorId', 'in', chunk),
            where('publishedAt', '<', cursorPublishedAt),
            orderBy('publishedAt', 'desc'),
            limit(options.pageSize + 1),
          ),
        );
      }

      return getDocs(
        query(
          collection(db, 'posts'),
          where('status', '==', 'published'),
          where('visibility', '==', 'public'),
          where('vendorId', 'in', chunk),
          orderBy('publishedAt', 'desc'),
          limit(options.pageSize + 1),
        ),
      );
    }),
  );

  const byId = new Map<string, QueryDocumentSnapshot>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      byId.set(d.id, d);
    }
  }

  const sorted = [...byId.values()].sort((a, b) => {
    const aTime = tsToDate(a.data().publishedAt).getTime();
    const bTime = tsToDate(b.data().publishedAt).getTime();
    return bTime - aTime;
  });

  const hasMore = sorted.length > options.pageSize;
  const pageDocs = hasMore ? sorted.slice(0, options.pageSize) : sorted;

  return {
    posts: pageDocs.map((d) => mapPostDoc(d)),
    lastDoc: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]! : null,
    hasMore,
  };
}

export async function fetchPostById(postId: string): Promise<FeedPost | null> {
  const snap = await getDoc(doc(db, 'posts', postId));
  if (!snap.exists()) return null;
  return mapPostDoc(snap);
}

export type CreatePostInput = {
  authorId: string;
  authorType: PostAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  caption: string;
  media?: PostMediaItem[];
  categorySlugs?: string[];
  tags?: string[];
  linkedEntities?: PostLinkedEntity[];
  status?: PostStatus;
  featured?: boolean;
  contentType?: PostContentType;
  eventStartsAt?: Date;
};

export async function createPost(input: CreatePostInput): Promise<string> {
  const media = input.media ?? [];
  const mediaType: PostMediaType =
    media.length === 0
      ? 'none'
      : media.some((m) => m.type === 'video')
        ? 'video'
        : 'image';
  const status = input.status ?? 'draft';
  const now = serverTimestamp();

  const payload: Record<string, unknown> = {
    authorId: input.authorId,
    authorType: input.authorType,
    authorName: input.authorName.trim() || 'WellnessXplora',
    authorPhotoURL: input.authorPhotoURL?.trim() ?? '',
    vendorId: input.vendorId?.trim() ?? '',
    caption: input.caption.trim().slice(0, POST_CAPTION_MAX_LENGTH),
    media,
    mediaType,
    categorySlugs: input.categorySlugs ?? [],
    tags: input.tags ?? [],
    linkedEntities: input.linkedEntities ?? [],
    status,
    visibility: 'public',
    contentType: input.contentType ?? 'post',
    featured: input.featured === true,
    likeCount: 0,
    saveCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (status === 'published') {
    payload.publishedAt = now;
  }

  if (input.eventStartsAt) {
    payload.eventStartsAt = Timestamp.fromDate(input.eventStartsAt);
  }

  const ref = await addDoc(collection(db, 'posts'), payload);
  return ref.id;
}

export async function updatePost(
  postId: string,
  patch: Partial<CreatePostInput> & { status?: PostStatus },
): Promise<void> {
  const ref = doc(db, 'posts', postId);
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error('Post not found');

  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (patch.caption !== undefined) {
    data.caption = patch.caption.trim().slice(0, POST_CAPTION_MAX_LENGTH);
  }
  if (patch.media !== undefined) {
    data.media = patch.media;
    data.mediaType =
      patch.media.length === 0
        ? 'none'
        : patch.media.some((m) => m.type === 'video')
          ? 'video'
          : 'image';
  }
  if (patch.categorySlugs !== undefined) data.categorySlugs = patch.categorySlugs;
  if (patch.tags !== undefined) data.tags = patch.tags;
  if (patch.linkedEntities !== undefined) data.linkedEntities = patch.linkedEntities;
  if (patch.featured !== undefined) data.featured = patch.featured;
  if (patch.contentType !== undefined) data.contentType = patch.contentType;
  if (patch.eventStartsAt !== undefined) {
    data.eventStartsAt = Timestamp.fromDate(patch.eventStartsAt);
  }
  if (patch.authorName !== undefined) data.authorName = patch.authorName.trim();
  if (patch.authorPhotoURL !== undefined) {
    data.authorPhotoURL = patch.authorPhotoURL?.trim() ?? '';
  }

  if (patch.status !== undefined) {
    data.status = patch.status;
    const wasPublished = existing.data()?.status === 'published';
    if (patch.status === 'published' && !wasPublished) {
      data.publishedAt = serverTimestamp();
    }
  }

  await updateDoc(ref, data as UpdateData<DocumentData>);
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

/** Owner dashboard: all posts for this vendor account (any status). */
export async function fetchVendorPosts(vendorId: string): Promise<FeedPost[]> {
  const byId = new Map<string, FeedPost>();
  const ingest = (docs: QueryDocumentSnapshot[]) => {
    for (const d of docs) byId.set(d.id, mapPostDoc(d));
  };

  // Prefer equality-only queries (no composite index) so the dashboard
  // still loads when status/visibility indexes aren't deployed yet.
  try {
    const snap = await getDocs(
      query(collection(db, 'posts'), where('vendorId', '==', vendorId), limit(50)),
    );
    ingest(snap.docs);
  } catch (err) {
    console.warn('[posts] vendorId owner query failed', err);
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'posts'), where('authorId', '==', vendorId), limit(50)),
    );
    ingest(snap.docs);
  } catch (err) {
    console.warn('[posts] authorId owner query failed', err);
  }

  return [...byId.values()].sort((a, b) => {
    const aTime = a.updatedAt.getTime() || a.createdAt.getTime();
    const bTime = b.updatedAt.getTime() || b.createdAt.getTime();
    return bTime - aTime;
  });
}

/** Public profile: published posts only. */
export async function fetchPublishedVendorPosts(vendorId: string): Promise<FeedPost[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'posts'),
        where('vendorId', '==', vendorId),
        where('status', '==', 'published'),
        where('visibility', '==', 'public'),
        orderBy('publishedAt', 'desc'),
        limit(40),
      ),
    );
    return snap.docs.map((d) => mapPostDoc(d));
  } catch (err) {
    console.warn('[posts] published-by-vendor query failed, trying authorId fallback', err);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'posts'),
          where('authorId', '==', vendorId),
          where('authorType', '==', 'vendor'),
          where('status', '==', 'published'),
          orderBy('publishedAt', 'desc'),
          limit(40),
        ),
      );
      return snap.docs.map((d) => mapPostDoc(d));
    } catch (err2) {
      console.warn('[posts] published authorId query failed', err2);
      const all = await fetchVendorPosts(vendorId).catch(() => [] as FeedPost[]);
      return all.filter((p) => p.status === 'published');
    }
  }
}

export function isFeedPermissionError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    code === 'permission-denied' ||
    message.toLowerCase().includes('insufficient permissions') ||
    message.toLowerCase().includes('missing or insufficient permissions')
  );
}

export function isFeedIndexError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return code === 'failed-precondition' || message.toLowerCase().includes('requires an index');
}

export const FEED_PERMISSION_ERROR_MESSAGE =
  "We couldn't load posts yet. Ask your admin to deploy the latest Firestore rules, or try again in a moment.";

export const FEED_INDEX_ERROR_MESSAGE =
  'The feed is almost ready — a database index is still building. Try again in a few minutes.';

const feedChangedListeners = new Set<() => void>();

export function notifyFeedChanged() {
  for (const listener of feedChangedListeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeFeedChanged(listener: () => void): () => void {
  feedChangedListeners.add(listener);
  return () => {
    feedChangedListeners.delete(listener);
  };
}