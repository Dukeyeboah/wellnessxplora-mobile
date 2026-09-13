import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PostLinkedEntity } from '@/lib/feed-posts';
import {
  fetchListingsByVendorId,
  searchVendorsByQuery,
  type ExploreListing,
  type ExploreVendor,
} from '@/lib/listings';

type TagMode = 'idle' | 'product' | 'vendor';

type Props = {
  authorVendorId?: string;
  entities: PostLinkedEntity[];
  onChange: (next: PostLinkedEntity[]) => void;
  disabled?: boolean;
};

const MAX_TAGS = 6;

export function PostLinkedEntityTagger({
  authorVendorId,
  entities,
  onChange,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<TagMode>('idle');
  const [ownListings, setOwnListings] = useState<ExploreListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [vendorQuery, setVendorQuery] = useState('');
  const [vendorHits, setVendorHits] = useState<ExploreVendor[]>([]);
  const [vendorSearching, setVendorSearching] = useState(false);

  const taggedVendors = useMemo(() => entities.filter((e) => e.type === 'vendor'), [entities]);
  const taggedListings = useMemo(
    () =>
      entities.filter(
        (e) => e.type === 'listing' || e.type === 'product' || e.type === 'service',
      ),
    [entities],
  );

  useEffect(() => {
    if (mode !== 'product' || !authorVendorId) return;
    let cancelled = false;
    setListingsLoading(true);
    void fetchListingsByVendorId(authorVendorId)
      .then((rows) => {
        if (!cancelled) setOwnListings(rows);
      })
      .catch(() => {
        if (!cancelled) setOwnListings([]);
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, authorVendorId]);

  useEffect(() => {
    if (mode !== 'vendor') return;
    const q = vendorQuery.trim();
    if (q.length < 2) {
      setVendorHits([]);
      setVendorSearching(false);
      return;
    }
    let cancelled = false;
    setVendorSearching(true);
    const t = setTimeout(() => {
      void searchVendorsByQuery(q, 8)
        .then((rows) => {
          if (!cancelled) setVendorHits(rows);
        })
        .catch(() => {
          if (!cancelled) setVendorHits([]);
        })
        .finally(() => {
          if (!cancelled) setVendorSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, vendorQuery]);

  const addEntity = (entity: PostLinkedEntity) => {
    if (entities.some((e) => e.type === entity.type && e.id === entity.id)) {
      setMode('idle');
      setVendorQuery('');
      return;
    }
    onChange([...entities, entity].slice(0, MAX_TAGS));
    setMode('idle');
    setVendorQuery('');
  };

  const removeEntity = (entity: PostLinkedEntity) => {
    onChange(entities.filter((e) => !(e.type === entity.type && e.id === entity.id)));
  };

  const availableListings = ownListings.filter(
    (l) => !taggedListings.some((t) => t.id === l.id),
  );
  const availableVendors = vendorHits.filter((v) => !taggedVendors.some((t) => t.id === v.id));

  return (
    <View style={styles.wrap}>
      {(taggedVendors.length > 0 || taggedListings.length > 0) && (
        <View style={styles.chips}>
          {taggedVendors.map((v) => (
            <View
              key={`vendor-${v.id}`}
              style={[styles.chip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Ionicons name="storefront-outline" size={12} color="#065F46" />
              <ThemedText type="small" numberOfLines={1} style={[styles.chipLabel, { color: '#065F46' }]}>
                {v.label || 'Vendor'}
              </ThemedText>
              {!disabled ? (
                <Pressable onPress={() => removeEntity(v)} hitSlop={8}>
                  <Ionicons name="close" size={12} color="#065F46" />
                </Pressable>
              ) : null}
            </View>
          ))}
          {taggedListings.map((l) => (
            <View
              key={`listing-${l.id}`}
              style={[styles.chip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Ionicons name="cube-outline" size={12} color="#92400E" />
              <ThemedText type="small" numberOfLines={1} style={[styles.chipLabel, { color: '#92400E' }]}>
                {l.label || 'Product'}
              </ThemedText>
              {!disabled ? (
                <Pressable onPress={() => removeEntity(l)} hitSlop={8}>
                  <Ionicons name="close" size={12} color="#92400E" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {mode === 'idle' && !disabled ? (
        <View style={styles.actions}>
          {authorVendorId ? (
            <Pressable onPress={() => setMode('product')} style={styles.actionBtn} hitSlop={6}>
              <Ionicons name="cube-outline" size={14} color={theme.tint} />
              <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 12 }}>
                Tag product
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setMode('vendor')} style={styles.actionBtn} hitSlop={6}>
            <Ionicons name="storefront-outline" size={14} color={theme.tint} />
            <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 12 }}>
              Tag vendor
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {mode === 'product' ? (
        <View
          style={[
            styles.panel,
            { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
          ]}>
          <View style={styles.panelHead}>
            <ThemedText type="smallBold">Your products</ThemedText>
            <Pressable onPress={() => setMode('idle')} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          </View>
          {listingsLoading ? (
            <ActivityIndicator color={theme.tint} style={{ marginVertical: Spacing.two }} />
          ) : availableListings.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No products available to tag.
            </ThemedText>
          ) : (
            <ScrollView style={styles.panelList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {availableListings.map((listing) => (
                <Pressable
                  key={listing.id}
                  onPress={() =>
                    addEntity({ type: 'listing', id: listing.id, label: listing.title })
                  }
                  style={styles.panelRow}>
                  <ThemedText type="small" numberOfLines={1}>
                    {listing.title}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      {mode === 'vendor' ? (
        <View
          style={[
            styles.panel,
            { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement },
          ]}>
          <View style={styles.panelHead}>
            <ThemedText type="smallBold">Search vendors</ThemedText>
            <Pressable
              onPress={() => {
                setMode('idle');
                setVendorQuery('');
              }}
              hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          </View>
          <TextInput
            value={vendorQuery}
            onChangeText={setVendorQuery}
            placeholder="Type a business name…"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            style={[
              styles.search,
              {
                color: theme.text,
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
              },
            ]}
          />
          {vendorSearching ? (
            <ActivityIndicator color={theme.tint} style={{ marginVertical: Spacing.two }} />
          ) : vendorQuery.trim().length >= 2 && availableVendors.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No vendors found.
            </ThemedText>
          ) : (
            <ScrollView style={styles.panelList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {availableVendors.map((vendor) => (
                <Pressable
                  key={vendor.id}
                  onPress={() =>
                    addEntity({ type: 'vendor', id: vendor.id, label: vendor.name })
                  }
                  style={styles.panelRow}>
                  <ThemedText type="small" numberOfLines={1}>
                    {vendor.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: { fontSize: 11, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    fontSize: 13,
  },
  panelList: { maxHeight: 140 },
  panelRow: { paddingVertical: 8, paddingHorizontal: 4 },
});
