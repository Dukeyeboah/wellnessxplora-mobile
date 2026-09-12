import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { FeedPostCard } from '@/components/feed-post-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useChrome, useScrollChrome } from '@/lib/chrome';
import { fetchPostById, type FeedPost } from '@/lib/feed-posts';
import { requireAuth } from '@/lib/require-auth';

export default function PostDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = typeof id === 'string' ? id : '';
  const { user } = useAuth();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  useEffect(() => {
    if (!postId) {
      setMissing(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchPostById(postId);
        if (cancelled) return;
        if (!next || next.status !== 'published') {
          setMissing(true);
          setLoading(false);
          return;
        }
        setPost(next);
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const onShare = async () => {
    if (!requireAuth(Boolean(user), router, 'share_post')) return;
    if (!post) return;
    const url = Linking.createURL(`/post/${post.id}`);
    try {
      await Share.share({
        message: `${post.caption.trim().slice(0, 120) || 'Check this out on WellnessXplora'}\n${url}`,
        url,
      });
    } catch {
      /* cancelled */
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (missing || !post) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          This post could not be found.
        </ThemedText>
        <Pressable onPress={() => router.replace('/discover' as never)} style={{ marginTop: Spacing.three }}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            Back to Discover
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/discover' as never);
          }}
          hitSlop={12}
          style={styles.topBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
          <ThemedText type="smallBold">Discover</ThemedText>
        </Pressable>
        <Pressable onPress={() => void onShare()} hitSlop={12} style={styles.topBtn}>
          <Ionicons name="share-outline" size={20} color={theme.text} />
        </Pressable>
      </View>
      <ScrollView
        {...scrollChrome}
        contentContainerStyle={{
          paddingHorizontal: Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          gap: Spacing.three,
        }}>
        <FeedPostCard post={post} disableOpen />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  topBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
