import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExploreListingCard } from '@/components/explore-listing-card';
import { FeedPostCard } from '@/components/feed-post-card';
import { ListingRatingSummary } from '@/components/listing-rating-summary';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VendorFollowButton } from '@/components/vendor-follow-button';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { BottomTabInset, EngagementColors, Fonts, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useChrome, useScrollChrome } from '@/lib/chrome';
import {
  categorySlugFromLabel,
  getCategoryBySlug,
} from '@/lib/explore-categories';
import { fetchPublishedVendorPosts, type FeedPost } from '@/lib/feed-posts';
import {
  fetchListingsByVendorId,
  fetchVendorById,
  type ExploreListing,
  type ExploreVendorDetail,
} from '@/lib/listings';
import { buildVendorWhatsAppUrl } from '@/lib/vendor-contact';
import { requireAuth } from '@/lib/require-auth';
import { getVendorFavoriteState, toggleVendorFavorite } from '@/lib/toggle-favorite';
import {
  fetchVendorReviews,
  getMyVendorReview,
  setMyVendorReview,
  type PublicVendorReview,
} from '@/lib/vendor-reviews';

type VendorPanel = 'bio' | 'share' | 'review';
type ProfileContentTab = 'products' | 'posts';

const BIO = '#0284C7';
const SHARE = '#7C3AED';
const REVIEW = '#D97706';
const WHATSAPP = '#25D366';
const BOOKMARK_BG = '#FFF7ED';

