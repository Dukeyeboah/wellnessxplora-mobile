import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const GOOGLE_BLUE = '#4285F4';

type Props = {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

/** Google-blue CTA matching the website auth buttons. */
export function GoogleAuthButton({ label, disabled, loading, onPress }: Props) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { opacity: disabled || loading ? 0.45 : pressed ? 0.88 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <View style={styles.iconWrap}>
            <Image
              source={require('@/assets/images/google_logo.png')}
              style={styles.googleLogo}
              contentFit="contain"
            />
          </View>
          <ThemedText type="smallBold" style={styles.label}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: GOOGLE_BLUE,
    paddingHorizontal: Spacing.three,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
