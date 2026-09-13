import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type UpdateData,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type {
  PostContentType,
  PostLinkedEntity,
  PostMediaItem,
  PostMediaType,
} from '@/lib/feed-posts';

/** Default public lifetime for a Story (24h). */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export type StoryAuthorType = 'wellnessxplora' | 'vendor';
export type StoryStatus = 'published' | 'removed';

export type FeedStory = {
  id: string;
  authorId: string;
  authorType: StoryAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  caption: string;
  media: PostMediaItem[];
  mediaType: PostMediaType;
  linkedEntities: PostLinkedEntity[];
  status: StoryStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  sourcePostId?: string;
  sourcePostContentType?: PostContentType;
  sourceMediaCount?: number;
};

/** Lightweight rail entry: one author with one or more active stories. */
export type StoryAuthorGroup = {
  authorId: string;
  authorType: StoryAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  /** Active stories oldest → newest (viewer advances in this order). */
  stories: FeedStory[];
  /**
   * Cover for the rail ring only — never a video URL.
   * Prefer video poster, else first image path.
   */
  coverPath?: string;
};

export const STORY_CAPTION_MAX_LENGTH = 500;

type FeedPostLike = {
  id: string;
  caption: string;
  media: PostMediaItem[];
  authorId: string;
  authorType: StoryAuthorType | string;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  contentType?: string;
};

function tsToDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (v instanceof Date) return v;
  return new Date();
}

export function isStoryPubliclyActive(
  story: Pick<FeedStory, 'status' | 'expiresAt'>,
  now = new Date(),
): boolean {
  if (story.status === 'removed') return false;
  return story.expiresAt.getTime() > now.getTime();
}

function mapStoryDoc(d: QueryDocumentSnapshot | DocumentSnapshot): FeedStory {
  const x = d.data() as Record<string, unknown>;
  const media = Array.isArray(x.media) ? (x.media as PostMediaItem[]) : [];
  const linkedEntities = Array.isArray(x.linkedEntities)
    ? (x.linkedEntities as PostLinkedEntity[])
    : [];

  const sourcePostId = String(x.sourcePostId ?? '').trim() || undefined;
  const sourceMediaCountRaw = Number(x.sourceMediaCount);
  const sourceMediaCount =
    Number.isFinite(sourceMediaCountRaw) && sourceMediaCountRaw > 0
      ? Math.floor(sourceMediaCountRaw)
      : undefined;
  const sourcePostContentType =
    x.sourcePostContentType === 'event' || x.sourcePostContentType === 'post'
      ? (x.sourcePostContentType as PostContentType)
      : undefined;

  return {
    id: d.id,
    authorId: String(x.authorId ?? ''),
    authorType: (x.authorType as StoryAuthorType) ?? 'vendor',
    authorName: String(x.authorName ?? 'WellnessXplora'),
    authorPhotoURL: String(x.authorPhotoURL ?? '').trim() || undefined,
    vendorId: String(x.vendorId ?? '').trim() || undefined,
    caption: String(x.caption ?? ''),
    media,
    mediaType: (x.mediaType as PostMediaType) ?? (media.length ? 'image' : 'none'),
    linkedEntities,
    status: (x.status as StoryStatus) ?? 'published',
    createdAt: tsToDate(x.createdAt),
    updatedAt: tsToDate(x.updatedAt),
    expiresAt: tsToDate(x.expiresAt),
    sourcePostId,
    sourcePostContentType,
    sourceMediaCount,
  };
}

function storyCoverPath(story: FeedStory): string | undefined {
  for (const m of story.media) {
    if (m.type === 'video' && m.thumbnailUrl) return m.thumbnailUrl;
  }
  for (const m of story.media) {
    if (m.type === 'image') return m.url;
  }
  return undefined;
}

/** Group active stories by author; rail should only use coverPath / avatars (no video preload). */
export function groupStoriesByAuthor(stories: FeedStory[]): StoryAuthorGroup[] {
  const map = new Map<string, StoryAuthorGroup>();
  const ordered: StoryAuthorGroup[] = [];

  for (const story of stories) {
    let group = map.get(story.authorId);
    if (!group) {
      group = {
        authorId: story.authorId,
        authorType: story.authorType,
        authorName: story.authorName,
        authorPhotoURL: story.authorPhotoURL,
        vendorId: story.vendorId,
        stories: [],
        coverPath: undefined,
      };
      map.set(story.authorId, group);
      ordered.push(group);
    }
    group.stories.push(story);
    if (!group.coverPath) {
      group.coverPath = storyCoverPath(story);
    }
  }

  for (const g of ordered) {
    g.stories.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  ordered.sort((a, b) => {
    if (a.authorType === 'wellnessxplora' && b.authorType !== 'wellnessxplora') return -1;
    if (b.authorType === 'wellnessxplora' && a.authorType !== 'wellnessxplora') return 1;
    const aLatest = a.stories[a.stories.length - 1]?.createdAt.getTime() ?? 0;
    const bLatest = b.stories[b.stories.length - 1]?.createdAt.getTime() ?? 0;
    return bLatest - aLatest;
  });

  return ordered;
}

export const STORY_PERMISSION_ERROR_MESSAGE =
  'Stories are temporarily unavailable. Public story reads need an updated Firestore rules deploy from the web repo.';

export const STORY_INDEX_ERROR_MESSAGE =
  'Stories are almost ready — a database index is still building. Try again in a few minutes.';

function isPermissionError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return code === 'permission-denied' || message.toLowerCase().includes('insufficient permissions');
}

