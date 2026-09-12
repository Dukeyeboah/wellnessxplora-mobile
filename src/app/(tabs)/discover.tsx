import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

import { AppHeader } from '@/components/app-header';
import {
  FeedContentTypeFilter,
  type FeedContentFilter,
} from '@/components/feed-content-type-filter';
import { FeedEventsCarousel } from '@/components/feed-events-carousel';
import { FeedPostCard } from '@/components/feed-post-card';
import { StoriesRail } from '@/components/stories-rail';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchIsAdmin } from '@/lib/admin-auth';
import { useAuth } from '@/lib/auth-context';
import { useChrome, useScrollChrome } from '@/lib/chrome';
import { categorizeFeedPosts } from '@/lib/feed-post-layout';
import {
  FEED_INDEX_ERROR_MESSAGE,
  FEED_PERMISSION_ERROR_MESSAGE,
  fetchFeedPage,
  isFeedIndexError,
  isFeedPermissionError,
  subscribeFeedChanged,
  type FeedPost,
  type PostAuthorType,
} from '@/lib/feed-posts';
import type { StoryAuthorType } from '@/lib/stories';
import { fetchVendorProfileDoc } from '@/lib/user-profile';

export default function DiscoverScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, userRole, userProfile, loading: authLoading } = useAuth();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentFilter, setContentFilter] = useState<FeedContentFilter>('visual');
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhotoURL, setVendorPhotoURL] = useState('');
  const loadingRef = useRef(false);

  const isVendor = userRole === 'vendor';
  const canCreate = Boolean(user) && (isVendor || isAdmin);

  const createAuthorType: PostAuthorType = isAdmin && !isVendor ? 'wellnessxplora' : 'vendor';
  const createAuthorName =
    createAuthorType === 'wellnessxplora'
      ? 'WellnessXplora'
      : vendorName || userProfile?.name || user?.displayName || 'Vendor';
  const createAuthorPhoto =
    createAuthorType === 'wellnessxplora' ? undefined : vendorPhotoURL || userProfile?.photoURL;

  const { events, imagePosts, textPosts } = useMemo(
    () => categorizeFeedPosts(posts),
    [posts],
  );

  const visiblePosts =
    contentFilter === 'events'
      ? events
      : contentFilter === 'text'
        ? textPosts
        : imagePosts;

  const listData = contentFilter === 'events' ? [] : visiblePosts;

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setVendorName('');
      setVendorPhotoURL('');
      return;
    }
    void fetchIsAdmin(user.uid).then(setIsAdmin);
    if (userRole === 'vendor') {
      void fetchVendorProfileDoc(user.uid).then((vendor) => {
        if (!vendor) return;
        setVendorName(vendor.businessName || userProfile?.name || '');
        setVendorPhotoURL(vendor.logoUrl || userProfile?.photoURL || '');
      });
    }
  }, [user, userRole, userProfile?.name, userProfile?.photoURL]);

  const loadInitial = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(null);
    try {
      const page = await fetchFeedPage({ mode: 'for-you' });
      setPosts(page.posts);
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } catch (err) {
      if (isFeedPermissionError(err)) setError(FEED_PERMISSION_ERROR_MESSAGE);
      else if (isFeedIndexError(err)) setError(FEED_INDEX_ERROR_MESSAGE);
      else setError(err instanceof Error ? err.message : 'Could not load the feed.');
      setPosts([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      setLoading(true);
      void loadInitial();
    }, [authLoading, loadInitial]),
  );

  useEffect(() => subscribeFeedChanged(() => {
    setRefreshing(true);
    void loadInitial();
  }), [loadInitial]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadInitial();
  };

  const onLoadMore = async () => {
    if (contentFilter === 'events') return;
    if (!hasMore || loadingMore || !cursor || loadingRef.current) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeedPage({ mode: 'for-you', cursor });
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.lastDoc);
      setHasMore(page.hasMore);
    } catch (err) {
      if (isFeedPermissionError(err)) setError(FEED_PERMISSION_ERROR_MESSAGE);
      else if (isFeedIndexError(err)) setError(FEED_INDEX_ERROR_MESSAGE);
    } finally {
      setLoadingMore(false);
    }
  };

  const emptyMessage = (() => {
    if (contentFilter === 'events') {
      return 'No upcoming events right now. Check back soon.';
    }
    if (contentFilter === 'text') {
      return 'No text posts yet. Short notes and updates without images will appear here.';
    }
    return canCreate
      ? 'No photo or video posts yet. Tap + in the tab bar to share your first update.'
      : 'No photo or video posts yet. Check back soon for wellness updates.';
  })();

  return (
    <ThemedView style={styles.screen}>
      <AppHeader title="WellnessXplora" collapsible showAuthWhenSignedOut />
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        {...scrollChrome}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
            paddingTop: Spacing.two,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => void onLoadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <StoriesRail
              canCreate={canCreate}
              createAuthorId={user?.uid}
              createAuthorType={createAuthorType as StoryAuthorType}
              createAuthorName={createAuthorName}
              createAuthorPhotoURL={createAuthorPhoto}
              createVendorId={isVendor ? user?.uid : undefined}
            />

            <View style={styles.filterRow}>
              <FeedContentTypeFilter value={contentFilter} onChange={setContentFilter} />
            </View>

            {contentFilter === 'events' && !loading && !error && events.length > 0 ? (
              <FeedEventsCarousel posts={events} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading || authLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.tint} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {error}
              </ThemedText>
              <Pressable onPress={() => void loadInitial()} style={{ marginTop: Spacing.two }}>
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  Try again
                </ThemedText>
              </Pressable>
            </View>
          ) : contentFilter === 'events' && events.length > 0 ? null : (
            <View style={styles.centered}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {emptyMessage}
              </ThemedText>
            </View>
          )
        }
        ListFooterComponent={
          contentFilter === 'events' ? null : loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.tint} />
            </View>
          ) : hasMore && visiblePosts.length > 0 ? (
            <Pressable onPress={() => void onLoadMore()} style={styles.loadMore}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Load more
              </ThemedText>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <FeedPostCard post={item} />
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  headerBlock: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cardWrap: { width: '100%' },
  centered: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: { textAlign: 'center', paddingHorizontal: Spacing.four },
  footer: { paddingVertical: Spacing.four, alignItems: 'center' },
  loadMore: { paddingVertical: Spacing.three, alignItems: 'center' },
});
