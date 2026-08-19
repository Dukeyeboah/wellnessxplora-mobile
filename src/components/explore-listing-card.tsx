import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ListingRatingSummary } from '@/components/listing-rating-summary';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { formatListingPrice, type ExploreListing } from '@/lib/listings';
import { requireAuth } from '@/lib/require-auth';

type Props = {
  listing: ExploreListing;
  /** Horizontal carousel cards. */
  compact?: boolean;
  /** Override compact card width (full-bleed mobile carousels). */
  compactWidth?: number;
  /** Edge-to-edge image, matching the product-page hero. */
  fullBleed?: boolean;
  /** Two-column category grid card. */
  grid?: boolean;
  /** Horizontal vendor-page list card. */
  list?: boolean;
  /** Hide vendor row (vendor’s own products). */
  hideVendor?: boolean;
  /** Show 2-line description under title (vendor grid). */
  showDescription?: boolean;
  /** Heart top-left, cart top-right on the image (carousels + vendor grid). */
  overlayActions?: boolean;
  /** Return to this vendor after opening the listing. */
  fromVendor?: string;
};

export function ExploreListingCard({
  listing,
  compact = false,
  compactWidth,
  fullBleed = false,
  grid = false,
  list = false,
  hideVendor = false,
  showDescription = false,
  overlayActions = false,
  fromVendor,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const price = formatListingPrice(listing);
  const description = listing.description.trim();
  const showVendor = !hideVendor && !list;
  const useOverlay = overlayActions || compact || fullBleed;

  const openListing = () =>
    router.push(
      fromVendor ? `/listing/${listing.id}?fromVendor=${fromVendor}` : `/listing/${listing.id}`,
    );

  const openVendor = () => {
    if (!listing.vendorId) return;
    router.push(`/vendor/${listing.vendorId}`);
  };

  const onFavorite = () => {
    requireAuth(!!user, router, 'favorite');
  };

  const onAddToCart = () => {
    requireAuth(!!user, router, 'cart');
  };

  const imageOverlay = useOverlay ? (
    <>
      <Pressable
        hitSlop={8}
        onPress={onFavorite}
        style={[styles.overlayBtn, styles.overlayLeft, { backgroundColor: theme.background }]}>
        <Ionicons name="heart-outline" size={grid ? 14 : 16} color={theme.text} />
      </Pressable>
      <Pressable
        hitSlop={8}
        onPress={onAddToCart}
        style={[styles.overlayBtn, styles.overlayRight, { backgroundColor: theme.background }]}>
        <Ionicons name="cart-outline" size={grid ? 14 : 16} color={theme.text} />
      </Pressable>
    </>
  ) : (
    <Pressable
      hitSlop={8}
      onPress={onFavorite}
      style={[styles.overlayBtn, styles.overlayRight, { backgroundColor: theme.background }]}>
      <Ionicons name="heart-outline" size={grid ? 14 : 16} color={theme.text} />
    </Pressable>
  );

  const imageBlock = (
    <View style={styles.imageWrap}>
      <Pressable onPress={openListing}>
        {listing.imageUrl ? (
          <Image
            source={{ uri: listing.imageUrl }}
            style={[
              styles.image,
              compact && styles.imageCompact,
              fullBleed && styles.imageBleed,
              grid && styles.imageGrid,
              list && styles.listImage,
            ]}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.image,
              compact && styles.imageCompact,
              fullBleed && styles.imageBleed,
              grid && styles.imageGrid,
              list && styles.listImage,
              styles.imagePlaceholder,
              { backgroundColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="small" themeColor="textSecondary">
              {grid ? '✨' : 'No image'}
            </ThemedText>
          </View>
        )}
      </Pressable>
      {imageOverlay}
    </View>
  );

  if (list) {
    return (
      <View
        style={[
          styles.listCard,
          Shadows.card,
          { backgroundColor: theme.backgroundElement },
        ]}>
        {imageBlock}
        <Pressable onPress={openListing} style={styles.listBody}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {listing.title}
            </ThemedText>
            {price ? (
              <ThemedText type="smallBold" style={styles.price}>
                {price}
              </ThemedText>
            ) : null}
          </View>
          {description ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={2}
              style={styles.description}>
              {description}
            </ThemedText>
          ) : null}
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.cardLift,
        compact && styles.cardCompact,
        grid && styles.cardGrid,
        fullBleed && styles.cardBleed,
        compact && compactWidth ? { width: compactWidth } : null,
        !fullBleed ? Shadows.card : null,
      ]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, fullBleed && styles.cardBleedInner, grid && styles.cardGridInner]}>
        {imageBlock}

        <Pressable onPress={openListing} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
          <View
            style={[
              styles.body,
              compact && styles.bodyCompact,
              fullBleed && styles.bodyBleed,
              grid && styles.bodyGrid,
            ]}>
            <View style={styles.titleRow}>
              <ThemedText type="smallBold" numberOfLines={1} style={[styles.title, grid && styles.titleGrid]}>
                {listing.title}
              </ThemedText>
              {price ? (
                <ThemedText type="smallBold" style={[styles.price, grid && styles.titleGrid]}>
                  {price}
                </ThemedText>
              ) : null}
            </View>

            <ListingRatingSummary
              value={listing.ratingAvg}
              reviewCount={listing.ratingCount}
              size={11}
              style={styles.ratingRow}
              emptyItalic
            />

            {showDescription && description ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={2}
                style={styles.description}>
                {description}
              </ThemedText>
            ) : null}

            {showVendor ? (
              <Pressable
                onPress={openVendor}
                style={({ pressed }) => [styles.vendorRow, { opacity: pressed ? 0.75 : 1 }]}>
                {listing.vendorAvatarUrl ? (
                  <Image
                    source={{ uri: listing.vendorAvatarUrl }}
                    style={[styles.avatar, grid && styles.avatarGrid]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      grid && styles.avatarGrid,
                      { backgroundColor: theme.backgroundSelected },
                    ]}
                  />
                )}
                <ThemedText
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={[styles.vendorName, grid && styles.vendorNameGrid]}>
                  {listing.vendorName}
                </ThemedText>
                <VendorTrustBadges verified={listing.vendorVerified} size="xs" />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardLift: {
    borderRadius: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  cardCompact: {
    width: 176,
  },
  cardGrid: {
    flex: 1,
  },
  cardGridInner: {
    flex: 1,
  },
  cardBleed: {
    borderRadius: 0,
  },
  cardBleedInner: {
    borderRadius: 0,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 148,
  },
  imageCompact: {
    height: 156,
  },
  imageBleed: {
    height: 220,
  },
  imageGrid: {
    height: 118,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBtn: {
    position: 'absolute',
    top: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  overlayLeft: {
    left: Spacing.two,
  },
  overlayRight: {
    right: Spacing.two,
  },
  body: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: 4,
  },
  bodyCompact: {
    paddingHorizontal: Spacing.three,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  bodyBleed: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  bodyGrid: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  titleGrid: {
    fontSize: 12,
    lineHeight: 16,
  },
  price: {
    fontSize: 13,
    lineHeight: 18,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  avatarGrid: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  vendorName: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  vendorNameGrid: {
    fontSize: 10,
    lineHeight: 13,
  },
  ratingRow: {
    alignSelf: 'flex-start',
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  listImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  listBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
});
