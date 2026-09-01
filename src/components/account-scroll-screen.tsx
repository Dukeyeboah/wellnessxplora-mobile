import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, type ReactNode, type RefObject } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useChrome, useScrollChrome } from '@/lib/chrome';

type Props = {
  title?: string;
  showHeader?: boolean;
  /** Renders in the top app bar on the right (e.g. screen label). */
  headerRight?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  /** Sticky filters / search below the header. */
  sticky?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  bottomExtra?: number;
};

/**
 * Standard account-area layout: collapsible header, optional sticky chrome,
 * scroll-driven tab bar hide — same pattern as Explore.
 */
export function AccountScrollScreen({
  title = 'WellnessXplora',
  showHeader = true,
  headerRight,
  scrollRef: externalScrollRef,
  sticky,
  children,
  refreshing = false,
  onRefresh,
  contentStyle,
  bottomExtra = Spacing.four,
}: Props) {
  const insets = useSafeAreaInsets();
  const { resetChrome, headerVisible } = useChrome();
  const scrollChrome = useScrollChrome();
  const internalScrollRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  return (
    <ThemedView style={styles.screen}>
      {showHeader ? <AppHeader title={title} collapsible rightAction={headerRight} /> : null}
      {sticky ? (
        <View
          style={[
            styles.sticky,
            showHeader &&
              !headerVisible && {
                paddingTop: insets.top + Spacing.two,
              },
          ]}>
          {sticky}
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        {...scrollChrome}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + bottomExtra },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  sticky: {
    zIndex: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
});
