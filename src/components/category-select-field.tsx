import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { EXPLORE_CATEGORIES } from '@/lib/explore-categories';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  primarySlug: string;
  secondarySlugs: string[];
  onPrimaryChange: (slug: string) => void;
  onSecondaryToggle: (slug: string) => void;
};

const MAX_SECONDARY = 3;

export function CategorySelectField({
  primarySlug,
  secondarySlugs,
  onPrimaryChange,
  onSecondaryToggle,
}: Props) {
  const theme = useTheme();

  const renderPill = (slug: string, selected: boolean, disabled: boolean, onPress: () => void) => {
    const cat = EXPLORE_CATEGORIES.find((c) => c.slug === slug);
    if (!cat) return null;
    return (
      <Pressable
        key={slug}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.pill,
          {
            borderColor: selected ? theme.tint : theme.backgroundSelected,
            backgroundColor: selected ? '#EEF5F0' : theme.backgroundElement,
            opacity: disabled ? 0.45 : 1,
          },
        ]}>
        <ThemedText type="small" style={{ color: selected ? theme.tint : theme.text, fontSize: 11 }}>
          {cat.title}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <FormTip>
        Choose one primary category that best describes your business (required). You can optionally
        add up to 3 secondary categories for discovery. Your primary choice is disabled in the
        secondary list.
      </FormTip>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <ThemedText type="smallBold">Primary category *</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {primarySlug ? '1/1 selected' : '0/1 selected'}
          </ThemedText>
        </View>
        <ScrollView
          nestedScrollEnabled
          style={[styles.pillBox, { borderColor: theme.backgroundSelected }]}
          contentContainerStyle={styles.pillContent}>
          {EXPLORE_CATEGORIES.map((cat) =>
            renderPill(cat.slug, primarySlug === cat.slug, false, () => onPrimaryChange(cat.slug)),
          )}
        </ScrollView>
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <ThemedText type="smallBold">Secondary categories (optional)</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {secondarySlugs.length}/{MAX_SECONDARY} selected
          </ThemedText>
        </View>
        <ScrollView
          nestedScrollEnabled
          style={[styles.pillBox, styles.pillBoxTall, { borderColor: theme.backgroundSelected }]}
          contentContainerStyle={styles.pillContent}>
          {EXPLORE_CATEGORIES.map((cat) => {
            const isPrimary = primarySlug === cat.slug;
            const selected = secondarySlugs.includes(cat.slug);
            const atCap = secondarySlugs.length >= MAX_SECONDARY && !selected;
            return renderPill(cat.slug, selected, isPrimary || atCap, () => onSecondaryToggle(cat.slug));
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function FormTip({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tip, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12, lineHeight: 18 }}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
  },
  tip: {
    borderRadius: 10,
    padding: Spacing.three,
  },
  block: {
    gap: Spacing.two,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pillBox: {
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
  },
  pillBoxTall: {
    maxHeight: 160,
  },
  pillContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