export default function VendorDetailScreen() {
  const { id, from, fromListing } = useLocalSearchParams<{
    id: string;
    from?: string;
    fromListing?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { user, userRole } = useAuth();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  const [vendor, setVendor] = useState<ExploreVendorDetail | null>(null);
  const [listings, setListings] = useState<ExploreListing[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [contentTab, setContentTab] = useState<ProfileContentTab>('products');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<VendorPanel | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioTruncated, setBioTruncated] = useState(false);
  const [reviews, setReviews] = useState<PublicVendorReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [favorited, setFavorited] = useState(false);

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  useEffect(() => {
    let cancelled = false;
    setContentTab('products');
    setPosts([]);
    setListings([]);
    setVendor(null);
    setLoading(true);
    (async () => {
      if (!id) {
        setError('Missing vendor id.');
        setLoading(false);
        return;
      }
      try {
        const [vendorRow, vendorListings] = await Promise.all([
          fetchVendorById(id),
          fetchListingsByVendorId(id),
        ]);
        if (!cancelled) {
          if (!vendorRow) setError('Vendor not found.');
          else {
            setVendor(vendorRow);
            setListings(vendorListings);
            // Products first when they exist; otherwise open Posts.
            setContentTab(vendorListings.length > 0 ? 'products' : 'posts');
            if (user) {
              const saved = await getVendorFavoriteState(user.uid, id);
              if (!cancelled) setFavorited(saved);
            }
            const [rows, mine] = await Promise.all([
              fetchVendorReviews(id).catch(() => [] as PublicVendorReview[]),
              user ? getMyVendorReview(id, user.uid).catch(() => null) : Promise.resolve(null),
            ]);
            if (cancelled) return;
            setReviews(rows);
            if (mine?.rating) {
              setMyRating(mine.rating);
              setCommentText(mine.comment);
            }
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load this vendor.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  useEffect(() => {
    if (!id || contentTab !== 'posts') return;
    let cancelled = false;
    setPostsLoading(true);
    void fetchPublishedVendorPosts(id)
      .then((rows) => {
        if (!cancelled) setPosts(rows);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setPostsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, contentTab]);

  const backCategory = useMemo(() => {
    const fromSlug = typeof from === 'string' ? from : '';
    if (fromSlug) return getCategoryBySlug(fromSlug);
    const first = vendor?.categories[0];
    return first ? getCategoryBySlug(categorySlugFromLabel(first)) : undefined;
  }, [from, vendor]);

  const primaryCategory = useMemo(() => {
    const first = vendor?.categories[0];
    return first ? getCategoryBySlug(categorySlugFromLabel(first)) : undefined;
  }, [vendor]);

  const gridWidth = (windowWidth - Spacing.three * 3) / 2;

  const shareUrl = Linking.createURL(`/vendor/${id}`);
  const shareText = vendor ? `Check out ${vendor.name} on WellnessXplora` : '';

  const copyLink = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        await Share.share({ message: `${shareText}\n${shareUrl}`, url: shareUrl });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* cancelled */
    }
  };

  const listingId = typeof fromListing === 'string' ? fromListing : '';

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (listingId) {
      router.replace(`/listing/${listingId}` as never);
      return;
    }
    if (typeof from === 'string' && from) {
      router.replace(`/category/${from}` as never);
      return;
    }
    router.replace('/explore' as never);
  };

  const openWhatsApp = async () => {
    if (!requireAuth(!!user, router, 'whatsapp')) return;
    if (!vendor?.whatsapp) return;
    await Linking.openURL(buildVendorWhatsAppUrl(vendor.whatsapp, vendor.name));
  };

  const saveRating = async () => {
    if (!vendor || myRating < 1) return;
    if (!requireAuth(!!user, router, 'rating') || !user) return;
    setPosting(true);
    try {
      const stats = await setMyVendorReview({
        vendorId: vendor.id,
        userId: user.uid,
        rating: myRating,
        comment: commentText,
        reviewerName: user.displayName || user.email?.split('@')[0] || 'Member',
      });
      setVendor((current) =>
        current ? { ...current, rating: stats.rating, reviewCount: stats.reviewCount } : current,
      );
      setReviews(await fetchVendorReviews(vendor.id));
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !vendor) {
    return (
      <ThemedView style={styles.centered}>
        <Pressable onPress={goBack} style={styles.fallbackBack}>
          <ThemedText type="smallBold">Back</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.error}>
          {error ?? 'Not found'}
        </ThemedText>
      </ThemedView>
    );
  }

  const bio = vendor.description.trim();
  const isOwnVendor = Boolean(user && user.uid === vendor.id);

  return (
    <ThemedView style={styles.screen}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          styles.backButton,
          Shadows.button,
          { top: insets.top + 8, backgroundColor: theme.backgroundElement },
        ]}>
        <Ionicons name="chevron-back" size={22} color={theme.text} />
      </Pressable>
      <ScrollView
        {...scrollChrome}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.five }}>
        <View>
          {vendor.coverUrl ? (
            <Image source={{ uri: vendor.coverUrl }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]} />
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.identityRow}>
            {vendor.avatarUrl ? (
              <Image source={{ uri: vendor.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <View style={styles.identityText}>
              <ThemedText numberOfLines={2} style={styles.vendorName}>
                {vendor.name}
              </ThemedText>
              <VendorTrustBadges
                verified={vendor.verified}
                foundingMember={vendor.foundingMember}
                size="md"
              />
              <ListingRatingSummary
                value={vendor.rating}
                reviewCount={vendor.reviewCount}
                size={12}
              />
              {backCategory ? (
                <Pressable
                  onPress={() => router.push(`/category/${backCategory.slug}`)}
                  style={styles.backToCategory}>
                  <Ionicons name="arrow-back" size={12} color={theme.tint} />
                  <ThemedText type="small" style={[styles.categoryLink, { color: theme.tint }]}>
                    Back to {backCategory.title}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.fabColumn}>
              <Pressable
                onPress={() => {
                  if (!vendor || !user) {
                    requireAuth(!!user, router, 'favorite');
                    return;
                  }
                  const categorySlug =
                    vendor.categories[0] != null
                      ? categorySlugFromLabel(vendor.categories[0])
                      : '';
                  void toggleVendorFavorite(true, router, user.uid, {
                    vendorId: vendor.id,
                    vendorName: vendor.name,
                    category: primaryCategory?.title ?? vendor.categories[0] ?? '',
                    categorySlug,
                    location: vendor.locationLabel ?? vendor.city ?? '',
                    imageUrl: vendor.avatarUrl,
                    verified: vendor.verified,
                    foundingMember: vendor.foundingMember,
                  }).then((next) => {
                    if (typeof next === 'boolean') setFavorited(next);
                  });
                }}
                accessibilityLabel={favorited ? 'Remove from saved' : 'Save vendor'}
                style={[styles.actionFab, Shadows.button, { backgroundColor: BOOKMARK_BG }]}>
                <Ionicons
                  name={favorited ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={favorited ? EngagementColors.bookmark : theme.text}
                />
              </Pressable>
              {!isOwnVendor ? <VendorFollowButton vendorId={vendor.id} variant="icon" /> : null}
              {vendor.whatsapp ? (
                <Pressable
                  onPress={() => void openWhatsApp()}
                  style={[styles.whatsappFab, Shadows.button]}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.tabRow}>
            {([
              ['bio', 'Bio', BIO],
              ['share', 'Share', SHARE],
              ['review', 'Review', REVIEW],
            ] as const).map(([id, label, color], index) => {
              const active = panel === id;
              return (
                <View key={id} style={styles.tabWrap}>
                  {index > 0 ? (
                    <ThemedText themeColor="textSecondary" style={styles.dot}>
                      ·
                    </ThemedText>
                  ) : null}
                  <Pressable hitSlop={8} onPress={() => setPanel((current) => (current === id ? null : id))}>
                    <ThemedText
                      type="smallBold"
                      style={{
                        color,
                        textDecorationLine: active ? 'underline' : 'none',
                        textDecorationColor: color,
                      }}>
                      {label}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {panel ? <View style={[styles.tabRule, { backgroundColor: theme.backgroundSelected }]} /> : null}

          {panel === 'bio' ? (
            <View style={styles.panel}>
              {primaryCategory ? (
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  {primaryCategory.title}
                </ThemedText>
              ) : null}
              {vendor.locationLabel ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.locationText}>
                    {vendor.locationLabel}
                  </ThemedText>
                </View>
              ) : null}
              {bio ? (
                <>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={bioExpanded ? 6 : 3}
                    ellipsizeMode="tail"
                    onTextLayout={(e) => {
                      if (!bioExpanded) setBioTruncated(e.nativeEvent.lines.length >= 3);
                    }}>
                    {bio}
                  </ThemedText>
                  {bioTruncated || bioExpanded ? (
                    <Pressable onPress={() => setBioExpanded((v) => !v)}>
                      <ThemedText type="smallBold" style={{ color: theme.tint }}>
                        {bioExpanded ? 'Show less' : 'Show more'}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  No bio yet.
                </ThemedText>
              )}
            </View>
          ) : null}

          {panel === 'share' ? (
            <View style={styles.panel}>
              {(
                [
                  ['copy', copied ? 'Copied!' : 'Copy link', 'link-outline'],
                  ['whatsapp', 'WhatsApp', 'logo-whatsapp'],
                  ['message', 'Message', 'mail-outline'],
                  ['facebook', 'Facebook', 'logo-facebook'],
                  ['x', 'X (Twitter)', 'logo-twitter'],
                ] as const
              ).map(([id, label, icon]) => (
                <Pressable
                  key={id}
                  onPress={() => {
                    const encoded = encodeURIComponent(`${shareText} ${shareUrl}`);
                    if (id === 'copy') void copyLink();
                    else if (id === 'whatsapp') void Linking.openURL(`https://wa.me/?text=${encoded}`);
                    else if (id === 'message') void Linking.openURL(`sms:?body=${encoded}`);
                    else if (id === 'facebook') {
                      void Linking.openURL(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                      );
                    } else {
                      void Linking.openURL(
                        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                      );
                    }
                  }}
                  style={styles.shareRow}>
                  <Ionicons name={icon} size={18} color={theme.text} />
                  <ThemedText type="small">{label}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {panel === 'review' ? (
            <View style={[styles.reviewCard, { borderColor: theme.backgroundSelected }]}>
              <ListingRatingSummary
                value={vendor.rating}
                reviewCount={vendor.reviewCount}
                size={12}
              />
              <View style={[styles.reviewComposer, { backgroundColor: theme.background }]}>
                <View style={styles.reviewerRow}>
                  <StarRating
                    value={myRating}
                    size={22}
                    interactive
                    onChange={setMyRating}
                  />
                  <ThemedText type="smallBold">
                    @{user?.displayName || user?.email?.split('@')[0] || 'you'}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Optional note with your rating
                </ThemedText>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="What stood out about this vendor?"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[
                    styles.commentInput,
                    {
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                />
                <Pressable
                  disabled={posting || myRating < 1}
                  onPress={() => void saveRating()}
                  style={[
                    styles.saveRating,
                    { opacity: posting || myRating < 1 ? 0.45 : 1, backgroundColor: BOOKMARK_BG },
                  ]}>
                  {posting ? (
                    <ActivityIndicator />
                  ) : (
                    <ThemedText type="smallBold">Save rating</ThemedText>
                  )}
                </Pressable>
              </View>
              {reviews.map((row) => (
                <View key={row.id} style={styles.reviewRow}>
                  <ThemedText type="smallBold">{row.reviewerName}</ThemedText>
                  <StarRating value={row.rating} size={12} showValue />
                  {row.comment ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {row.comment}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.contentTabs}>
            {(
              [
                ['products', 'Products', 'bag-handle-outline'],
                ['posts', 'Posts', 'newspaper-outline'],
              ] as const
            ).map(([tabId, label, icon]) => {
              const active = contentTab === tabId;
              return (
                <Pressable
                  key={tabId}
                  onPress={() => setContentTab(tabId)}
                  style={[
                    styles.contentTab,
                    Shadows.button,
                    {
                      backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: active ? theme.tint : theme.backgroundSelected,
                    },
                  ]}>
                  <Ionicons name={icon} size={14} color={active ? theme.tint : theme.textSecondary} />
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? theme.tint : theme.textSecondary, fontSize: 13 }}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {contentTab === 'products' ? (
            <>
              {listings.length === 0 ? (
                isOwnVendor && userRole !== 'vendor' ? (
                  <View style={styles.memberProductsEmpty}>
                    <Ionicons name="storefront-outline" size={28} color={theme.tint} />
                    <ThemedText type="smallBold" style={{ textAlign: 'center' }}>
                      Member account
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={{ textAlign: 'center' }}>
                      You have a member account, not a vendor account. Become a vendor in account
                      settings to list products or services.
                    </ThemedText>
                    <Pressable
                      onPress={() => router.push('/profile' as never)}
                      style={[styles.memberCta, { backgroundColor: theme.tint }]}>
                      <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                        Go to account settings
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    No active products yet.
                  </ThemedText>
                )
              ) : (
                <View style={styles.productGrid}>
                  {listings.map((item) => (
                    <View key={item.id} style={{ width: gridWidth }}>
                      <ExploreListingCard
                        listing={item}
                        grid
                        hideVendor
                        showDescription
                        overlayActions
                        fromVendor={vendor.id}
                      />
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : postsLoading ? (
            <ActivityIndicator color={theme.tint} style={{ marginTop: Spacing.three }} />
          ) : posts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No posts yet.
            </ThemedText>
          ) : (
            <View style={styles.postsList}>
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} vendorVerified={vendor.verified} />
              ))}
            </View>
          )}
        </View>
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
    gap: Spacing.three,
  },
  fallbackBack: { padding: Spacing.two },
  cover: {
    width: '100%',
    height: 180,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 30,
    elevation: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  infoCard: {
    marginTop: -36,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  identityText: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  vendorName: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    lineHeight: 16,
  },
  backToCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryLink: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  fabColumn: {
    gap: Spacing.two,
    paddingTop: 4,
  },
  actionFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  tabWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    fontSize: 16,
    lineHeight: 18,
  },
  tabRule: {
    height: StyleSheet.hairlineWidth,
    marginTop: -Spacing.two,
  },
  panel: {
    gap: Spacing.two,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 8,
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  reviewComposer: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  commentInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  saveRating: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewRow: {
    gap: 4,
  },
  productsTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    marginTop: Spacing.two,
  },
  contentTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  contentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  memberProductsEmpty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  memberCta: {
    marginTop: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  postsList: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  error: {
    color: '#B42318',
    textAlign: 'center',
  },
});
