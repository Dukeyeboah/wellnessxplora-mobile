import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Compact auth entry point for the top app bar (guests only). */
export function HeaderAuthButton() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/profile?auth=signup')}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}>
      <ThemedText type="smallBold" style={[styles.label, { color: theme.tint }]}>
        sign up / login
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'lowercase',
  },
});
