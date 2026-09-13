import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type FeedContentFilter = 'visual' | 'text' | 'events';

/**
 * Rail panel background opacity (0 = invisible, 1 = solid).
 * Tweak this to dial in how see-through the floating filter feels.
 */
export const FILTER_RAIL_BG_OPACITY = 0.75;

/** Border opacity for the same rail — keep a touch stronger than the fill. */
export const FILTER_RAIL_BORDER_OPACITY = 0.028;

const FILTERS: {
  id: FeedContentFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'visual', label: 'Photos & video', icon: 'images-outline', iconActive: 'images' },
  {
    id: 'text',
    label: 'Text',
    icon: 'chatbubble-ellipses-outline',
    iconActive: 'chatbubble-ellipses',
  },
  { id: 'events', label: 'Events', icon: 'calendar-outline', iconActive: 'calendar' },
];

type Props = {
  value: FeedContentFilter;
  onChange: (next: FeedContentFilter) => void;
};

function withAlpha(hexOrRgba: string, alpha: number): string {
  const hex = hexOrRgba.trim();
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    const full =
      hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;
    const r = parseInt(full.slice(1, 3), 16);
    const g = parseInt(full.slice(3, 5), 16);
    const b = parseInt(full.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hexOrRgba;
}

/** Floating vertical filter rail — sits above scrolling feed content. */
export function FeedContentTypeFilter({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: withAlpha(theme.backgroundElement, FILTER_RAIL_BG_OPACITY),
          borderColor: withAlpha(theme.backgroundSelected, FILTER_RAIL_BORDER_OPACITY),
        },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel="Content type"
      pointerEvents="box-none">
      {FILTERS.map(({ id, label, icon, iconActive }) => {
        const active = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            hitSlop={4}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={[
              styles.btn,
              active && { backgroundColor: `${theme.tint}22` },
            ]}>
            <Ionicons
              name={active ? iconActive : icon}
              size={20}
              color={active ? theme.tint : theme.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});
