import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExploreListingCard } from '@/components/explore-listing-card';
import { ExploreVendorCard } from '@/components/explore-vendor-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BottomTabInset,
  ExploreBottomExtra,
  Fonts,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useChrome, useScrollChrome } from '@/lib/chrome';
// import { countryFlagEmoji } from '@/lib/country-flag';
import { getCategoryBySlug } from '@/lib/explore-categories';
import {
  fetchListingsByCategorySlug,
  fetchVendorsByCategorySlug,
  type ExploreListing,
  type ExploreVendor,
} from '@/lib/listings';

type CategoryView = 'products' | 'vendors';
type SortKey = 'priceAsc' | 'priceDesc' | 'name' | 'nameDesc';

// const ALL_COUNTRIES = 'All countries';
const PRODUCTS_PEACH = '#F6E4D0';
const PRODUCTS_ORANGE = '#D97706';
const VENDORS_GREEN = '#059669';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();
  const category = slug ? getCategoryBySlug(slug) : undefined;

  const [listings, setListings] = useState<ExploreListing[]>([]);
  const [vendors, setVendors] = useState<ExploreVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<CategoryView>('products');
  // const [countryFilter, setCountryFilter] = useState(DEFAULT_COUNTRY);
  // const [countryOpen, setCountryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('name');

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setError('Missing category.');
        setLoading(false);
        return;
      }
      if (!getCategoryBySlug(slug)) {
        setError('That category was not found.');
        setLoading(false);
        return;
      }
      try {
        const [productRows, vendorRows] = await Promise.all([
          fetchListingsByCategorySlug(slug),
          fetchVendorsByCategorySlug(slug),
        ]);
        if (!cancelled) {
          setListings(productRows);
          setVendors(vendorRows);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Could not load this category.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /*
  const countryOptions = useMemo(() => {
    const set = new Set<string>([DEFAULT_COUNTRY]);
    for (const listing of listings) {
      const country = listing.locationCountry?.trim();
      if (country) set.add(country);
    }
    for (const vendor of vendors) {
      const country = vendor.country?.trim();
      if (country) set.add(country);
    }
    return [ALL_COUNTRIES, ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [listings, vendors]);
  */

  const q = search.trim().toLowerCase();

  const visibleListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      const matchesSearch =
        q.length < 2 ||
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q) ||
        listing.vendorName.toLowerCase().includes(q);
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'priceAsc' || sortBy === 'priceDesc') {
        const ap = a.price != null && a.price > 0 ? a.price : null;
        const bp = b.price != null && b.price > 0 ? b.price : null;
        if (ap == null && bp == null) return a.title.localeCompare(b.title);
        if (ap == null) return 1;
        if (bp == null) return -1;
        return sortBy === 'priceAsc' ? ap - bp : bp - ap;
      }
      if (sortBy === 'nameDesc') return b.title.localeCompare(a.title);
      return a.title.localeCompare(b.title);
    });
    return filtered;
  }, [listings, q, sortBy]);

  const visibleVendors = useMemo(() => {
    const listingVendorIds =
      q.length >= 2
        ? new Set(
            listings
              .filter(
                (listing) =>
                  listing.title.toLowerCase().includes(q) ||
                  listing.description.toLowerCase().includes(q),
              )
              .map((listing) => listing.vendorId),
          )
        : null;

    const filtered = vendors.filter((vendor) => {
      const matchesSearch =
        q.length < 2 ||
        vendor.name.toLowerCase().includes(q) ||
        (vendor.city ?? '').toLowerCase().includes(q) ||
        (listingVendorIds?.has(vendor.id) ?? false);
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'nameDesc') return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });
    return filtered;
  }, [vendors, listings, q, sortBy]);

  const title = category?.title ?? 'Category';
  const bottomPad = insets.bottom + BottomTabInset + ExploreBottomExtra;
  const priceActive = sortBy === 'priceAsc' || sortBy === 'priceDesc';
  const nameActive = sortBy === 'name' || sortBy === 'nameDesc';
  const gridItems: (ExploreListing | null)[] =
    visibleListings.length % 2 === 1 ? [...visibleListings, null] : visibleListings;

  const header = (
    <View style={[styles.chrome, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <View style={styles.titleRow}>
        <Pressable hitSlop={8} onPress={() => router.back()} style={styles.sideButton}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText numberOfLines={2} style={styles.pageTitle}>
          {title}
        </ThemedText>
        <View style={styles.sideButton} />
        {/*
        <View style={styles.sideButton}>
          <Pressable
            onPress={() => setCountryOpen((open) => !open)}
            style={[
              styles.flagButton,
              Shadows.button,
              { backgroundColor: theme.backgroundElement },
            ]}>
            <ThemedText style={styles.flagEmoji}>{countryFlagEmoji(countryFilter)}</ThemedText>
          </Pressable>
        </View>
        */}
      </View>

      {/*
      {countryOpen ? (
        <View
          style={[
            styles.countryMenu,
            Shadows.card,
            {
              top: insets.top + 48,
              backgroundColor: theme.backgroundElement,
            },
          ]}>
          {countryOptions.map((country) => {
            const selected = country === countryFilter;
            return (
              <Pressable
                key={country}
                onPress={() => {
                  setCountryFilter(country);
                  setCountryOpen(false);
                }}
                style={[
                  styles.countryOption,
                  selected && { backgroundColor: PRODUCTS_PEACH },
                ]}>
                <ThemedText style={styles.flagEmoji}>{countryFlagEmoji(country)}</ThemedText>
                <ThemedText type="small" style={styles.countryLabel}>
                  {country}
                </ThemedText>
                {selected ? (
                  <Ionicons name="checkmark" size={16} color="#C2410C" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      */}

      <View
        style={[
          styles.searchBox,
          Shadows.button,
          { backgroundColor: theme.backgroundElement },
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

      <View style={styles.filtersRow}>
        <View style={styles.pills}>
          <Pressable
            onPress={() => setView('products')}
            style={[
              styles.pill,
              view === 'products' ? Shadows.buttonPressed : Shadows.button,
              {
                backgroundColor:
                  view === 'products' ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}>
            <Ionicons
              name="bag-handle-outline"
              size={13}
              color={view === 'products' ? PRODUCTS_ORANGE : theme.textSecondary}
            />
            <ThemedText type="smallBold" style={styles.pillLabel}>
              Products
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setView('vendors')}
            style={[
              styles.pill,
              view === 'vendors' ? Shadows.buttonPressed : Shadows.button,
              {
                backgroundColor:
                  view === 'vendors' ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}>
            <Ionicons
              name="storefront-outline"
              size={13}
              color={view === 'vendors' ? VENDORS_GREEN : theme.textSecondary}
            />
            <ThemedText type="smallBold" style={styles.pillLabel}>
              Vendors
            </ThemedText>
          </Pressable>
        </View>
        <Pressable
          onPress={() => setSortOpen((open) => !open)}
          style={[
            styles.filterButton,
            sortOpen ? Shadows.buttonPressed : Shadows.button,
            {
              backgroundColor: sortOpen ? theme.backgroundSelected : theme.backgroundElement,
            },
          ]}>
          <Ionicons name="options-outline" size={16} color={theme.text} />
        </Pressable>
      </View>

      {sortOpen ? (
        <View style={styles.sortRow}>
          <Pressable
            onPress={() =>
              setSortBy((prev) => (prev === 'priceAsc' ? 'priceDesc' : 'priceAsc'))
            }
            style={styles.sortButton}>
            <Ionicons
              name={sortBy === 'priceDesc' ? 'arrow-up-outline' : 'swap-vertical-outline'}
              size={14}
              color={priceActive ? PRODUCTS_ORANGE : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={[
                styles.sortLabel,
                {
                  color: priceActive ? PRODUCTS_ORANGE : theme.textSecondary,
                  textDecorationLine: priceActive ? 'underline' : 'none',
                },
              ]}>
              {sortBy === 'priceDesc' ? 'price high-low' : 'price low-high'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setSortBy((prev) => (prev === 'name' ? 'nameDesc' : 'name'))}
            style={styles.sortButton}>
            <Ionicons
              name={sortBy === 'nameDesc' ? 'arrow-up-outline' : 'swap-vertical-outline'}
              size={14}
              color={nameActive ? PRODUCTS_ORANGE : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={[
                styles.sortLabel,
                {
                  color: nameActive ? PRODUCTS_ORANGE : theme.textSecondary,
                  textDecorationLine: nameActive ? 'underline' : 'none',
                },
              ]}>
              {sortBy === 'nameDesc' ? 'name Z-A' : 'name A-Z'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        {header}
        <View style={styles.centered}>
          <ThemedText type="smallBold" style={styles.error}>
            {error}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (view === 'vendors') {
    return (
      <ThemedView style={styles.screen}>
        {header}
        <FlatList
          key="vendors"
          {...scrollChrome}
          data={visibleVendors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.vendorList, { paddingBottom: bottomPad }]}
          ItemSeparatorComponent={() => <View style={styles.listGap} />}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No vendors in this category yet.
            </ThemedText>
          }
          renderItem={({ item }) => <ExploreVendorCard vendor={item} fromCategory={slug} />}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      {header}
      <FlatList
        key="products"
        {...scrollChrome}
        data={gridItems}
        keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.grid, { paddingBottom: bottomPad }]}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No listings in this category yet.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <View style={styles.gridCell}>
            {item ? <ExploreListingCard listing={item} grid overlayActions /> : null}
          </View>
        )}
      />
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
  },
  chrome: {
    zIndex: 4,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
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
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  flagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flagEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  countryMenu: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 20,
    minWidth: 180,
    borderRadius: 14,
    paddingVertical: 6,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countryLabel: {
    flex: 1,
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
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  filterButton: {
    position: 'absolute',
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingTop: 2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  gridRow: {
    gap: Spacing.three,
  },
  gridCell: {
    flex: 1,
  },
  vendorList: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  listGap: {
    height: Spacing.three,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
    width: '100%',
  },
  error: {
    color: '#B42318',
    textAlign: 'center',
  },
});
