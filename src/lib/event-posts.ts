import type { FeedPost } from '@/lib/feed-posts';
import { toFeedDate } from '@/lib/feed-dates';

export function getEventStartsAt(post: FeedPost): Date | undefined {
  if (!post.eventStartsAt) return undefined;
  return toFeedDate(post.eventStartsAt);
}

export function endOfEventDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Event is still upcoming through the end of its calendar day. */
export function isEventUpcoming(post: FeedPost, now = new Date()): boolean {
  if (post.contentType !== 'event') return false;
  const starts = getEventStartsAt(post);
  if (!starts) return false;
  return endOfEventDay(starts) >= now;
}

export function parseEventDateTime(dateStr: string, timeStr: string): Date | null {
  const date = dateStr.trim();
  if (!date) return null;
  const time = timeStr.trim() || '09:00';
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toEventDateInputValue(date: Date | undefined): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toEventTimeInputValue(date: Date | undefined): string {
  if (!date) return '09:00';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
