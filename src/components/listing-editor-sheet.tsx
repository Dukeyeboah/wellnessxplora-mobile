import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageUploadGuidancePanel } from '@/components/image-upload-guidance-panel';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EXPLORE_CATEGORIES } from '@/lib/explore-categories';
import {
  LISTING_DESCRIPTION_MAX,
  LISTING_TITLE_MAX,
} from '@/lib/image-upload-guidance';
import { uploadListingImageFromUri } from '@/lib/storage-upload';
import { pickImagesWithSource } from '@/lib/pick-images-with-source';
import {
  createEmptyListingDraft,
  createVendorListing,
  listingToDraftInput,
  maxImagesForListingType,
  MAX_LISTING_CATEGORIES,
  parsePriceField,
  updateVendorListing,
  updateVendorListingImages,
  validateListingPrices,
  type DashboardListing,
  type ListingDraftInput,
} from '@/lib/vendor-dashboard';

type MediaItem = {
  id: string;
  /** Display URI (local or remote). */
  uri: string;
  /** Firestore storage path when already uploaded. */
  path?: string;
};

type LocalListingDraft = {
  key: string;
  draft: ListingDraftInput;
  media: MediaItem[];
  collapsed: boolean;
  editingId?: string;
};

type Props = {
  visible: boolean;
  vendorId: string;
  listing?: DashboardListing | null;
  onClose: () => void;
  onSaved: () => void;
};

function newKey(prefix = 'd') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyLocal(collapsed = false): LocalListingDraft {
  return {
    key: newKey(),
    draft: createEmptyListingDraft(),
    media: [],
    collapsed,
  };
}

