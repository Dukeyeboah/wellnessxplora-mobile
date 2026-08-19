import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <ThemedView style={styles.screen}>
      <View
        style={[
          styles.body,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}>
        <View
          style={[styles.iconWrap, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="heart-outline" size={36} color={theme.tint} />
        </View>
        <ThemedText type="smallBold" style={styles.title}>
          {user ? 'No favorites yet' : 'Save products you love'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
          {user
            ? 'Tap the heart on a listing to keep it here. That comes next — for now, keep exploring.'
            : 'Sign in to save your favorite products and vendors.'}
        </ThemedText>
        <Pressable
          onPress={() => router.push(user ? '/explore' : '/profile')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
          ]}>
          <ThemedText type="smallBold" style={styles.buttonLabel}>
            {user ? 'Explore listings' : 'Sign in'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#FFFFFF',
  },
});
