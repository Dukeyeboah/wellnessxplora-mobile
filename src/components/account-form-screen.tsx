import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useChrome, useScrollChrome } from '@/lib/chrome';

type Props = {
  title: string;
  brand?: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  showSearch?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Account edit / dashboard layout — matches web mobile account pages. */
export function AccountFormScreen({
  title,
  brand,
  subtitle,
  backLabel,
  onBack,
  showSearch = true,
  children,
  footer,
  refreshing = false,
  onRefresh,
  contentStyle,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetChrome } = useChrome();
  const scrollChrome = useScrollChrome();

  useFocusEffect(
    useCallback(() => {
      resetChrome();
      return () => resetChrome();
    }, [resetChrome]),
  );

  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.push('/explore');
  };

  return (
    <ThemedView style={styles.screen}>
      <View
        style={[
          styles.chrome,
          {
            paddingTop: insets.top,
            backgroundColor: theme.background,
            borderBottomColor: theme.backgroundSelected,
          },
        ]}>
        <View style={styles.chromeRow}>
          <Pressable hitSlop={12} onPress={goBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
            {backLabel ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {backLabel}
              </ThemedText>
            ) : null}
          </Pressable>
          <View style={styles.titleBlock}>
            {brand ? (
              <ThemedText style={[styles.brand, { fontFamily: Fonts.serif }]}>{brand}</ThemedText>
            ) : null}
            <ThemedText style={[styles.title, { fontFamily: Fonts.serif }]}>{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.backSpacer} />
        </View>
        {showSearch ? (
          <View
            style={[
              styles.searchBox,
              Shadows.button,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            ]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
            <TextInput
              editable={false}
              placeholder="Search explore…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              onPressIn={() => router.push('/explore')}
            />
          </View>
        ) : null}
      </View>

      <ScrollView
        {...scrollChrome}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.five },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }>
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + Spacing.two,
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundSelected,
            },
          ]}>
          {footer}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  chrome: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    zIndex: 2,
  },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
    paddingTop: 2,
  },
  backSpacer: {
    minWidth: 72,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    gap: 2,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  brand: {
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
});
