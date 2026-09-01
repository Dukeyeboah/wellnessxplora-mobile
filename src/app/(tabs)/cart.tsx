import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { OpeningExternalAppModal } from '@/components/opening-external-app-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { openCartWhatsAppOrder, resolveVendorWhatsAppForOrder } from '@/lib/cart-enquiry';
import { fetchVendorById } from '@/lib/listings';
import { useChrome } from '@/lib/chrome';

export default function CartScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { vendorCarts, ready, refresh, updateQuantity, removeItem, deleteCart } = useCart();
  const { resetChrome } = useChrome();
  const [submittingVendorId, setSubmittingVendorId] = useState<string | null>(null);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      void refresh();
      return () => resetChrome();
    }, [resetChrome, refresh]),
  );

  const senderName =
    userProfile?.name?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    undefined;

  const submitOrder = async (vendorId: string) => {
    const cart = vendorCarts.find((c) => c.vendorId === vendorId);
    if (!cart || cart.items.length === 0) return;
    setSubmittingVendorId(vendorId);
    try {
      const vendor = await fetchVendorById(vendorId);
      const whatsapp = vendor
        ? resolveVendorWhatsAppForOrder({
            whatsapp: vendor.whatsapp,
            phone: vendor.phone,
            showWhatsappPublic: vendor.showWhatsappPublic,
          })
        : undefined;
      if (!whatsapp) {
        Alert.alert(
          'WhatsApp not available',
          'This vendor has not enabled WhatsApp orders. Try contacting them from their profile.',
        );
        return;
      }
      setOpeningWhatsApp(true);
      await new Promise((resolve) => setTimeout(resolve, 450));
      await openCartWhatsAppOrder(
        whatsapp,
        cart.vendorName,
        cart.items,
        cart.note,
        senderName,
      );
    } catch (err) {
      setOpeningWhatsApp(false);
      Alert.alert(
        'Could not open WhatsApp',
        err instanceof Error ? err.message : 'Please try again or contact the vendor from their profile.',
      );
    } finally {
      setSubmittingVendorId(null);
    }
  };

  const header = (
    <View style={styles.cartHeader}>
      <Ionicons name="cart-outline" size={22} color={theme.tint} />
      <ThemedText style={[styles.cartTitle, { fontFamily: Fonts.serif }]}>Your cart</ThemedText>
    </View>
  );

  if (!user) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible />
        <View style={[styles.body, { paddingBottom: insets.bottom + BottomTabInset + Spacing.four }]}>
          {header}
          <View style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="cart-outline" size={36} color={theme.tint} />
          </View>
          <ThemedText type="smallBold" style={styles.emptyTitle}>
            Sign in to use your cart
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.buttonLabel}>
              Sign in
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!ready) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </ThemedView>
    );
  }

  if (vendorCarts.length === 0) {
    return (
      <ThemedView style={styles.screen}>
        <AppHeader collapsible />
        <View style={[styles.body, { paddingBottom: insets.bottom + BottomTabInset + Spacing.four }]}>
          {header}
          <View style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="cart-outline" size={36} color={theme.tint} />
          </View>
          <ThemedText type="smallBold" style={styles.emptyTitle}>
            Your cart is empty
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
            Add products from Explore and they will show up here.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/explore')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.buttonLabel}>
              Explore listings
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <AppHeader collapsible />
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.five },
        ]}>
        {header}
        <ThemedText type="small" themeColor="textSecondary" style={styles.whatsAppNote}>
          Orders are sent to vendors via WhatsApp. Tap submit order to open WhatsApp with your
          items pre-filled.
        </ThemedText>

        {vendorCarts.map((cart) => (
          <View
            key={cart.vendorId}
            style={[styles.vendorCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              onPress={() => router.push(`/vendor/${cart.vendorId}` as never)}
              style={styles.vendorHeader}>
              {cart.vendorImageUrl ? (
                <Image source={{ uri: cart.vendorImageUrl }} style={styles.vendorAvatar} />
              ) : (
                <View style={[styles.vendorAvatar, { backgroundColor: theme.backgroundSelected }]} />
              )}
              <ThemedText type="smallBold" style={styles.vendorName}>
                {cart.vendorName}
              </ThemedText>
            </Pressable>

            {cart.items.map((item) => (
              <View
                key={item.listingId}
                style={[styles.itemCard, { borderColor: theme.backgroundSelected }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
                )}
                <View style={styles.itemCopy}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {item.listingTitle}
                  </ThemedText>
                  {item.price ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.currency ?? 'GHS'} {item.price}
                    </ThemedText>
                  ) : null}
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() =>
                        void updateQuantity(cart.vendorId, item.listingId, item.quantity - 1)
                      }
                      style={[styles.qtyBtn, { borderColor: theme.backgroundSelected }]}>
                      <Ionicons name="remove" size={14} color={theme.text} />
                    </Pressable>
                    <ThemedText type="smallBold">{item.quantity}</ThemedText>
                    <Pressable
                      onPress={() =>
                        void updateQuantity(cart.vendorId, item.listingId, item.quantity + 1)
                      }
                      style={[styles.qtyBtn, { borderColor: theme.backgroundSelected }]}>
                      <Ionicons name="add" size={14} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => void removeItem(cart.vendorId, item.listingId)}>
                  <Ionicons name="trash-outline" size={18} color="#B42318" />
                </Pressable>
              </View>
            ))}

            <Pressable
              disabled={submittingVendorId === cart.vendorId}
              onPress={() => void submitOrder(cart.vendorId)}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: '#25D366',
                  opacity: submittingVendorId === cart.vendorId ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}>
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <ThemedText type="smallBold" style={styles.submitLabel}>
                Submit order via WhatsApp
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => void deleteCart(cart.vendorId)} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.clearCart}>
                Clear this vendor cart
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <OpeningExternalAppModal
        visible={openingWhatsApp}
        onDone={() => setOpeningWhatsApp(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  cartTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  whatsAppNote: {
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  copy: { textAlign: 'center' },
  button: {
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonLabel: { color: '#FFFFFF' },
  list: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  vendorCard: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  vendorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  vendorName: { flex: 1, fontSize: 16 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: Spacing.two,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  itemCopy: { flex: 1, gap: 4 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    paddingVertical: Spacing.three,
  },
  submitLabel: { color: '#FFFFFF' },
  clearCart: { textAlign: 'center', fontSize: 12 },
});
