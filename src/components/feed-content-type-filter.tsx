import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type FeedContentFilter = 'visual' | 'text' | 'events';

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

export function FeedContentTypeFilter({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel="Content type">
      {FILTERS.map(({ id, label, icon, iconActive }) => {
        const active = value === id;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={styles.btn}>
            <Ionicons
              name={active ? iconActive : icon}
              size={20}
              color={active ? theme.text : theme.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    alignSelf: 'center',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
