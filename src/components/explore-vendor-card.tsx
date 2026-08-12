import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExploreVendor } from '@/lib/listings';

type Props = {
  vendor: ExploreVendor;
};

export function ExploreVendorCard({ vendor }: Props) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {vendor.avatarUrl ? (
        <Image source={{ uri: vendor.avatarUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {vendor.name}
          {vendor.verified ? ' · ✓' : ''}
        </ThemedText>
        {vendor.city ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {vendor.city}
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
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
});
