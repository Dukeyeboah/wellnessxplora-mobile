import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  canCreatePost: boolean;
  canCreateProduct: boolean;
  onClose: () => void;
  onChoosePost: () => void;
  onChooseProduct: () => void;
};

export function CreateChoiceSheet({
  visible,
  canCreatePost,
  canCreateProduct,
  onClose,
  onChoosePost,
  onChooseProduct,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const [vendorNotice, setVendorNotice] = useState(false);

  useEffect(() => {
    if (!visible) setVendorNotice(false);
  }, [visible]);

  const goAccountSettings = () => {
    onClose();
    router.push('/profile' as never);
  };

  const handleProduct = () => {
    if (!canCreateProduct) {
      setVendorNotice(true);
      return;
    }
    onChooseProduct();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={[styles.card, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={canCreatePost ? onChoosePost : undefined}
            disabled={!canCreatePost}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.background,
                opacity: !canCreatePost ? 0.55 : pressed ? 0.88 : 1,
              },
            ]}>
            <View style={styles.titleRow}>
              <Ionicons name="newspaper-outline" size={18} color={theme.tint} />
              <ThemedText type="smallBold" style={styles.optionTitle}>
                Post
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.blurb}>
              {canCreatePost
                ? 'Share an update, photo, or event on Discover'
                : 'Available once you have a vendor or editor account'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleProduct}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor: vendorNotice && !canCreateProduct ? theme.tint : theme.backgroundSelected,
                backgroundColor: theme.background,
                opacity: pressed ? 0.88 : 1,
              },
            ]}>
            <View style={styles.titleRow}>
              <Ionicons name="bag-handle-outline" size={18} color="#D97706" />
              <ThemedText type="smallBold" style={styles.optionTitle}>
                Product or Service
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.blurb}>
              List something for sale or bookable on Explore
            </ThemedText>
          </Pressable>

          {vendorNotice && !canCreateProduct ? (
            <View style={[styles.hintBox, { backgroundColor: `${theme.tint}12` }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
                You can only list a product or service with a vendor account. Become a vendor from
                account settings anytime.
              </ThemedText>
              <Pressable
                onPress={goAccountSettings}
                style={[styles.cta, { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={styles.ctaLabel}>
                  Go to account settings
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          <Pressable hitSlop={8} onPress={onClose} style={styles.cancel}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    zIndex: 1,
  },
  option: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  blurb: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  hintBox: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hintText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  cta: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ctaLabel: {
    color: '#FFFFFF',
  },
  cancel: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
});