function isIndexError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return code === 'failed-precondition' || message.toLowerCase().includes('requires an index');
}

/**
 * Fetch live stories for everyone (including guests).
 *
 * Tries both public query shapes:
 * 1) status + visibility + expiresAt — matches older rules that required visibility
 * 2) status + expiresAt — matches current rules + the standard composite index
 *
 * Admins get an extra recent-stories pass. Own-author reads fill gaps for creators.
 * Returns `{ stories, error }` only when every public query failed.
 */
export async function fetchActiveStories(
  pageSize = 80,
  options?: { viewerAuthorId?: string; isAdmin?: boolean },
): Promise<{ stories: FeedStory[]; error?: string }> {
  const nowDate = new Date();
  const byId = new Map<string, FeedStory>();
  let publicQueryOk = false;
  let lastError: string | undefined;

  const ingest = (docs: QueryDocumentSnapshot[]) => {
    for (const d of docs) {
      const story = mapStoryDoc(d);
      if (isStoryPubliclyActive(story, nowDate)) byId.set(story.id, story);
    }
  };

  const tryPublic = async (includeVisibility: boolean) => {
    const now = Timestamp.now();
    const constraints = includeVisibility
      ? [
          where('status', '==', 'published'),
          where('visibility', '==', 'public'),
          where('expiresAt', '>', now),
          orderBy('expiresAt', 'asc'),
          limit(pageSize),
        ]
      : [
          where('status', '==', 'published'),
          where('expiresAt', '>', now),
          orderBy('expiresAt', 'asc'),
          limit(pageSize),
        ];
    const snap = await getDocs(query(collection(db, 'stories'), ...constraints));
    ingest(snap.docs);
  };

  // Older production rules required visibility on list; try that first, then the
  // simpler status+expiresAt query used by current rules / indexes.
  for (const withVisibility of [true, false] as const) {
    try {
      await tryPublic(withVisibility);
      publicQueryOk = true;
      lastError = undefined;
      break;
    } catch (err) {
      console.warn(
        `[stories] public query failed (visibility=${withVisibility})`,
        err,
      );
      if (isPermissionError(err)) lastError = STORY_PERMISSION_ERROR_MESSAGE;
      else if (isIndexError(err)) lastError = STORY_INDEX_ERROR_MESSAGE;
      else lastError = err instanceof Error ? err.message : 'Could not load stories.';
    }
  }

  const viewerId = options?.viewerAuthorId?.trim();
  if (viewerId) {
    try {
      const ownSnap = await getDocs(
        query(collection(db, 'stories'), where('authorId', '==', viewerId), limit(40)),
      );
      ingest(ownSnap.docs);
    } catch (err) {
      console.warn('[stories] own stories query failed', err);
    }
  }

  // Admins can list broader story docs; keep only still-publicly-active for the rail.
  if (options?.isAdmin) {
    try {
      const adminSnap = await getDocs(
        query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(60)),
      );
      ingest(adminSnap.docs);
    } catch (err) {
      console.warn('[stories] admin stories query failed', err);
    }
  }

  return {
    stories: [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    // Only surface infra errors when public list truly failed (not empty rail).
    error: publicQueryOk ? undefined : lastError,
  };
}

export type CreateStoryInput = {
  authorId: string;
  authorType: StoryAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  caption?: string;
  media?: PostMediaItem[];
  linkedEntities?: PostLinkedEntity[];
  expiresAt?: Date;
  sourcePostId?: string;
  sourcePostContentType?: PostContentType;
  sourceMediaCount?: number;
};

