import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  tint?: string;
  onPress: () => void;
  destructive?: boolean;
};

export function AccountMenuRow({
  icon,
  label,
  subtitle,
  tint,
  onPress,
  destructive = false,
}: Props) {
  const theme = useTheme();
  const iconColor = destructive ? '#B42318' : (tint ?? theme.tint);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <ThemedView type="backgroundElement" style={[styles.row, Shadows.card]}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <ThemedView style={styles.copy}>
          <ThemedText
            type="smallBold"
            style={destructive ? { color: '#B42318' } : undefined}>
            {label}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </ThemedView>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent',
  },
});