function fromExisting(listing: DashboardListing): LocalListingDraft {
  const urls = listing.imageUrls.length
    ? listing.imageUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : [];
  const paths = listing.imagePaths;
  const media: MediaItem[] = urls.map((uri, i) => ({
    id: newKey('m'),
    uri,
    path: paths[i],
  }));
  return {
    key: listing.id,
    draft: listingToDraftInput(listing),
    media,
    collapsed: false,
    editingId: listing.id,
  };
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

export function ListingEditorSheet({ visible, vendorId, listing, onClose, onSaved }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<LocalListingDraft[]>([emptyLocal()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(listing);

  useEffect(() => {
    if (!visible) return;
    setRows(listing ? [fromExisting(listing)] : [emptyLocal()]);
    setError(null);
    setBusy(false);
  }, [visible, listing]);

  const patchRow = (key: string, patch: Partial<LocalListingDraft>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const patchDraft = (key: string, partial: Partial<ListingDraftInput>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, draft: { ...row.draft, ...partial } } : row,
      ),
    );
  };

  const toggleCategory = (key: string, slug: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const has = row.draft.categorySlugs.includes(slug);
        let next = has
          ? row.draft.categorySlugs.filter((s) => s !== slug)
          : [...row.draft.categorySlugs, slug];
        if (next.length > MAX_LISTING_CATEGORIES) next = next.slice(0, MAX_LISTING_CATEGORIES);
        return { ...row, draft: { ...row.draft, categorySlugs: next } };
      }),
    );
  };

  const setType = (key: string, type: 'product' | 'service') => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const max = maxImagesForListingType(type);
        return {
          ...row,
          draft: { ...row.draft, type },
          media: row.media.slice(0, max),
        };
      }),
    );
  };

  const pickImages = async (key: string) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const max = maxImagesForListingType(row.draft.type);
    const remaining = max - row.media.length;
    const replacingProduct = row.draft.type === 'product' && remaining <= 0;
    if (remaining <= 0 && !replacingProduct) return;

    const assets = await pickImagesWithSource({
      selectionLimit: replacingProduct ? 1 : Math.max(remaining, 1),
      allowsMultiple: row.draft.type === 'service' && !replacingProduct,
    });
    if (!assets.length) return;
    const added = assets.map((a) => ({
      id: newKey('m'),
      uri: a.uri,
    }));
    patchRow(key, {
      media: replacingProduct ? added : [...row.media, ...added],
    });
  };

  const removeMedia = (key: string, mediaId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? { ...row, media: row.media.filter((m) => m.id !== mediaId) }
          : row,
      ),
    );
  };

  const moveMedia = (key: string, from: number, to: number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, media: moveItem(row.media, from, to) } : row,
      ),
    );
  };

  const addAnother = () => {
    setRows((prev) => [...prev.map((r) => ({ ...r, collapsed: true })), emptyLocal(false)]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const validateRow = (row: LocalListingDraft): string | null => {
    if (!row.draft.title.trim()) return 'Title is required.';
    if (row.draft.categorySlugs.length === 0) return 'Select at least one category.';
    return validateListingPrices(
      parsePriceField(row.draft.price),
      parsePriceField(row.draft.discountPrice),
      row.draft.offerDiscount,
    );
  };

  const onSave = async () => {
    for (const row of rows) {
      const err = validateRow(row);
      if (err) {
        setError(err);
        patchRow(row.key, { collapsed: false });
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      for (const row of rows) {
        if (row.editingId) {
          await updateVendorListing(row.editingId, vendorId, row.draft);
          const paths: string[] = [];
          let uploadIndex = row.media.filter((m) => m.path).length;
          for (const item of row.media) {
            if (item.path) {
              paths.push(item.path);
            } else {
              paths.push(await uploadListingImageFromUri(row.editingId, item.uri, uploadIndex));
              uploadIndex += 1;
            }
          }
          await updateVendorListingImages(row.editingId, vendorId, paths);
        } else {
          const id = await createVendorListing(vendorId, row.draft);
          const paths: string[] = [];
          for (let i = 0; i < row.media.length; i += 1) {
            paths.push(await uploadListingImageFromUri(id, row.media[i]!.uri, i));
          }
          if (paths.length) await updateVendorListingImages(id, vendorId, paths);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save listing.');
    } finally {
      setBusy(false);
    }
  };

  const canSave = useMemo(
    () => rows.every((row) => row.draft.title.trim() && row.draft.categorySlugs.length > 0),
    [rows],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: theme.backgroundSelected }]}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">{isEdit ? 'Edit listing' : 'New listings'}</ThemedText>
          <Pressable
            onPress={() => void onSave()}
            disabled={!canSave || busy}
            hitSlop={12}
            style={{ opacity: !canSave || busy ? 0.4 : 1 }}>
            {busy ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Save
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: Spacing.three,
            paddingBottom: insets.bottom + Spacing.six,
            gap: Spacing.three,
          }}
          keyboardShouldPersistTaps="handled">
          <ImageUploadGuidancePanel role="listing" />

          {rows.map((row, index) => (
            <ListingDraftCard
              key={row.key}
              index={index}
              row={row}
              canRemove={rows.length > 1 && !row.editingId}
              onToggleCollapse={() => patchRow(row.key, { collapsed: !row.collapsed })}
              onRemove={() => removeRow(row.key)}
              onPatchDraft={(partial) => patchDraft(row.key, partial)}
              onSetType={(type) => setType(row.key, type)}
              onToggleCategory={(slug) => toggleCategory(row.key, slug)}
              onPickImages={() => void pickImages(row.key)}
              onRemoveMedia={(id) => removeMedia(row.key, id)}
              onMoveMedia={(from, to) => moveMedia(row.key, from, to)}
            />
          ))}

          {!isEdit ? (
            <Pressable
              onPress={addAnother}
              style={[
                styles.addAnother,
                { borderColor: theme.tint, backgroundColor: theme.backgroundElement },
              ]}>
              <Ionicons name="add" size={18} color={theme.tint} />
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Add another listing
              </ThemedText>
            </Pressable>
          ) : null}

          {error ? (
            <ThemedText type="small" style={{ color: '#B42318', textAlign: 'center' }}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ListingDraftCard({
  index,
  row,
  canRemove,
  onToggleCollapse,
  onRemove,
  onPatchDraft,
  onSetType,
  onToggleCategory,
  onPickImages,
  onRemoveMedia,
  onMoveMedia,
}: {
  index: number;
  row: LocalListingDraft;
  canRemove: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
  onPatchDraft: (partial: Partial<ListingDraftInput>) => void;
  onSetType: (type: 'product' | 'service') => void;
  onToggleCategory: (slug: string) => void;
  onPickImages: () => void;
  onRemoveMedia: (id: string) => void;
  onMoveMedia: (from: number, to: number) => void;
}) {
  const theme = useTheme();
  const maxImages = maxImagesForListingType(row.draft.type);
  const cover = row.media[0];
  const extras = row.media.slice(1);
  const priceError = validateListingPrices(
    parsePriceField(row.draft.price),
    parsePriceField(row.draft.discountPrice),
    row.draft.offerDiscount,
  );
  const summaryTitle = row.draft.title.trim() || `Listing ${index + 1}`;
  const summaryMeta = [
    row.draft.type === 'service' ? 'Service' : 'Product',
    row.draft.price.trim() ? `₵${row.draft.price.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
      ]}>
      <Pressable onPress={onToggleCollapse} style={styles.cardHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {summaryTitle}
          </ThemedText>
          {row.collapsed && summaryMeta ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {summaryMeta}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {canRemove ? (
            <Pressable onPress={onRemove} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color="#B42318" />
            </Pressable>
          ) : null}
          <Ionicons
            name={row.collapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </Pressable>

      {!row.collapsed ? (
        <View style={styles.cardBody}>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
            {row.draft.type === 'service'
              ? `Services can include up to ${maxImages} images (${row.media.length}/${maxImages}). First image is the cover.`
              : 'Add one image for this product.'}
          </ThemedText>

          {cover ? (
            <View style={styles.coverWrap}>
              <Image source={{ uri: cover.uri }} style={styles.coverImage} contentFit="cover" />
              <Pressable
                onPress={() => onRemoveMedia(cover.id)}
                style={styles.coverRemove}
                hitSlop={6}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onPickImages}
              style={[
                styles.coverPicker,
                {
                  borderColor: theme.backgroundSelected,
                  backgroundColor: theme.background,
                },
              ]}>
              <View style={[styles.uploadIconWrap, { backgroundColor: `${theme.tint}14` }]}>
                <Ionicons name="image-outline" size={26} color={theme.tint} />
                <View style={[styles.uploadPlus, { backgroundColor: theme.tint, borderColor: theme.background }]}>
                  <Ionicons name="add" size={12} color="#FFFFFF" />
                </View>
              </View>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {row.draft.type === 'service' ? 'Add photos' : 'Add product photo'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                {Platform.OS === 'web' ? 'Choose an image to upload' : 'Photo library or take a photo'}
              </ThemedText>
            </Pressable>
          )}

          {row.draft.type === 'service' && (extras.length > 0 || (cover && row.media.length < maxImages)) ? (
            <View style={styles.extrasRow}>
              {row.media.map((item, mediaIndex) => (
                <View key={item.id} style={styles.extraCard}>
                  <Image source={{ uri: item.uri }} style={styles.extraThumb} contentFit="cover" />
                  {mediaIndex === 0 ? (
                    <View style={[styles.coverBadge, { backgroundColor: theme.tint }]}>
                      <ThemedText type="small" style={styles.coverBadgeLabel}>
                        Cover
                      </ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.extraActions}>
                    <Pressable
                      disabled={mediaIndex === 0}
                      onPress={() => onMoveMedia(mediaIndex, mediaIndex - 1)}
                      style={[styles.extraBtn, mediaIndex === 0 && { opacity: 0.35 }]}
                      hitSlop={4}>
                      <Ionicons name="chevron-back" size={14} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      disabled={mediaIndex === row.media.length - 1}
                      onPress={() => onMoveMedia(mediaIndex, mediaIndex + 1)}
                      style={[
                        styles.extraBtn,
                        mediaIndex === row.media.length - 1 && { opacity: 0.35 },
                      ]}
                      hitSlop={4}>
                      <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => onRemoveMedia(item.id)}
                      style={styles.extraBtn}
                      hitSlop={4}>
                      <Ionicons name="trash-outline" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              ))}
              {row.media.length < maxImages ? (
                <Pressable
                  onPress={onPickImages}
                  style={[
                    styles.extraAdd,
                    {
                      borderColor: theme.backgroundSelected,
                      backgroundColor: theme.background,
                    },
                  ]}>
                  <Ionicons name="add" size={20} color={theme.tint} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {row.draft.type === 'product' && cover ? (
            <Pressable onPress={onPickImages} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 12 }}>
                Replace photo
              </ThemedText>
            </Pressable>
          ) : null}

          <Field
            label="Title *"
            counter={`${row.draft.title.length}/${LISTING_TITLE_MAX}`}>
            <TextInput
              value={row.draft.title}
              onChangeText={(v) => onPatchDraft({ title: v.slice(0, LISTING_TITLE_MAX) })}
              maxLength={LISTING_TITLE_MAX}
              placeholder="Product or service name"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </Field>

          <Field label="Type">
            <View style={styles.typeRow}>
              {(['product', 'service'] as const).map((type) => {
                const active = row.draft.type === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => onSetType(type)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.tint : theme.background,
                        borderColor: active ? theme.tint : theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 12 }}>
                      {type === 'product' ? 'Product' : 'Service'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Field label="Listing price">
                <View style={styles.cediWrap}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.cedi}>
                    ₵
                  </ThemedText>
                  <TextInput
                    value={row.draft.price}
                    onChangeText={(v) => onPatchDraft({ price: v, currency: 'GHS' })}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      styles.cediInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  />
                </View>
              </Field>
            </View>
            {row.draft.offerDiscount ? (
              <View style={{ flex: 1 }}>
                <Field label="Discount price">
                  <View style={styles.cediWrap}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.cedi}>
                      ₵
                    </ThemedText>
                    <TextInput
                      value={row.draft.discountPrice}
                      onChangeText={(v) => onPatchDraft({ discountPrice: v })}
                      placeholder="Sale price"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="decimal-pad"
                      style={[
                        styles.input,
                        styles.cediInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.background,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}
                    />
                  </View>
                </Field>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => onPatchDraft({ offerDiscount: !row.draft.offerDiscount })}
            style={styles.checkRow}>
            <Ionicons
              name={row.draft.offerDiscount ? 'checkbox' : 'square-outline'}
              size={20}
              color={row.draft.offerDiscount ? theme.tint : theme.textSecondary}
            />
            <ThemedText type="small">Offer discount</ThemedText>
          </Pressable>
          {priceError ? (
            <ThemedText type="small" style={{ color: '#B42318', fontSize: 12 }}>
              {priceError}
            </ThemedText>
          ) : null}

          <Field
            label="Description (optional but recommended)"
            counter={`${row.draft.description.length}/${LISTING_DESCRIPTION_MAX}`}>
            <TextInput
              value={row.draft.description}
              onChangeText={(v) =>
                onPatchDraft({ description: v.slice(0, LISTING_DESCRIPTION_MAX) })
              }
              maxLength={LISTING_DESCRIPTION_MAX}
              placeholder="Describe your product or service"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.input,
                styles.textarea,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </Field>

          <View style={styles.catHeader}>
            <ThemedText type="smallBold" style={{ fontSize: 12, flex: 1 }}>
              Categories
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
              {row.draft.categorySlugs.length}/{MAX_LISTING_CATEGORIES} selected
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11, marginTop: -4 }}>
            Choose up to {MAX_LISTING_CATEGORIES} categories
          </ThemedText>
          <CategoryChipScroller
            selected={row.draft.categorySlugs}
            onToggle={onToggleCategory}
          />

          <View style={styles.switchRow}>
            <ThemedText type="small" style={{ flex: 1 }}>
              Show on public profile
            </ThemedText>
            <Switch
              value={row.draft.isActive}
              onValueChange={(v) => onPatchDraft({ isActive: v })}
            />
          </View>
          <View style={styles.switchRow}>
            <ThemedText type="small" style={{ flex: 1 }}>
              Available (off shows “Unavailable”)
            </ThemedText>
            <Switch
              value={row.draft.isAvailable}
              onValueChange={(v) => onPatchDraft({ isAvailable: v })}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CategoryChipScroller({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const theme = useTheme();
  const [pageWidth, setPageWidth] = useState(1);
  const [contentWidth, setContentWidth] = useState(1);
  const [scrollX, setScrollX] = useState(0);

  const pageCount = Math.max(1, Math.ceil(contentWidth / Math.max(pageWidth, 1)));
  const activeIndex = Math.min(
    pageCount - 1,
    Math.max(0, Math.round(scrollX / Math.max(pageWidth, 1))),
  );

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(event.nativeEvent.contentOffset.x);
  }, []);

  return (
    <View style={styles.catScrollBlock}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        contentContainerStyle={styles.catChips}>
        {EXPLORE_CATEGORIES.map((cat) => {
          const active = selected.includes(cat.slug);
          return (
            <Pressable
              key={cat.slug}
              onPress={() => onToggle(cat.slug)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.tint : theme.background,
                  borderColor: active ? theme.tint : theme.backgroundSelected,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{
                  color: active ? '#FFFFFF' : theme.textSecondary,
                  fontSize: 11,
                }}>
                {cat.title}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      {pageCount > 1 ? (
        <View style={styles.dotsRow} accessibilityRole="tablist">
          {Array.from({ length: pageCount }).map((_, index) => {
            const active = index === activeIndex;
            return (
              <View
                key={`dot-${index}`}
                style={[
                  styles.dot,
                  active && styles.dotActive,
                  { backgroundColor: active ? theme.tint : theme.backgroundSelected },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Field({
  label,
  counter,
  children,
}: {
  label: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="smallBold" style={{ fontSize: 12, flex: 1 }}>
          {label}
        </ThemedText>
        {counter ? (
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
            {counter}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: { padding: 4 },
  cardBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: Spacing.three,
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPicker: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  extrasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extraCard: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  extraThumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    left: 4,
    top: 4,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  coverBadgeLabel: {
    color: '#FFFFFF',
    fontSize: 9,
  },
  extraActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  extraBtn: {
    padding: 2,
  },
  extraAdd: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cediWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  cedi: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontSize: 14,
  },
  cediInput: {
    paddingLeft: 28,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  catScrollBlock: {
    gap: Spacing.two,
  },
  catChips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: Spacing.two,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
  },
});
