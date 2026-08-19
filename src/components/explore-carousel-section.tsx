import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ExploreListingCard } from '@/components/explore-listing-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExploreCarouselSection } from '@/lib/listings';

/** Compact carousel cards — ~2 visible on a phone-width screen. */
const CAROUSEL_CARD_WIDTH = 176;
const ITEM_GAP = Spacing.three;
const PAGE_STRIDE = CAROUSEL_CARD_WIDTH + ITEM_GAP;

type Props = {
  section: ExploreCarouselSection;
};

export function ExploreCarouselSectionRow({ section }: Props) {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_STRIDE);
      const clamped = Math.min(Math.max(0, index), section.listings.length - 1);
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
    },
    [section.listings.length],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          {section.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {section.subtitle}
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        decelerationRate="normal"
        showsHorizontalScrollIndicator={false}
        style={styles.carouselTrack}
        contentContainerStyle={styles.carouselContent}
        onScroll={onScroll}
        scrollEventThrottle={32}>
        {section.listings.map((item, index) => (
          <View
            key={item.id}
            style={index < section.listings.length - 1 ? styles.carouselItem : undefined}>
            <ExploreListingCard listing={item} compact compactWidth={CAROUSEL_CARD_WIDTH} />
          </View>
        ))}
      </ScrollView>

      {section.listings.length > 1 ? (
        <View style={styles.dotsRow} accessibilityRole="tablist">
          {section.listings.map((item, index) => {
            const active = index === activeIndex;
            return (
              <View
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.dot,
                  active && styles.dotActive,
                  { backgroundColor: active ? theme.tint : theme.backgroundSelected },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  sectionCopy: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  carouselTrack: {
    width: '100%',
    alignSelf: 'stretch',
  },
  carouselContent: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  carouselItem: {
    marginRight: ITEM_GAP,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
