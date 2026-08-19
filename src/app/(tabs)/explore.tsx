import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type FlatList as FlatListType,
  type ScrollView as ScrollViewType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ExploreCategoryGrid } from '@/components/explore-category-grid';
import { ExploreListingCard } from '@/components/explore-listing-card';
import { ExploreVendorCard } from '@/components/explore-vendor-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, ExploreBottomExtra, ExploreSectionGap, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useChrome, useScrollChrome } from '@/lib/chrome';
import {
  fetchExploreHubCarousels,
  fetchExploreHubListings,
  fetchExploreHubVendors,
  fetchListingsByGroupSlugs,
  fetchVendorsByGroupSlugs,
  filterListingsBySearch,
  filterVendorsBySearch,
  type ExploreCarouselSection,
  type ExploreListing,
  type ExploreVendor,
} from '@/lib/listings';

const ALL_CATS = '__all__';

/** Four broad groups that bucket the fine-grained categories. */
const SUPER_CATEGORIES = [
  {
    slug: 'food-nutrition',
    title: 'Food & Nutrition',
    slugs: ['teas-juices-healthy-drinks', 'natural-foods', 'bakeries', 'vitamins-supplements'],
  },
  {
    slug: 'body-care',
    title: 'Body Care',
    slugs: ['fitness-yoga', 'spas-massage-wellness', 'skincare-aromatherapy'],
  },
  {
    slug: 'mind-wellbeing',
    title: 'Mind & Wellbeing',
    slugs: ['holistic-naturopathic-alternative-remedies', 'workshops-retreats'],
  },
  {
    slug: 'home-lifestyle',
    title: 'Home & Lifestyle',
    slugs: ['eco-friendly-sustainable-products', 'natural-home-products', 'pet-wellness'],
  },
] as const;

type HubView = 'all' | 'products' | 'vendors';

