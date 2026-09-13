import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExploreListingCard } from '@/components/explore-listing-card';
import { ListingEditorSheet } from '@/components/listing-editor-sheet';
import { ListingRatingSummary } from '@/components/listing-rating-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VendorPostsManager } from '@/components/vendor-posts-manager';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { BottomTabInset, Fonts, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useChrome, useScrollChrome } from '@/lib/chrome';
import { getCategoryBySlug } from '@/lib/explore-categories';
import { fetchVendorById, type ExploreListing } from '@/lib/listings';
import {
  deleteVendorListing,
  fetchVendorListings,
  type DashboardListing,
} from '@/lib/vendor-dashboard';
import { fetchVendorProfileDoc } from '@/lib/user-profile';

type DashboardSection = 'products' | 'posts';

function dashboardListingToExplore(listing: DashboardListing, vendorName: string): ExploreListing {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    currency: listing.currency,
    imageUrl: listing.imageUrl ?? '',
    vendorId: '',
    vendorName,
    vendorAvatarUrl: '',
    vendorVerified: false,
    vendorFoundingMember: false,
    ratingAvg: 0,
    ratingCount: 0,
    categorySlug: listing.categorySlug,
  };
}

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { user, userRole } = useAuth();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [locationLine, setLocationLine] = useState('');
  const [verified, setVerified] = useState(false);
  const [foundingMember, setFoundingMember] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [listings, setListings] = useState<DashboardListing[]>([]);
  const [section, setSection] = useState<DashboardSection>('products');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<DashboardListing | null>(null);

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  const load = useCallback(async () => {
    if (!user) return;
    const [vendor, vendorListings, publicVendor] = await Promise.all([
      fetchVendorProfileDoc(user.uid),
      fetchVendorListings(user.uid),
      fetchVendorById(user.uid),
    ]);
    if (vendor) {
      setBusinessName(vendor.businessName);
      setDescription(vendor.description);
      setCoverUrl(vendor.coverUrl);
      setLogoUrl(vendor.logoUrl);
      setCategorySlugs(vendor.categorySlugs);
      setVerified(vendor.verified);
      setFoundingMember(vendor.foundingMember);
      const loc = vendor.location;
      setLocationLine([loc.city, loc.country].filter(Boolean).join(', '));
    }
    if (publicVendor) {
      setRating(publicVendor.rating);
      setReviewCount(publicVendor.reviewCount);
    }
    setListings(vendorListings);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.replace('/profile');
      return;
    }
    if (userRole !== 'vendor') {
      router.replace('/profile');
      return;
    }
    void load();
  }, [user, userRole, load, router]);

  const primaryCategory = useMemo(() => {
    const first = categorySlugs[0];
    return first ? getCategoryBySlug(first) : undefined;
  }, [categorySlugs]);

  const categoryLine = categorySlugs
    .map((slug) => getCategoryBySlug(slug)?.title ?? slug)
    .filter(Boolean)
    .join(' · ');

  const gridWidth = (windowWidth - Spacing.three * 3) / 2;

  const onAddListing = () => {
    setEditingListing(null);
    setEditorOpen(true);
  };

  const onEditListing = (listing: DashboardListing) => {
    Alert.alert(listing.title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit',
        onPress: () => {
          setEditingListing(listing);
          setEditorOpen(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (!user) return;
          void deleteVendorListing(listing.id, user.uid).then(load);
        },
      },
    ]);
  };

  if (!user || userRole !== 'vendor') return null;

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        {...scrollChrome}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.five }}>
        <View>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              Shadows.button,
              { top: insets.top + 8, backgroundColor: theme.backgroundElement },
            ]}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push('/profile-edit' as never)}
              style={[styles.actionBtn, Shadows.button, { backgroundColor: theme.background }]}>
              <Ionicons name="create-outline" size={14} color={theme.tint} />
              <ThemedText type="smallBold" style={styles.actionLabel}>
                Edit profile
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/vendor/${user.uid}` as never)}
              style={[styles.actionBtn, Shadows.button, { backgroundColor: theme.background }]}>
              <Ionicons name="open-outline" size={14} color={theme.tint} />
              <ThemedText type="smallBold" style={styles.actionLabel}>
                Public profile
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.identityRow}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <View style={styles.identityText}>
              <ThemedText numberOfLines={2} style={styles.vendorName}>
                {businessName || 'Your business'}
              </ThemedText>
              <VendorTrustBadges verified={verified} foundingMember={foundingMember} size="md" />
              <ListingRatingSummary value={rating} reviewCount={reviewCount} size={12} />
              {primaryCategory ? (
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  {primaryCategory.title}
                </ThemedText>
              ) : null}
              {locationLine ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {locationLine}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          {description ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>
              {description}
            </ThemedText>
          ) : null}
          {categoryLine ? (
            <ThemedText type="small" style={{ color: theme.tint }}>
              {categoryLine}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.sectionTabs}>
            {(
              [
                ['products', 'Products', 'bag-handle-outline'],
                ['posts', 'Posts', 'newspaper-outline'],
              ] as const
            ).map(([id, label, icon]) => {
              const active = section === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSection(id)}
                  style={[
                    styles.sectionTab,
                    Shadows.button,
                    {
                      backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: active ? theme.tint : theme.backgroundSelected,
                    },
                  ]}>
                  <Ionicons name={icon} size={14} color={active ? theme.tint : theme.textSecondary} />
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? theme.tint : theme.textSecondary, fontSize: 13 }}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {section === 'products' ? (
            <>
              <View style={styles.productsHeader}>
                <ThemedText style={styles.productsTitle}>Your products</ThemedText>
                <Pressable
                  onPress={onAddListing}
                  style={[styles.addBtn, { backgroundColor: theme.tint }]}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <ThemedText type="smallBold" style={styles.addBtnLabel}>
                    Add
                  </ThemedText>
                </Pressable>
              </View>

              {listings.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No products yet. Tap Add to create your first product.
                </ThemedText>
              ) : (
                <View style={styles.productGrid}>
                  {listings.map((item) => (
                    <View key={item.id} style={{ width: gridWidth }}>
                      <ExploreListingCard
                        listing={{
                          ...dashboardListingToExplore(item, businessName),
                          vendorId: user.uid,
                        }}
                        grid
                        hideVendor
                        showDescription
                        overlayActions
                        fromVendor={user.uid}
                      />
                      <Pressable
                        onPress={() => onEditListing(item)}
                        style={[
                          styles.editFab,
                          Shadows.button,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <Ionicons name="pencil" size={12} color={theme.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <VendorPostsManager
              vendorId={user.uid}
              vendorName={businessName || 'Vendor'}
              vendorPhotoURL={logoUrl || undefined}
            />
          )}
        </View>
      </ScrollView>

      <ListingEditorSheet
        visible={editorOpen}
        vendorId={user.uid}
        listing={editingListing}
        onClose={() => {
          setEditorOpen(false);
          setEditingListing(null);
        }}
        onSaved={() => void load()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', height: 180 },
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
  infoCard: {
    marginTop: -36,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: Spacing.two,
  },
  actionLabel: { fontSize: 12 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  identityText: { flex: 1, gap: 4, paddingTop: 2 },
  vendorName: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  productsTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnLabel: { color: '#FFFFFF', fontSize: 12 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  editFab: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  modalSheet: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  modalConfirm: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
