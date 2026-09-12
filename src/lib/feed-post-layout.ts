import type { FeedPost } from '@/lib/feed-posts';
import { getEventStartsAt, isEventUpcoming } from '@/lib/event-posts';

export function postHasImages(post: FeedPost): boolean {
  return post.media.some((m) => m.type === 'image');
}

export function postHasVideo(post: FeedPost): boolean {
  return post.media.some((m) => m.type === 'video');
}

export function postHasVisualMedia(post: FeedPost): boolean {
  return postHasImages(post) || postHasVideo(post);
}

export function isEventPost(post: FeedPost): boolean {
  return post.contentType === 'event';
}

export function categorizeFeedPosts(posts: FeedPost[]) {
  const events = posts
    .filter(isEventPost)
    .filter((p) => isEventUpcoming(p))
    .sort((a, b) => {
      const aTime = getEventStartsAt(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = getEventStartsAt(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  const imagePosts = posts.filter((p) => !isEventPost(p) && postHasVisualMedia(p));
  const textPosts = posts.filter((p) => !isEventPost(p) && !postHasVisualMedia(p));
  return { events, textPosts, imagePosts };
}
