import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchIsAdmin } from '@/lib/admin-auth';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileMenuSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, userProfile, userRole, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void fetchIsAdmin(user.uid).then(setIsAdmin);
  }, [user]);

  if (!user) return null;

  const photoURL = userProfile?.photoURL || user.photoURL || '';
  const handle = userProfile?.username?.trim();
  const label = handle
    ? `@${handle}`
    : userProfile?.name || user.displayName || 'Account';

  const go = (href: string) => {
    onClose();
    router.push(href as never);
  };

  const items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    href: string;
    vendorOnly?: boolean;
    adminOnly?: boolean;
  }[] = [
    { icon: 'grid-outline', label: 'Dashboard', href: '/dashboard', vendorOnly: true },
    { icon: 'heart-outline', label: 'Favorites', href: '/favorites' },
    { icon: 'cart-outline', label: 'Cart', href: '/cart' },
    { icon: 'person-outline', label: 'Edit profile', href: '/profile-edit' },
    { icon: 'settings-outline', label: 'Account', href: '/profile' },
    { icon: 'shield-outline', label: 'Admin', href: '/admin', adminOnly: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          Shadows.card,
          {
            backgroundColor: theme.backgroundElement,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}>
        <View style={styles.handle} />
        <View style={styles.identity}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="person" size={28} color={theme.textSecondary} />
            </View>
          )}
          <View style={styles.identityText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {user.email ?? user.phoneNumber ?? ''}
            </ThemedText>
          </View>
        </View>

        {items
          .filter((item) => !item.vendorOnly || userRole === 'vendor')
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const active = item.href === '/profile' && pathname === '/profile';
            return (
            <Pressable
              key={item.href}
              onPress={() => go(item.href)}
              style={({ pressed }) => [
                styles.menuRow,
                active && { backgroundColor: theme.backgroundSelected },
                { opacity: pressed ? 0.75 : 1 },
              ]}>
              <Ionicons name={item.icon} size={20} color={active ? theme.tint : theme.tint} />
              <ThemedText
                type="smallBold"
                style={[styles.menuLabel, active && { color: theme.tint }]}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
          })}

        <Pressable
          onPress={() => {
            onClose();
            void logout();
          }}
          style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.75 : 1 }]}>
          <Ionicons name="log-out-outline" size={20} color="#B42318" />
          <ThemedText type="smallBold" style={[styles.menuLabel, { color: '#B42318' }]}>
            Sign out
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: Spacing.two,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  menuLabel: {
    flex: 1,
  },
});
