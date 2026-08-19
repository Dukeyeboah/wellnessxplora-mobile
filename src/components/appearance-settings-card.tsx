import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/lib/theme-preference';

export function AppearanceSettingsCard() {
  const theme = useTheme();
  const { mode, setMode, colorScheme } = useThemePreference();
  const automatic = mode === 'automatic';

  return (
    <ThemedView type="backgroundElement" style={[styles.card, Shadows.card]}>
      <ThemedText type="smallBold" style={styles.heading}>
        Appearance
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Choose light or dark, or let the app switch after 8:00 PM.
      </ThemedText>

      <View style={styles.row}>
        <View style={styles.rowCopy}>
          <ThemedText type="smallBold">Automatic</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Dark theme after 8:00 PM local time
          </ThemedText>
        </View>
        <Switch
          value={automatic}
          onValueChange={(on) => setMode(on ? 'automatic' : colorScheme)}
          trackColor={{ false: theme.backgroundSelected, true: theme.tint }}
        />
      </View>

      {!automatic ? (
        <View style={styles.modeRow}>
          {(['light', 'dark'] as const).map((id) => {
            const active = mode === id;
            return (
              <Pressable
                key={id}
                onPress={() => setMode(id)}
                style={[
                  styles.modeChip,
                  active ? Shadows.buttonPressed : Shadows.button,
                  {
                    backgroundColor: active
                      ? theme.backgroundSelected
                      : theme.backgroundElement,
                  },
                ]}>
                <ThemedText type="smallBold">
                  {id === 'light' ? 'Light' : 'Dark'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: 20,
  },
  heading: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
  },
});
