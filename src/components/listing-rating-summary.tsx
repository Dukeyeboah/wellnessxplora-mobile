import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';

type Props = {
  value: number;
  reviewCount: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Italicize the empty "No ratings yet" state (product cards). */
  emptyItalic?: boolean;
};

/** Product/listing rating row — stars summary or empty state. */
export function ListingRatingSummary({
  value,
  reviewCount,
  size = 11,
  style,
  emptyItalic = false,
}: Props) {
  const hasRating = reviewCount > 0 || value > 0;

  if (!hasRating) {
    return (
      <View style={style}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.empty, emptyItalic && styles.emptyItalic]}>
          No ratings yet
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={style}>
      <StarRating value={value} size={size} showValue reviewCount={reviewCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 11,
    lineHeight: 14,
  },
  emptyItalic: {
    fontStyle: 'italic',
  },
});
