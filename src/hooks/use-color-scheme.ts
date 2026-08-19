import { useThemePreference } from '@/lib/theme-preference';

/** App-wide color scheme from Appearance settings (light, dark, or automatic). */
export function useColorScheme() {
  const { colorScheme } = useThemePreference();
  return colorScheme;
}