const VIEW_PILLS: {
  id: HubView;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tint: string;
}[] = [
  { id: 'all', label: 'All', icon: 'grid-outline', tint: '#E11D48' },
  { id: 'products', label: 'Products', icon: 'bag-handle-outline', tint: '#D97706' },
  { id: 'vendors', label: 'Vendors', icon: 'storefront-outline', tint: '#059669' },
];

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();
  const isMobile = Platform.OS !== 'web';
  const [carouselWidth, setCarouselWidth] = useState(windowWidth);
  const compactCardWidth = isMobile ? carouselWidth : 176;

  const [view, setView] = useState<HubView>('all');
  const [search, setSearch] = useState('');
  const [carousels, setCarousels] = useState<ExploreCarouselSection[]>([]);
  const [products, setProducts] = useState<ExploreListing[]>([]);
  const [vendors, setVendors] = useState<ExploreVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATS);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  // Group-filtered data loaded on demand when a super-category is selected
  const [groupProducts, setGroupProducts] = useState<ExploreListing[] | null>(null);
  const [groupVendors, setGroupVendors] = useState<ExploreVendor[] | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const productsScrollRef = useRef<ScrollViewType>(null);
  const vendorsListRef = useRef<FlatListType<ExploreVendor>>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [hub, productRows, vendorRows] = await Promise.all([
        fetchExploreHubCarousels(),
        fetchExploreHubListings(),
        fetchExploreHubVendors(),
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

  // When a super-category group is selected, fetch its data from Firestore
  // using the same per-slug parallel queries the web app uses.
  useEffect(() => {
    if (categoryFilter === ALL_CATS) {
      setGroupProducts(null);
      setGroupVendors(null);
      return;
    }
    const group = SUPER_CATEGORIES.find((g) => g.slug === categoryFilter);
    if (!group) {
      setGroupProducts(null);
      setGroupVendors(null);
      return;
    }
    let cancelled = false;
    setGroupLoading(true);
    setGroupProducts(null);
    setGroupVendors(null);
    Promise.all([
      fetchListingsByGroupSlugs(group.slugs),
      fetchVendorsByGroupSlugs(group.slugs),
    ]).then(([listings, vendorRows]) => {
      if (cancelled) return;
      setGroupProducts(listings);
      setGroupVendors(vendorRows);
      setGroupLoading(false);
    }).catch((err) => {
      console.error('Group fetch failed', err);
      if (!cancelled) setGroupLoading(false);
    });
    return () => { cancelled = true; };
  }, [categoryFilter]);

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  useEffect(() => {
    productsScrollRef.current?.scrollTo({ y: 0, animated: false });
    vendorsListRef.current?.scrollToOffset({ offset: 0, animated: false });
    resetChrome();
  }, [categoryFilter, resetChrome]);

  const filteredProducts = useMemo(() => {
    const source = categoryFilter === ALL_CATS ? products : (groupProducts ?? []);
    return filterListingsBySearch(source, search);
  }, [products, groupProducts, search, categoryFilter]);

  const filteredVendors = useMemo(() => {
    const source = categoryFilter === ALL_CATS ? vendors : (groupVendors ?? []);
    return filterVendorsBySearch(source, search);
  }, [vendors, groupVendors, search, categoryFilter]);

  const filteredCarousels = useMemo(() => {
    if (search.trim().length < 2) return carousels;
    return carousels
      .map((section) => ({
        ...section,
        listings: filterListingsBySearch(section.listings, search),
      }))
      .filter((section) => section.listings.length > 0);
  }, [carousels, search]);

  const bottomPad = insets.bottom + BottomTabInset + ExploreBottomExtra;

  const filters = (
    <View style={[styles.sticky, { backgroundColor: theme.background }]}>
      <View style={styles.filters}>
        <View
          style={[
            styles.searchBox,
            Shadows.button,
            {
              backgroundColor: theme.backgroundElement,
            },
          ]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
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

        <View style={styles.pillsRow}>
          {/* Pills centered in the full row */}
          <View style={styles.pillsCenter}>
            {VIEW_PILLS.map((pill) => {
              const active = view === pill.id;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => {
                    setView(pill.id);
                    resetChrome();
                  }}
                  style={[
                    styles.pill,
                    active ? Shadows.buttonPressed : Shadows.button,
                    {
                      backgroundColor: active
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                    },
                  ]}>
                  <Ionicons name={pill.icon} size={13} color={active ? theme.tint : pill.tint} />
                  <ThemedText type="smallBold" style={styles.pillLabel}>
                    {pill.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {/* Filter icon absolutely positioned to the right so it doesn't shift centering */}
          {(view === 'products' || view === 'vendors') ? (
            <Pressable
              hitSlop={8}
              onPress={() => setShowCategoryFilter((v) => !v)}
              style={[
                styles.filterIconBtn,
                Shadows.button,
                {
                  backgroundColor: showCategoryFilter ? '#000000' : theme.backgroundElement,
                },
              ]}>
              <Ionicons
                name="options-outline"
                size={16}
                color={showCategoryFilter ? '#FFFFFF' : theme.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        {showCategoryFilter && (view === 'products' || view === 'vendors') ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catRowScroll}
            contentContainerStyle={styles.catRow}>
            <Pressable
              hitSlop={8}
              onPress={() => setCategoryFilter(ALL_CATS)}
              style={styles.catToggle}>
              <ThemedText
                style={[
                  styles.catLabel,
                  { color: categoryFilter === ALL_CATS ? '#D97706' : theme.textSecondary },
                ]}>
                all
              </ThemedText>
            </Pressable>
            {SUPER_CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.slug;
              return (
                <Pressable
                  key={cat.slug}
                  hitSlop={8}
                  onPress={() => setCategoryFilter(active ? ALL_CATS : cat.slug)}
                  style={styles.catToggle}>
                  <ThemedText
                    style={[
                      styles.catLabel,
                      { color: active ? '#D97706' : theme.textSecondary },
                    ]}>
                    {cat.title.toLowerCase()}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible showAuthWhenSignedOut />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            Loading products...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible showAuthWhenSignedOut />
        <View style={styles.centered}>
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
        </View>
      </ThemedView>
    );
  }

  if (view === 'all') {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible showAuthWhenSignedOut />
        {filters}
        <ScrollView
          {...scrollChrome}
          style={styles.fullWidth}
          contentContainerStyle={[
            styles.scrollContent,
            !isMobile && { paddingHorizontal: Spacing.four, maxWidth: MaxContentWidth },
            { paddingBottom: bottomPad },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }>
          {filteredCarousels.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={[styles.empty, styles.paddedBlock]}>
              No listings match your search.
            </ThemedText>
          ) : (
            filteredCarousels.map((section) => (
              <View key={section.slug} style={styles.section}>
                <View style={styles.sectionCopy}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    {section.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {section.subtitle}
                  </ThemedText>
                </View>
                <ScrollView
                  horizontal
                  pagingEnabled={isMobile}
                  decelerationRate={isMobile ? 'fast' : 'normal'}
                  showsHorizontalScrollIndicator={false}
                  style={styles.carouselTrack}
                  onLayout={(e) => {
                    const next = Math.round(e.nativeEvent.layout.width);
                    if (next > 0 && next !== carouselWidth) setCarouselWidth(next);
                  }}
                  contentContainerStyle={styles.carouselContent}>
                  {section.listings.map((item, index) => (
                    <View
                      key={item.id}
                      style={
                        index < section.listings.length - 1
                          ? isMobile
                            ? undefined
                            : styles.carouselItem
                          : undefined
                      }>
                      <ExploreListingCard
                        listing={item}
                        compact
                        fullBleed={isMobile}
                        compactWidth={compactCardWidth}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))
          )}

          <View style={styles.paddedBlock}>
            <ExploreCategoryGrid />
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  if (view === 'products') {
    const gridGap = Spacing.two;
    const gridPad = Spacing.three;
    const gridColWidth = (windowWidth - gridPad * 2 - gridGap) / 2;

    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible showAuthWhenSignedOut />
        {filters}
        {groupLoading ? (
          <View style={styles.loaderBelowFilters}>
            <ActivityIndicator color={theme.tint} />
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            ref={productsScrollRef}
            {...scrollChrome}
            style={styles.contentArea}
            contentContainerStyle={[styles.productGrid, { paddingBottom: bottomPad }]}>
            {filteredProducts.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No products found.
              </ThemedText>
            ) : (
              <View style={[styles.productGridInner, { gap: gridGap, paddingHorizontal: gridPad }]}>
                {filteredProducts.map((item) => (
                  <View key={item.id} style={{ width: gridColWidth }}>
                    <ExploreListingCard listing={item} grid overlayActions />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <AppHeader collapsible showAuthWhenSignedOut />
      {filters}
      {groupLoading ? (
        <View style={styles.loaderBelowFilters}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            Loading…
          </ThemedText>
        </View>
      ) : (
        <FlatList
          ref={vendorsListRef}
          {...scrollChrome}
          style={styles.contentArea}
          data={filteredVendors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No vendors found.
            </ThemedText>
          }
          ItemSeparatorComponent={() => <View style={styles.listGap} />}
          renderItem={({ item }) => <ExploreVendorCard vendor={item} />}
        />
      )}
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
    padding: Spacing.two,
    gap: Spacing.three,
  },
  loaderBelowFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  contentArea: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingTop: Spacing.two,
    flexGrow: 1,
    gap: ExploreSectionGap,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  sticky: {
    width: '100%',
    zIndex: 2,
  },
  filters: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.two,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    position: 'relative',
  },
  pillsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  filterIconBtn: {
    position: 'absolute',
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  sectionCopy: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  paddedBlock: {
    paddingHorizontal: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  carouselTrack: {
    width: '100%',
    alignSelf: 'stretch',
  },
  carouselContent: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    paddingHorizontal: 0,
  },
  carouselItem: {
    marginRight: Spacing.three,
  },
  listGap: {
    height: Spacing.three,
  },
  catRowScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 4,
    gap: Spacing.three,
  },
  catToggle: {
    paddingVertical: 2,
    flexShrink: 0,
  },
  catLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
  },
  productGrid: {
    paddingTop: Spacing.two,
  },
  productGridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
