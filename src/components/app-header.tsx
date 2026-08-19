import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useChrome } from '@/lib/chrome';
import { HeaderAuthButton } from '@/components/header-auth-button';

const BRAND_LOGO = require('@/assets/images/wellnessxplora.png');
const DEFAULT_BAR_HEIGHT = 52;

type Props = {
  title?: string;
  /** Slide away on scroll; only return when the list is back at the top. */
  collapsible?: boolean;
  rightAction?: ReactNode;
  /** Show a sign-up button when the user is not signed in. */
  showAuthWhenSignedOut?: boolean;
};

/** Full-width top bar with the WellnessXplora wordmark. */
export function AppHeader({
  title = 'WellnessXplora',
  collapsible = false,
  rightAction,
  showAuthWhenSignedOut = false,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { headerVisible } = useChrome();
  const { user } = useAuth();
  const isBrand = title === 'WellnessXplora';
  const resolvedRightAction =
    rightAction ?? (showAuthWhenSignedOut && !user ? <HeaderAuthButton /> : null);

  const measuredHeight = useSharedValue(DEFAULT_BAR_HEIGHT);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!collapsible) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(headerVisible ? 1 : 0, { duration: 220 });
  }, [collapsible, headerVisible, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const height = measuredHeight.value;
    const hiddenOffset = interpolate(progress.value, [0, 1], [-height, 0]);
    return {
      transform: [{ translateY: hiddenOffset }],
      marginBottom: hiddenOffset,
    };
  });

  const row = (
    <View
      onLayout={(e) => {
        const next = e.nativeEvent.layout.height;
        if (next > 32) measuredHeight.value = next;
      }}
      style={styles.row}>
      {isBrand ? (
        <Image
          source={BRAND_LOGO}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="WellnessXplora"
        />
      ) : (
        <ThemedText type="smallBold" numberOfLines={1} style={styles.brand}>
          {title}
        </ThemedText>
      )}
      {resolvedRightAction ? <View style={styles.right}>{resolvedRightAction}</View> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: theme.background,
        },
      ]}>
      {collapsible ? (
        <Animated.View style={[styles.collapse, animatedStyle]}>{row}</Animated.View>
      ) : (
        row
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    zIndex: 20,
    overflow: 'visible',
  },
  collapse: {
    width: '100%',
    overflow: 'visible',
    zIndex: 20,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    zIndex: 20,
    overflow: 'visible',
  },
  logo: {
    flex: 1,
    height: 24,
    maxWidth: 150,
  },
  brand: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500',
  },
  right: {
    flexShrink: 0,
    zIndex: 21,
  },
});
