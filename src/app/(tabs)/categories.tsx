import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExploreCategoryGrid } from '@/components/explore-category-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useChrome, useScrollChrome } from '@/lib/chrome';

export default function CategoriesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.chrome, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={styles.titleRow}>
          <Pressable
            hitSlop={8}
            onPress={() => router.replace('/explore' as never)}
            style={styles.sideButton}
            accessibilityLabel="Back to Explore">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.pageTitle}>
            Categories
          </ThemedText>
          <View style={styles.sideButton} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          Pick a category to browse products and vendors
        </ThemedText>
      </View>

      <ScrollView
        {...scrollChrome}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}>
        <ExploreCategoryGrid showTitle={false} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  chrome: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.one,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
