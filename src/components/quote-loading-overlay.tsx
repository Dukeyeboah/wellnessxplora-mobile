import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { randomQuoteIndex, WELLNESS_QUOTES } from '@/lib/wellness-quotes';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
};

/** Full-screen overlay with rotating wellness quotes while a long task runs. */
export function QuoteLoadingOverlay({
  visible,
  title = 'Publishing…',
  subtitle = 'Hang tight — this can take a moment for photos and video.',
}: Props) {
  const theme = useTheme();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setQuoteIndex(randomQuoteIndex());
    const timer = setInterval(() => {
      setQuoteIndex((i) => randomQuoteIndex(i));
    }, 4500);
    return () => clearInterval(timer);
  }, [visible]);

  const quote = WELLNESS_QUOTES[quoteIndex] ?? WELLNESS_QUOTES[0]!;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: `${theme.background}F2` }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
        <View
          style={[
            styles.quoteCard,
            { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
          ]}>
          <ThemedText type="small" style={styles.quoteText}>
            “{quote.text}”
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.quoteAuthor}>
            — {quote.author}
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  title: { textAlign: 'center', marginTop: Spacing.two },
  subtitle: { textAlign: 'center', maxWidth: 280 },
  quoteCard: {
    marginTop: Spacing.four,
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    minHeight: 110,
    justifyContent: 'center',
  },
  quoteText: { fontStyle: 'italic', lineHeight: 20, textAlign: 'center' },
  quoteAuthor: { marginTop: Spacing.two, textAlign: 'center', fontSize: 11 },
});
