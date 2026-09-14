import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { PostAddToStoryButton } from '@/components/post-add-to-story-button';
import { ThemedText } from '@/components/themed-text';
import { EngagementColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import type { FeedPost } from '@/lib/feed-posts';
import {
  isPostLiked,
  isPostSaved,
  likePost,
  savePost,
  unlikePost,
  unsavePost,
} from '@/lib/post-engagement';
import { requireAuth } from '@/lib/require-auth';

type Props = {
  postId: string;
  likeCount: number;
  saveCount: number;
  layout?: 'inline' | 'under-media';
  onCountsChange?: (counts: { likeCount: number; saveCount: number }) => void;
  addToStoryPost?: FeedPost;
  addToStoryMediaIndex?: number;
};

export function PostEngagementBar({
  postId,
  likeCount,
  saveCount,
  layout = 'inline',
  onCountsChange,
  addToStoryPost,
  addToStoryMediaIndex = 0,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(likeCount);
  const [saves, setSaves] = useState(saveCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLikes(likeCount);
    setSaves(saveCount);
  }, [likeCount, saveCount]);

  useEffect(() => {
    if (!user) {
      setLiked(false);
      setSaved(false);
      return;
    }
    let cancelled = false;
    void Promise.all([isPostLiked(user.uid, postId), isPostSaved(user.uid, postId)])
      .then(([l, s]) => {
        if (!cancelled) {
          setLiked(l);
          setSaved(s);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiked(false);
          setSaved(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, postId]);

  const toggleLike = async () => {
    if (!requireAuth(Boolean(user), router, 'like_post')) return;
    if (!user || busy) return;

    const wasLiked = liked;
    const prevLikes = likes;
    setLiked(!wasLiked);
    setLikes(wasLiked ? Math.max(0, prevLikes - 1) : prevLikes + 1);
    setBusy(true);
    try {
      if (wasLiked) {
        await unlikePost(user.uid, postId);
        onCountsChange?.({ likeCount: Math.max(0, prevLikes - 1), saveCount: saves });
      } else {
        await likePost(user.uid, postId);
        onCountsChange?.({ likeCount: prevLikes + 1, saveCount: saves });
      }
    } catch {
      setLiked(wasLiked);
      setLikes(prevLikes);
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async () => {
    if (!requireAuth(Boolean(user), router, 'save_post')) return;
    if (!user || busy) return;

    const wasSaved = saved;
    const prevSaves = saves;
    setSaved(!wasSaved);
    setSaves(wasSaved ? Math.max(0, prevSaves - 1) : prevSaves + 1);
    setBusy(true);
    try {
      if (wasSaved) {
        await unsavePost(user.uid, postId);
        onCountsChange?.({ likeCount: likes, saveCount: Math.max(0, prevSaves - 1) });
      } else {
        await savePost(user.uid, postId);
        onCountsChange?.({ likeCount: likes, saveCount: prevSaves + 1 });
      }
    } catch {
      setSaved(wasSaved);
      setSaves(prevSaves);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!requireAuth(Boolean(user), router, 'share_post')) return;
    const url = Linking.createURL(`/post/${postId}`);
    try {
      await Share.share({
        message: `Check this out on WellnessXplora\n${url}`,
        url,
      });
    } catch {
      /* cancelled */
    }
  };

  const likeButton = (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        void toggleLike();
      }}
      disabled={busy}
      hitSlop={8}
      style={styles.iconBtn}
      accessibilityLabel={liked ? 'Unlike' : 'Like'}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={20}
        color={liked ? EngagementColors.like : theme.textSecondary}
      />
      {likes > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
          {likes}
        </ThemedText>
      ) : null}
    </Pressable>
  );

  const shareButton = (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        void onShare();
      }}
      hitSlop={8}
      style={styles.iconBtn}
      accessibilityLabel="Share">
      <Ionicons name="share-outline" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const saveButton = (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        void toggleSave();
      }}
      disabled={busy}
      hitSlop={8}
      style={styles.iconBtn}
      accessibilityLabel={saved ? 'Unsave' : 'Save'}>
      <Ionicons
        name={saved ? 'bookmark' : 'bookmark-outline'}
        size={20}
        color={saved ? EngagementColors.bookmark : theme.textSecondary}
      />
      {saves > 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
          {saves}
        </ThemedText>
      ) : null}
    </Pressable>
  );

  if (layout === 'under-media') {
    return (
      <View style={styles.underMedia}>
        <View style={styles.side}>
          {likeButton}
          {shareButton}
          {addToStoryPost ? (
            <PostAddToStoryButton post={addToStoryPost} mediaIndex={addToStoryMediaIndex} />
          ) : null}
        </View>
        {saveButton}
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      {likeButton}
      {saveButton}
      {shareButton}
      {addToStoryPost ? (
        <PostAddToStoryButton post={addToStoryPost} mediaIndex={addToStoryMediaIndex} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  underMedia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  count: { fontSize: 12, minWidth: 10 },
});
