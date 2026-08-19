import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  /** Average before stars, count in parentheses after — e.g. 4.2 ★★★★☆ (15). */
  showValue?: boolean;
  reviewCount?: number;
};

/** Integer stars filled from average — 4.2 → 4 stars, 4.5 → 5 stars. */
function filledStarCount(value: number): number {
  return Math.min(5, Math.max(0, Math.round(value)));
}

export function StarRating({
  value,
  size = 16,
  interactive = false,
  onChange,
  showValue = false,
  reviewCount,
}: Props) {
  const theme = useTheme();
  const filled = filledStarCount(value);
  const hasSummary = showValue && value > 0;

  return (
    <View style={styles.row}>
      {hasSummary ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.avg, { fontSize: size - 1, lineHeight: size + 2 }]}>
          {value.toFixed(1)}
        </ThemedText>
      ) : null}
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = interactive ? star <= value : star <= filled;
        const icon = (
          <Ionicons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? '#E6A817' : theme.textSecondary}
          />
        );
        if (!interactive) {
          return <View key={star}>{icon}</View>;
        }
        return (
          <Pressable key={star} hitSlop={4} onPress={() => onChange?.(star)}>
            {icon}
          </Pressable>
        );
      })}
      {hasSummary && typeof reviewCount === 'number' && reviewCount > 0 ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.count, { fontSize: size - 1, lineHeight: size + 2 }]}>
          ({reviewCount})
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  avg: {
    marginRight: 2,
  },
  count: {
    marginLeft: 2,
  },
});
