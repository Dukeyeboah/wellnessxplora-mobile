import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EXPLORE_CATEGORIES } from '@/lib/explore-categories';
import { uploadListingImageFromUri } from '@/lib/storage-upload';
import {
  createEmptyListingDraft,
  createVendorListing,
  updateVendorListing,
  updateVendorListingImages,
  type DashboardListing,
  type ListingDraftInput,
} from '@/lib/vendor-dashboard';

type Props = {
  visible: boolean;
  vendorId: string;
  listing?: DashboardListing | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ListingEditorSheet({ visible, vendorId, listing, onClose, onSaved }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ListingDraftInput>(createEmptyListingDraft());
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(listing);

  useEffect(() => {
    if (!visible) return;
    if (listing) {
      setDraft({
        title: listing.title,
        description: listing.description,
        type: listing.type,
        categorySlug: listing.categorySlug ?? '',
        price: listing.price != null ? String(listing.price) : '',
        currency: listing.currency || 'GHS',
        isActive: listing.isActive,
        isAvailable: listing.isAvailable,
      });
      setImageUri(listing.imageUrl ?? null);
      setExistingImagePath(listing.imageUrl ? 'keep' : null);
    } else {
      setDraft(createEmptyListingDraft());
      setImageUri(null);
      setExistingImagePath(null);
    }
    setError(null);
    setBusy(false);
  }, [visible, listing]);

  const canSave = useMemo(() => {
    return Boolean(draft.title.trim() && draft.categorySlug);
  }, [draft.title, draft.categorySlug]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setImageUri(result.assets[0].uri);
    setExistingImagePath(null);
  };

  const onSave = async () => {
    if (!canSave) {
      setError('Title and category are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isEdit && listing) {
        await updateVendorListing(listing.id, vendorId, draft);
        if (imageUri && !existingImagePath) {
          const path = await uploadListingImageFromUri(listing.id, imageUri, 0);
          await updateVendorListingImages(listing.id, vendorId, [path]);
        }
      } else {
        const id = await createVendorListing(vendorId, draft);
        if (imageUri) {
          const path = await uploadListingImageFromUri(id, imageUri, 0);
          await updateVendorListingImages(id, vendorId, [path]);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: theme.backgroundSelected }]}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">{isEdit ? 'Edit product' : 'New product'}</ThemedText>
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
            padding: Spacing.four,
            paddingBottom: insets.bottom + Spacing.six,
            gap: Spacing.three,
          }}
          keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => void pickImage()}
            style={[
              styles.imagePicker,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
              },
            ]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
            ) : (
              <>
                <Ionicons name="image-outline" size={28} color={theme.tint} />
                <ThemedText type="smallBold" style={{ color: theme.tint }}>
                  Add product photo
                </ThemedText>
              </>
            )}
          </Pressable>

          <Field label="Title">
            <TextInput
              value={draft.title}
              onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
              placeholder="Product name"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </Field>

          <Field label="Description">
            <TextInput
              value={draft.description}
              onChangeText={(v) => setDraft((d) => ({ ...d, description: v }))}
              placeholder="What makes this product special?"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.input,
                styles.textarea,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </Field>

          <Field label="Type">
            <View style={styles.row}>
              {(['product', 'service'] as const).map((type) => {
                const active = draft.type === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setDraft((d) => ({ ...d, type }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.tint : theme.backgroundElement,
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

          <Field label="Category">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}>
              {EXPLORE_CATEGORIES.map((cat) => {
                const active = draft.categorySlug === cat.slug;
                return (
                  <Pressable
                    key={cat.slug}
                    onPress={() => setDraft((d) => ({ ...d, categorySlug: cat.slug }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.tint : theme.backgroundElement,
                        borderColor: active ? theme.tint : theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 11 }}>
                      {cat.title}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Field>

          <Field label="Price (GHS)">
            <TextInput
              value={draft.price}
              onChangeText={(v) => setDraft((d) => ({ ...d, price: v }))}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            />
          </Field>

          <View style={styles.switchRow}>
            <ThemedText type="small">Active (visible in Explore)</ThemedText>
            <Switch
              value={draft.isActive}
              onValueChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
            />
          </View>
          <View style={styles.switchRow}>
            <ThemedText type="small">Available to order</ThemedText>
            <Switch
              value={draft.isAvailable}
              onValueChange={(v) => setDraft((d) => ({ ...d, isAvailable: v }))}
            />
          </View>

          {error ? (
            <ThemedText type="small" style={{ color: '#B42318' }}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallBold" style={{ fontSize: 12 }}>
        {label}
      </ThemedText>
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
  imagePicker: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
