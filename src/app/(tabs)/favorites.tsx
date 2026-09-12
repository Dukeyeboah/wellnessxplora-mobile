import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountScrollScreen } from '@/components/account-scroll-screen';
import { ExploreListingCard } from '@/components/explore-listing-card';
import { ExploreVendorCard } from '@/components/explore-vendor-card';
import { FeedPostCard } from '@/components/feed-post-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  enrichListingBookmarks,
  enrichVendorBookmarks,
  fetchBookmarkLists,
  fetchUserBookmarks,
  fetchUserListingBookmarks,
  removeListingBookmark,
  removeVendorBookmark,
  type BookmarkList,
  type ListingBookmark,
  type VendorBookmark,
} from '@/lib/bookmarks';
import type { FeedPost } from '@/lib/feed-posts';
import type { ExploreListing, ExploreVendor } from '@/lib/listings';
import { fetchUserSavedPosts, unsavePost } from '@/lib/post-engagement';

type SavedTypeFilter = 'all' | 'vendor' | 'listing' | 'post';

export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lists, setLists] = useState<BookmarkList[]>([]);
  const [vendorBookmarks, setVendorBookmarks] = useState<VendorBookmark[]>([]);
  const [listingBookmarks, setListingBookmarks] = useState<ListingBookmark[]>([]);
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [typeFilter, setTypeFilter] = useState<SavedTypeFilter>('all');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showListFilter, setShowListFilter] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [l, vendorsRaw, listingsRaw, posts] = await Promise.all([
        fetchBookmarkLists(user.uid),
        fetchUserBookmarks(user.uid),
        fetchUserListingBookmarks(user.uid),
        fetchUserSavedPosts(user.uid),
      ]);
      const [vendors, listings] = await Promise.all([
        enrichVendorBookmarks(vendorsRaw),
        enrichListingBookmarks(listingsRaw),
      ]);
      setLists(l);
      setVendorBookmarks(vendors);
      setListingBookmarks(listings);
      setSavedPosts(posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [user, load]);

  const vendorsInView = useMemo(() => {
    let rows = vendorBookmarks;
    if (selectedListId) rows = rows.filter((b) => b.listId === selectedListId);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.vendorName.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q),
    );
  }, [vendorBookmarks, selectedListId, search]);

  const listingsInView = useMemo(() => {
    let rows = listingBookmarks;
    if (selectedListId) rows = rows.filter((b) => b.listId === selectedListId);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.listingTitle.toLowerCase().includes(q) ||
        b.vendorName.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q),
    );
  }, [listingBookmarks, selectedListId, search]);

  const postsInView = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return savedPosts;
    return savedPosts.filter(
      (p) =>
        p.caption.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.categorySlugs.some((s) => s.toLowerCase().includes(q)),
    );
  }, [savedPosts, search]);

  const showVendors = typeFilter === 'all' || typeFilter === 'vendor';
  const showListings = typeFilter === 'all' || typeFilter === 'listing';
  const showPosts = typeFilter === 'all' || typeFilter === 'post';
  const isEmpty =
    (showVendors ? vendorsInView.length : 0) +
      (showListings ? listingsInView.length : 0) +
      (showPosts ? postsInView.length : 0) ===
    0;

  const sticky = (
    <View style={[styles.stickyInner, { backgroundColor: theme.background }]}>
      <View style={[styles.searchBox, Shadows.button, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search saved items..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>
      <View style={styles.pillsRow}>
        <View style={styles.pillsSide} />
        <View style={styles.pillsCenter}>
          {([
            ['all', 'All', 'grid-outline', '#E11D48'],
            ['listing', 'Products', 'bag-handle-outline', '#3D6B4F'],
            ['vendor', 'Vendors', 'storefront-outline', '#0284C7'],
            ['post', 'Posts', 'newspaper-outline', '#D97706'],
          ] as const).map(([id, label, icon, tint]) => {
            const active = typeFilter === id;
            return (
              <Pressable
                key={id}
                onPress={() => setTypeFilter(id)}
                style={[
                  styles.pill,
                  active ? Shadows.buttonPressed : Shadows.button,
                  {
                    backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}>
                <Ionicons name={icon} size={11} color={active ? theme.tint : tint} />
                <ThemedText type="smallBold" style={styles.pillLabel}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.pillsSide}>
          {lists.length > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => setShowListFilter((v) => !v)}
              style={[
                styles.filterIconBtn,
                Shadows.button,
                {
                  backgroundColor: showListFilter ? '#000000' : theme.backgroundElement,
                },
              ]}>
              <Ionicons
                name="options-outline"
                size={14}
                color={showListFilter ? '#FFFFFF' : theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      {showListFilter && lists.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.listRow, styles.listRowContent]}>
          {[{ id: null, name: 'all lists' }, ...lists].map((list, index) => {
            const active = selectedListId === list.id;
            return (
              <View key={list.id ?? 'all'} style={styles.listItem}>
                {index > 0 ? (
                  <ThemedText themeColor="textSecondary" style={styles.listDot}>
                    ·
                  </ThemedText>
                ) : null}
                <Pressable hitSlop={8} onPress={() => setSelectedListId(list.id)}>
                  <ThemedText
                    style={[
                      styles.listLabel,
                      active && styles.listLabelActive,
                      { color: active ? '#D97706' : theme.textSecondary },
                    ]}>
                    {list.name}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  if (!user) {
    return (
      <ThemedView style={styles.guestScreen}>
        <View style={[styles.guestBody, { paddingBottom: insets.bottom + BottomTabInset + Spacing.four }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="heart-outline" size={36} color={theme.tint} />
          </View>
          <ThemedText type="smallBold" style={styles.guestTitle}>
            Save products you love
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.guestCopy}>
            Sign in to save posts, products, and vendors.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile?auth=signup')}
            style={({ pressed }) => [
              styles.guestBtn,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.guestBtnLabel}>
              Sign in
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <AccountScrollScreen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </AccountScrollScreen>
    );
  }

  return (
    <AccountScrollScreen
      sticky={sticky}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}>
      {isEmpty ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No saved items yet. Bookmark a post or tap the heart on a product or vendor.
        </ThemedText>
      ) : null}

      {showPosts && postsInView.length > 0 ? (
        <View style={styles.section}>
          {postsInView.map((post) => (
            <View key={post.id} style={styles.savedRow}>
              <FeedPostCard post={post} />
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (!user) return;
                  void unsavePost(user.uid, post.id).then(load);
                }}
                style={styles.removeBtn}>
                <Ionicons name="bookmark" size={18} color={theme.tint} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {showVendors && vendorsInView.length > 0 ? (
        <View style={styles.section}>
          {vendorsInView.map((bookmark) => (
            <View key={bookmark.id} style={styles.savedRow}>
              <ExploreVendorCard
                vendor={vendorBookmarkToCard(bookmark)}
                fromCategory={bookmark.categorySlug}
              />
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (!user) return;
                  void removeVendorBookmark(bookmark.id, user.uid).then(load);
                }}
                style={styles.removeBtn}>
                <Ionicons name="heart" size={18} color="#E11D48" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {showListings && listingsInView.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.productGrid}>
            {listingsInView.map((bookmark) => (
              <View key={bookmark.id} style={styles.productCell}>
                <ExploreListingCard
                  listing={listingBookmarkToCard(bookmark)}
                  grid
                  overlayActions
                />
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    if (!user) return;
                    void removeListingBookmark(bookmark.id, user.uid).then(load);
                  }}
                  style={styles.productRemove}>
                  <Ionicons name="heart" size={16} color="#E11D48" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </AccountScrollScreen>
  );
}

function vendorBookmarkToCard(bookmark: VendorBookmark): ExploreVendor {
  return {
    id: bookmark.vendorId,
    name: bookmark.vendorName,
    avatarUrl: bookmark.imageUrl ?? '',
    verified: bookmark.verified ?? false,
    foundingMember: bookmark.foundingMember ?? false,
    city: bookmark.location.split(',')[0]?.trim(),
    categories: bookmark.category ? [bookmark.category] : [],
    rating: 0,
    reviewCount: 0,
  };
}

function listingBookmarkToCard(bookmark: ListingBookmark): ExploreListing {
  return {
    id: bookmark.listingId,
    title: bookmark.listingTitle,
    description: bookmark.description ?? '',
    price: bookmark.price,
    currency: bookmark.currency,
    imageUrl: bookmark.imageUrl ?? '',
    vendorId: bookmark.vendorId,
    vendorName: bookmark.vendorName,
    vendorAvatarUrl: bookmark.vendorAvatarUrl ?? '',
    vendorVerified: false,
    vendorFoundingMember: bookmark.foundingMember ?? false,
    ratingAvg: 0,
    ratingCount: 0,
  };
}

const styles = StyleSheet.create({
  guestScreen: { flex: 1 },
  guestBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: { fontSize: 18, textAlign: 'center' },
  guestCopy: { textAlign: 'center' },
  guestBtn: {
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minWidth: 180,
    alignItems: 'center',
  },
  guestBtnLabel: { color: '#FFFFFF' },
  stickyInner: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  pillsSide: {
    width: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillsCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingRight: Spacing.one,
  },
  filterIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: Spacing.one },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  pillLabel: { fontSize: 11, lineHeight: 14 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  listRowContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    minWidth: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listDot: {
    fontSize: 14,
    lineHeight: 16,
    marginHorizontal: 6,
  },
  listLabel: {
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'lowercase',
  },
  listLabelActive: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  centered: { paddingVertical: Spacing.six, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
  section: { gap: Spacing.three },
  savedRow: { position: 'relative' },
  removeBtn: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  productCell: {
    width: '48%',
    position: 'relative',
  },
  productRemove: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    zIndex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
