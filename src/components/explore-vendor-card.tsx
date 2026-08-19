import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ListingRatingSummary } from '@/components/listing-rating-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCategoryBySlug, categorySlugFromLabel } from '@/lib/explore-categories';
import type { ExploreVendor } from '@/lib/listings';

type Props = {
  vendor: ExploreVendor;
  fromCategory?: string;
};

export function ExploreVendorCard({ vendor, fromCategory }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const primaryCategory = vendor.categories.length > 0
    ? getCategoryBySlug(categorySlugFromLabel(vendor.categories[0]))
    : undefined;

  return (
    <Pressable
      onPress={() =>
        router.push(
          fromCategory ? `/vendor/${vendor.id}?from=${fromCategory}` : `/vendor/${vendor.id}`,
        )
      }
      style={({ pressed }) => [
        { opacity: pressed ? 0.92 : 1 },
      ]}>
      <ThemedView type="backgroundElement" style={[styles.card, Shadows.card]}>
        {vendor.avatarUrl ? (
          <Image source={{ uri: vendor.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
              {vendor.name}
            </ThemedText>
            <VendorTrustBadges
              verified={vendor.verified}
              foundingMember={vendor.foundingMember}
              size="sm"
            />
            {vendor.reviewCount > 0 || vendor.rating > 0 ? (
              <ListingRatingSummary
                value={vendor.rating}
                reviewCount={vendor.reviewCount}
                size={10}
                style={styles.ratingBadge}
              />
            ) : null}
          </View>
          {primaryCategory ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {primaryCategory.title}
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
  },
  ratingBadge: {
    flexShrink: 0,
  },
});
