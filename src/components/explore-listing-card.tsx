import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatListingPrice, type ExploreListing } from '@/lib/listings';

type Props = {
  listing: ExploreListing;
  /** Horizontal carousel cards are narrower. */
  compact?: boolean;
};

export function ExploreListingCard({ listing, compact = false }: Props) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, compact && styles.cardCompact]}>
      {listing.imageUrl ? (
        <Image
          source={{ uri: listing.imageUrl }}
          style={[styles.image, compact && styles.imageCompact]}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.image,
            compact && styles.imageCompact,
            styles.imagePlaceholder,
            { backgroundColor: theme.backgroundSelected },
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            No image
          </ThemedText>
        </View>
      )}

      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {listing.title}
        </ThemedText>

        <View style={styles.vendorRow}>
          {listing.vendorAvatarUrl ? (
            <Image
              source={{ uri: listing.vendorAvatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.vendorName}>
            {listing.vendorName}
            {listing.vendorVerified ? ' · ✓' : ''}
          </ThemedText>
        </View>

        <ThemedText type="smallBold">{formatListingPrice(listing)}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  cardCompact: {
    width: 176,
  },
  image: {
    width: '100%',
    height: 160,
  },
  imageCompact: {
    height: 140,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  vendorName: {
    flex: 1,
  },
});
