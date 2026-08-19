import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countryFlagEmoji } from '@/lib/country-flag';

export const ALL_COUNTRIES = 'All countries';
/** Default hub filter — show all countries until we have multi-country inventory. */
export const DEFAULT_COUNTRY = ALL_COUNTRIES;
// export const DEFAULT_COUNTRY = 'Ghana';
const SELECTED_BG = '#F6E4D0';

type Props = {
  value: string;
  options: string[];
  onChange: (country: string) => void;
};

export function CountryFilterButton({ value, options, onChange }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.flagButton, Shadows.button, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.flagEmoji}>{countryFlagEmoji(value)}</ThemedText>
      </Pressable>
      {open ? (
        <View
          style={[
            styles.menu,
            Shadows.card,
            { backgroundColor: theme.backgroundElement },
          ]}>
          {options.map((country) => {
            const selected = country === value;
            return (
              <Pressable
                key={country}
                onPress={() => {
                  onChange(country);
                  setOpen(false);
                }}
                style={[styles.option, selected && { backgroundColor: SELECTED_BG }]}>
                <ThemedText style={styles.flagEmoji}>{countryFlagEmoji(country)}</ThemedText>
                <ThemedText type="small" style={styles.label}>
                  {country}
                </ThemedText>
                {selected ? <Ionicons name="checkmark" size={16} color="#C2410C" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 20,
  },
  flagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flagEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: 0,
    zIndex: 30,
    minWidth: 180,
    borderRadius: 14,
    paddingVertical: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    flex: 1,
  },
});
