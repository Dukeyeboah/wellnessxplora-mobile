import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LOGO_SOURCES } from '@/lib/category-logos';
import { EXPLORE_CATEGORIES } from '@/lib/explore-categories';

export function ExploreCategoryGrid() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.title}>
        Browse all categories
      </ThemedText>
      <View style={styles.grid}>
        {EXPLORE_CATEGORIES.map((category) => {
          const logo = CATEGORY_LOGO_SOURCES[category.slug];
          return (
            <Pressable
              key={category.slug}
              onPress={() => router.push(`/category/${category.slug}`)}
              style={({ pressed }) => [
                styles.cardLift,
                Shadows.card,
                {
                  backgroundColor: theme.backgroundElement,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <View style={styles.card}>
                {logo ? (
                  <Image source={logo} style={styles.image} contentFit="cover" />
                ) : (
                  <View
                    style={[styles.image, { backgroundColor: theme.backgroundSelected }]}
                  />
                )}
                <ThemedText
                  type="smallBold"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={styles.cardTitle}>
                  {category.title}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.four,
  },
  cardLift: {
    width: '48%',
    borderRadius: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 112,
  },
  cardTitle: {
    fontSize: 12,
    lineHeight: 16,
    height: 32,
    overflow: 'hidden',
    paddingHorizontal: Spacing.two,
    paddingVertical: 0,
    marginVertical: Spacing.two,
  },
});
