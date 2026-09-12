import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingRatingSummary } from '@/components/listing-rating-summary';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { BottomTabInset, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useChrome, useScrollChrome } from '@/lib/chrome';
import {
  addListingComment,
  getMyListingRating,
  loadListingComments,
  loadListingRatingStats,
  setMyListingRating,
  type ListingCommentRow,
} from '@/lib/listing-feedback';
import { requireAuth } from '@/lib/require-auth';
import { useCartModal } from '@/lib/cart-modal';
import { useCart } from '@/lib/cart-context';
import { getListingFavoriteState, toggleListingFavorite } from '@/lib/toggle-favorite';
import {
  fetchListingById,
  formatListingPrice,
  type ExploreListingDetail,
} from '@/lib/listings';

type DetailTab = 'about' | 'reviews';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string; fromVendor?: string; from?: string }>();
  const id = firstParam(params.id);
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { openAddToCart } = useCartModal();
  const { isInCart } = useCart();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  const [listing, setListing] = useState<ExploreListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('about');
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [aboutTruncated, setAboutTruncated] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<ListingCommentRow[]>([]);
  const [posting, setPosting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  const refreshFeedback = useCallback(async (listingId: string) => {
    const [rows, stats] = await Promise.all([
      loadListingComments(listingId),
      loadListingRatingStats([listingId]),
    ]);
    setComments(rows);
    const stat = stats.get(listingId);
    setListing((current) =>
      current
        ? { ...current, ratingAvg: stat?.avg ?? 0, ratingCount: stat?.count ?? 0 }
        : current,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setError('Missing listing id.');
        setLoading(false);
        return;
      }
      try {
        const row = await fetchListingById(id);
        if (cancelled) return;
        if (!row) {
          setError('Listing not found or inactive.');
          return;
        }
        setListing(row);
        if (user) {
          const saved = await getListingFavoriteState(user.uid, row.id);
          if (!cancelled) setFavorited(saved);
        }
        const [rows, mine] = await Promise.all([
          loadListingComments(id).catch(() => [] as ListingCommentRow[]),
          user ? getMyListingRating(id, user.uid).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setComments(rows);
        if (mine) setMyRating(mine);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load this listing.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const onShare = async () => {
    if (!listing) return;
    const url = Linking.createURL(`/listing/${listing.id}`);
    try {
      await Share.share({
        title: listing.title,
        message: Platform.OS === 'ios' ? listing.title : `${listing.title}\n${url}`,
        url,
      });
    } catch {
      /* user cancelled or share unavailable */
    }
  };

  const onPickStar = async (rating: number) => {
    if (!listing || !requireAuth(!!user, router, 'favorite') || !user) return;
    setMyRating(rating);
    try {
      await setMyListingRating(listing.id, listing.vendorId, user.uid, rating);
      await refreshFeedback(listing.id);
    } catch (err) {
      console.error(err);
    }
  };

  const onPostComment = async () => {
    if (!listing || !user || !commentText.trim()) return;
    setPosting(true);
    try {
      if (myRating > 0) {
        await setMyListingRating(listing.id, listing.vendorId, user.uid, myRating);
      }
      await addListingComment({
        listingId: listing.id,
        vendorId: listing.vendorId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Member',
        userPhotoURL: user.photoURL ?? undefined,
        text: commentText,
      });
      setCommentText('');
      await refreshFeedback(listing.id);
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const fromVendor = firstParam(params.fromVendor);
  const from = firstParam(params.from);

  const goBack = () => {
    if (fromVendor) {
      if (router.canGoBack()) router.back();
      else router.push(`/vendor/${fromVendor}`);
      return;
    }
    if (from === 'discover') {
      if (router.canGoBack()) router.back();
      else router.replace('/discover');
      return;
    }
    if (router.canGoBack()) {
      router.dismissTo('/explore');
      return;
    }
    router.replace('/explore');
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !listing) {
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

  const description = listing.description.trim();
  const price = formatListingPrice(listing);
  const inCart = isInCart(listing.vendorId, listing.id);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        {...scrollChrome}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.five },
        ]}>
        <View>
          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              style={styles.hero}
              contentFit="cover"
              contentPosition="top"
            />
          ) : (
            <View style={[styles.hero, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <Pressable
            onPress={goBack}
            style={[
              styles.backButton,
              Shadows.button,
              { top: insets.top + 8, backgroundColor: theme.backgroundElement },
            ]}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (!listing || !user) {
                requireAuth(!!user, router, 'favorite');
                return;
              }
              void toggleListingFavorite(true, router, user.uid, {
                listingId: listing.id,
                vendorId: listing.vendorId,
                listingTitle: listing.title,
                listingType: listing.type,
                vendorName: listing.vendorName,
                category: listing.categoryTitle ?? '',
                price: listing.price,
                currency: listing.currency,
                imageUrl: listing.imageUrl,
              }).then((next) => {
                if (typeof next === 'boolean') setFavorited(next);
              });
            }}
            style={[
              styles.heartButton,
              Shadows.button,
              { top: insets.top + 8, backgroundColor: theme.backgroundElement },
            ]}>
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={20}
              color={favorited ? '#E11D48' : theme.text}
            />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" numberOfLines={2} style={styles.productTitle}>
              {listing.title}
            </ThemedText>
            {price ? (
              <ThemedText type="smallBold" style={styles.price}>
                {price}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            {listing.categorySlug && listing.categoryTitle ? (
              <Pressable
                onPress={() => router.push(`/category/${listing.categorySlug}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexShrink: 1 })}>
                <ThemedText type="small" style={{ color: theme.tint }}>
                  {listing.categoryTitle}
                </ThemedText>
              </Pressable>
            ) : (
              <View />
            )}
            <ListingRatingSummary
              value={listing.ratingAvg}
              reviewCount={listing.ratingCount}
              size={12}
              style={styles.metaRating}
            />
          </View>

          <View style={styles.vendorLine}>
            <Pressable
              onPress={() => {
                if (listing.vendorId) {
                  router.push(
                    listing.categorySlug
                      ? `/vendor/${listing.vendorId}?from=${listing.categorySlug}`
                      : `/vendor/${listing.vendorId}`,
                  );
                }
              }}
              style={({ pressed }) => [styles.vendorCard, { opacity: pressed ? 0.8 : 1 }]}>
              {listing.vendorAvatarUrl ? (
                <Image
                  source={{ uri: listing.vendorAvatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]} />
              )}
              <View style={styles.vendorNameRow}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.vendorName}>
                  {listing.vendorName}
                </ThemedText>
                <VendorTrustBadges
                  verified={listing.vendorVerified}
                  foundingMember={listing.vendorFoundingMember}
                  size="sm"
                />
              </View>
            </Pressable>

            <View style={styles.iconActions}>
              <Pressable
                onPress={() => {
                  openAddToCart({
                    id: listing.id,
                    title: listing.title,
                    description: listing.description,
                    price: listing.price,
                    currency: listing.currency,
                    imageUrl: listing.imageUrl,
                    vendorId: listing.vendorId,
                    vendorName: listing.vendorName,
                    vendorAvatarUrl: listing.vendorAvatarUrl,
                    vendorVerified: listing.vendorVerified,
                    vendorFoundingMember: listing.vendorFoundingMember,
                    ratingAvg: listing.ratingAvg,
                    ratingCount: listing.ratingCount,
                    categorySlug: listing.categorySlug,
                  });
                }}
                style={[
                  styles.iconButton,
                  { backgroundColor: inCart ? theme.tint : theme.backgroundSelected },
                ]}>
                <Ionicons
                  name={inCart ? 'cart' : 'cart-outline'}
                  size={20}
                  color={inCart ? '#FFFFFF' : theme.text}
                />
              </Pressable>
              <Pressable
                onPress={() => void onShare()}
                style={[styles.iconButton, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="share-outline" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.tabRow}>
            {(['about', 'reviews'] as const).map((id) => {
              const active = tab === id;
              return (
                <Pressable key={id} onPress={() => setTab(id)} hitSlop={8} style={styles.tab}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? theme.tint : theme.textSecondary }}>
                    {id === 'about' ? 'About' : 'Reviews'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {tab === 'about' ? (
            description ? (
              <View style={styles.aboutBlock}>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={aboutExpanded ? 6 : 4}
                  ellipsizeMode="tail"
                  onTextLayout={(e) => {
                    if (!aboutExpanded) {
                      setAboutTruncated(e.nativeEvent.lines.length >= 4);
                    }
                  }}>
                  {description}
                </ThemedText>
                {aboutTruncated || aboutExpanded ? (
                  <Pressable onPress={() => setAboutExpanded((v) => !v)}>
                    <ThemedText type="smallBold" style={{ color: theme.tint }}>
                      {aboutExpanded ? 'Show less' : 'Show more'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No description yet.
              </ThemedText>
            )
          ) : (
            <View style={styles.reviewsBlock}>
              <View style={styles.commentsHeader}>
                <ThemedText type="smallBold">Comments</ThemedText>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    if (!requireAuth(!!user, router, 'favorite')) return;
                    setReviewOpen((v) => !v);
                  }}>
                  <ThemedText type="smallBold" style={{ color: theme.tint }}>
                    Rate product
                  </ThemedText>
                </Pressable>
              </View>

              {reviewOpen ? (
                <View style={styles.reviewComposer}>
                  <StarRating
                    value={myRating}
                    size={20}
                    interactive
                    onChange={(rating) => {
                      setMyRating(rating);
                    }}
                  />
                  {myRating > 0 ? (
                    <>
                      <TextInput
                        multiline
                        value={commentText}
                        onChangeText={setCommentText}
                        placeholder="Add a comment to save your rating…"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                          styles.commentInput,
                          {
                            color: theme.text,
                            borderColor: theme.backgroundSelected,
                            backgroundColor: theme.backgroundElement,
                          },
                        ]}
                      />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.ratingHint}>
                        A comment is required to save your rating.
                      </ThemedText>
                      <View style={styles.reviewActions}>
                        <Pressable
                          hitSlop={8}
                          onPress={() => {
                            setReviewOpen(false);
                            setMyRating(0);
                            setCommentText('');
                          }}>
                          <ThemedText type="smallBold" themeColor="textSecondary">
                            Cancel
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          disabled={posting || !commentText.trim()}
                          onPress={() => void onPostComment()}
                          style={({ pressed }) => [
                            styles.postButton,
                            {
                              backgroundColor: theme.tint,
                              opacity: posting || !commentText.trim() ? 0.4 : pressed ? 0.85 : 1,
                            },
                          ]}>
                          {posting ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <ThemedText type="smallBold" style={styles.postLabel}>
                              Post &amp; save rating
                            </ThemedText>
                          )}
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Tap a star to rate, then write a comment.
                    </ThemedText>
                  )}
                </View>
              ) : null}

              {comments.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No comments yet.
                </ThemedText>
              ) : (
                comments.map((row) => (
                  <View key={row.id} style={styles.commentRow}>
                    <ThemedText type="smallBold">{row.userName}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {row.text}
                    </ThemedText>
                  </View>
                ))
              )}
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
  fallbackBack: {
    padding: Spacing.two,
  },
  content: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    width: '100%',
    height: 320,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  metaRating: {
    flexShrink: 0,
  },
  productTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
  },
  price: {
    fontSize: 18,
    lineHeight: 24,
  },
  vendorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  vendorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  vendorNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vendorName: {
    flexShrink: 1,
  },
  iconActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  tab: {
    paddingVertical: 4,
  },
  aboutBlock: {
    gap: Spacing.two,
  },
  reviewsBlock: {
    gap: Spacing.three,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewComposer: {
    gap: Spacing.two,
  },
  ratingHint: {
    fontSize: 11,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  commentInput: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  postButton: {
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postLabel: {
    color: '#FFFFFF',
  },
  commentRow: {
    gap: 4,
  },
  error: {
    color: '#B42318',
    textAlign: 'center',
  },
});
