import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  appName?: string;
  onDone: () => void;
};

/** Shown briefly before handing off to WhatsApp (or another external app). */
export function OpeningExternalAppModal({
  visible,
  appName = 'WhatsApp',
  onDone,
}: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="smallBold" style={styles.title}>
            Opening {appName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
            You&apos;re leaving WellnessXplora to send your order message. Complete your order in{' '}
            {appName}, then return here anytime.
          </ThemedText>
          <Pressable
            onPress={onDone}
            style={[styles.btn, { backgroundColor: theme.tint }]}>
            <ThemedText type="smallBold" style={styles.btnLabel}>
              Continue
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
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    minWidth: 160,
    alignItems: 'center',
  },
  btnLabel: {
    color: '#FFFFFF',
  },
});
