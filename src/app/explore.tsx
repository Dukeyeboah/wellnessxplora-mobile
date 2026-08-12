import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExploreListingCard } from '@/components/explore-listing-card';
import { ExploreVendorCard } from '@/components/explore-vendor-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchExploreHubCarousels,
  fetchExploreProducts,
  fetchExploreVendors,
  filterListingsBySearch,
  filterVendorsBySearch,
  type ExploreCarouselSection,
  type ExploreListing,
  type ExploreVendor,
} from '@/lib/listings';

type HubView = 'all' | 'products' | 'vendors';

const VIEW_PILLS: { id: HubView; label: string; tint: string }[] = [
  { id: 'all', label: 'All', tint: '#F43F5E' },
  { id: 'products', label: 'Products', tint: '#F59E0B' },
  { id: 'vendors', label: 'Vendors', tint: '#059669' },
];

/**
 * Phase 4b: Explore hub shaped like the website —
 * search + All/Products/Vendors + horizontal “Popular in…” carousels.
 */
export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<HubView>('all');
  const [search, setSearch] = useState('');
  const [carousels, setCarousels] = useState<ExploreCarouselSection[]>([]);
  const [products, setProducts] = useState<ExploreListing[]>([]);
  const [vendors, setVendors] = useState<ExploreVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [hub, productRows, vendorRows] = await Promise.all([
        fetchExploreHubCarousels(),
        fetchExploreProducts(),
        fetchExploreVendors(),
      ]);
      setCarousels(hub);
      setProducts(productRows);
      setVendors(vendorRows);
    } catch (err) {
      console.error('Explore hub fetch failed', err);
      setError('Could not load Explore. Pull to refresh or try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(
    () => filterListingsBySearch(products, search),
    [products, search],
  );
  const filteredVendors = useMemo(
    () => filterVendorsBySearch(vendors, search),
    [vendors, search],
  );
  const filteredCarousels = useMemo(() => {
    if (search.trim().length < 2) return carousels;
    return carousels
      .map((section) => ({
        ...section,
        listings: filterListingsBySearch(section.listings, search),
      }))
      .filter((section) => section.listings.length > 0);
  }, [carousels, search]);

  const bottomPad = insets.bottom + BottomTabInset + Spacing.three;

  const header = (
    <View style={styles.header}>
      <ThemedText type="title" style={styles.brand}>
        WellnessXplora
      </ThemedText>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}>
        <ThemedText type="small" themeColor="textSecondary">
          ⌕
        </ThemedText>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search wellness products, vendors etc..."
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}>
        {VIEW_PILLS.map((pill) => {
          const active = view === pill.id;
          return (
            <Pressable
              key={pill.id}
              onPress={() => setView(pill.id)}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: active ? theme.textSecondary : 'transparent',
                },
              ]}>
              <View style={[styles.pillDot, { backgroundColor: pill.tint }]} />
              <ThemedText type="smallBold">{pill.label}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
        <ThemedText type="small" themeColor="textSecondary">
          Loading Explore…
        </ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold" style={styles.errorText}>
          {error}
        </ThemedText>
        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [
            styles.retry,
            { borderColor: theme.text, opacity: pressed ? 0.7 : 1 },
          ]}>
          <ThemedText type="smallBold">Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (view === 'all') {
    return (
      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.three,
              paddingBottom: bottomPad,
            },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }>
          {header}

          {filteredCarousels.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No listings match your search.
            </ThemedText>
          ) : (
            filteredCarousels.map((section) => (
              <View key={section.slug} style={styles.section}>
                <ThemedText type="subtitle">{section.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {section.subtitle}
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContent}>
                  {section.listings.map((item, index) => (
                    <View
                      key={item.id}
                      style={index < section.listings.length - 1 ? styles.carouselItem : undefined}>
                      <ExploreListingCard listing={item} compact />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))
          )}
        </ScrollView>
      </ThemedView>
    );
  }

  if (view === 'products') {
    return (
      <ThemedView style={styles.screen}>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: insets.top + Spacing.three,
              paddingBottom: bottomPad,
            },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          ListHeaderComponent={header}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No products found.
            </ThemedText>
          }
          ItemSeparatorComponent={() => <View style={styles.listGap} />}
          renderItem={({ item }) => <ExploreListingCard listing={item} />}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={filteredVendors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: bottomPad,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No vendors found.
          </ThemedText>
        }
        ItemSeparatorComponent={() => <View style={styles.listGap} />}
        renderItem={({ item }) => <ExploreVendorCard vendor={item} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.four,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  brand: {
    textAlign: 'left',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  pillsRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    gap: Spacing.two,
  },
  carouselContent: {
    paddingTop: Spacing.two,
    paddingRight: Spacing.four,
  },
  carouselItem: {
    marginRight: Spacing.three,
  },
  listGap: {
    height: Spacing.three,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  errorText: {
    color: '#B42318',
    textAlign: 'center',
  },
  retry: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
});
