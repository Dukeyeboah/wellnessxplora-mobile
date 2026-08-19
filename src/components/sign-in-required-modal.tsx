import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export function SignInRequiredModal({ visible, message, onClose }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const goLogin = () => {
    onClose();
    router.push('/profile?auth=login');
  };

  const goSignUp = () => {
    onClose();
    router.push('/profile?auth=signup');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={[styles.card, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" style={styles.title}>
            Sign in required
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable hitSlop={8} onPress={onClose} style={styles.cancelBtn}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={goLogin}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: theme.backgroundSelected, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold">Log in</ThemedText>
            </Pressable>
            <Pressable
              onPress={goSignUp}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}>
              <ThemedText type="smallBold" style={styles.primaryLabel}>
                Sign up
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
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    zIndex: 1,
  },
  title: {
    fontSize: 17,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  cancelBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    marginRight: 'auto',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryBtn: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
});