export async function createStory(input: CreateStoryInput): Promise<string> {
  const media = input.media ?? [];
  const mediaType: PostMediaType =
    media.length === 0
      ? 'none'
      : media.some((m) => m.type === 'video')
        ? 'video'
        : 'image';

  const expiresAt = input.expiresAt ?? new Date(Date.now() + STORY_TTL_MS);

  const ref = await addDoc(collection(db, 'stories'), {
    authorId: input.authorId,
    authorType: input.authorType,
    authorName: input.authorName.trim() || 'WellnessXplora',
    authorPhotoURL: input.authorPhotoURL?.trim() ?? '',
    vendorId: input.vendorId?.trim() ?? '',
    caption: (input.caption ?? '').trim().slice(0, STORY_CAPTION_MAX_LENGTH),
    media,
    mediaType,
    linkedEntities: input.linkedEntities ?? [],
    status: 'published' satisfies StoryStatus,
    visibility: 'public',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    sourcePostId: input.sourcePostId?.trim() ?? '',
    sourcePostContentType: input.sourcePostContentType ?? '',
    sourceMediaCount:
      typeof input.sourceMediaCount === 'number' && input.sourceMediaCount > 0
        ? Math.floor(input.sourceMediaCount)
        : 0,
  });

  return ref.id;
}

export async function updateStoryMedia(storyId: string, media: PostMediaItem[]): Promise<void> {
  const mediaType: PostMediaType =
    media.length === 0
      ? 'none'
      : media.some((m) => m.type === 'video')
        ? 'video'
        : 'image';
  await updateDoc(doc(db, 'stories', storyId), {
    media,
    mediaType,
    updatedAt: serverTimestamp(),
  } as UpdateData<DocumentData>);
}

export async function removeStory(storyId: string): Promise<void> {
  await updateDoc(doc(db, 'stories', storyId), {
    status: 'removed',
    updatedAt: serverTimestamp(),
  } as UpdateData<DocumentData>);
}

export async function deleteStoryDoc(storyId: string): Promise<void> {
  await deleteDoc(doc(db, 'stories', storyId));
}

/**
 * Publish a Story from an existing permanent post.
 * Reuses the post’s Storage media paths (no re-upload).
 * Cleanup of story docs must never delete objects under `posts/` — those belong
 * to the permanent post.
 *
 * Pass `publisher` to share any post onto the current creator’s Story rail
 * (vendor / WellnessXplora editor). Defaults to the post’s own author when omitted.
 */
export async function createStoryFromPost(input: {
  post: FeedPostLike;
  mediaIndex?: number;
  publisher?: {
    authorId: string;
    authorType: StoryAuthorType;
    authorName: string;
    authorPhotoURL?: string;
    vendorId?: string;
  };
}): Promise<string> {
  const { post, publisher } = input;
  const authorType: StoryAuthorType =
    publisher?.authorType ??
    (post.authorType === 'wellnessxplora' ? 'wellnessxplora' : 'vendor');
  const authorId = publisher?.authorId ?? post.authorId;
  const authorName = publisher?.authorName ?? post.authorName;
  const authorPhotoURL = publisher?.authorPhotoURL ?? post.authorPhotoURL;
  const vendorId =
    publisher?.vendorId ??
    (authorType === 'vendor' ? post.vendorId || post.authorId : undefined);

  const contentType: PostContentType = post.contentType === 'event' ? 'event' : 'post';

  let caption = post.caption.trim().slice(0, STORY_CAPTION_MAX_LENGTH);
  if (contentType === 'event' && caption && !/^event\b/i.test(caption)) {
    const prefix = 'Event · ';
    caption = `${prefix}${caption}`.slice(0, STORY_CAPTION_MAX_LENGTH);
  }

  const allMedia = Array.isArray(post.media) ? post.media : [];
  const images = allMedia.filter((m) => m.type === 'image');
  const video = allMedia.find((m) => m.type === 'video');

  let media: PostMediaItem[] = [];
  if (video) {
    media = [video];
  } else if (images.length > 0) {
    const idx = Math.min(Math.max(0, input.mediaIndex ?? 0), images.length - 1);
    media = [images[idx]!];
  }

  return createStory({
    authorId,
    authorType,
    authorName,
    authorPhotoURL,
    vendorId: authorType === 'vendor' ? vendorId || authorId : undefined,
    caption,
    media,
    linkedEntities:
      authorType === 'vendor' && (vendorId || authorId)
        ? [{ type: 'vendor', id: vendorId || authorId }]
        : [],
    sourcePostId: post.id,
    sourcePostContentType: contentType,
    sourceMediaCount: allMedia.length,
  });
}

export function postPathFromStory(story: Pick<FeedStory, 'sourcePostId'>): string | null {
  const id = story.sourcePostId?.trim();
  if (!id) return null;
  return `/post/${encodeURIComponent(id)}`;
}

const storiesChangedListeners = new Set<() => void>();

export function notifyStoriesChanged() {
  for (const listener of storiesChangedListeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeStoriesChanged(listener: () => void): () => void {
  storiesChangedListeners.add(listener);
  return () => {
    storiesChangedListeners.delete(listener);
  };
}
