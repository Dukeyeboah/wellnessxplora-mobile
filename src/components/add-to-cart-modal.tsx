import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExploreListing } from '@/lib/listings';
import { formatListingPrice } from '@/lib/listings';

type Props = {
  visible: boolean;
  listing: ExploreListing | null;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function AddToCartModal({
  visible,
  listing,
  quantity,
  onQuantityChange,
  onClose,
  onConfirm,
}: Props) {
  const theme = useTheme();
  if (!listing) return null;

  const price = formatListingPrice(listing);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.center}>
        <View style={[styles.sheet, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={styles.title}>
            Add to cart
          </ThemedText>
          <View style={styles.row}>
            {listing.imageUrl ? (
              <Image source={{ uri: listing.imageUrl }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <View style={styles.copy}>
              <ThemedText type="smallBold" numberOfLines={2}>
                {listing.title}
              </ThemedText>
              {price ? <ThemedText type="small">{price}</ThemedText> : null}
            </View>
          </View>
          <View style={styles.qtyRow}>
            <ThemedText type="smallBold">Quantity</ThemedText>
            <View style={styles.qtyControls}>
              <Pressable
                onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
                style={[styles.qtyBtn, { borderColor: theme.backgroundSelected }]}>
                <Ionicons name="remove" size={18} color={theme.text} />
              </Pressable>
              <ThemedText type="smallBold" style={styles.qtyValue}>
                {quantity}
              </ThemedText>
              <Pressable
                onPress={() => onQuantityChange(quantity + 1)}
                style={[styles.qtyBtn, { borderColor: theme.backgroundSelected }]}>
                <Ionicons name="add" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.confirmBtn, { backgroundColor: theme.tint }]}>
              <ThemedText type="smallBold" style={styles.confirmLabel}>
                Add to cart
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  sheet: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  confirmLabel: {
    color: '#FFFFFF',
  },
});
