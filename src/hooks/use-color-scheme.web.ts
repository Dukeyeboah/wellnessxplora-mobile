import { useEffect, useState } from 'react';

import { useThemePreference } from '@/lib/theme-preference';

/**
 * Web: wait for hydration, then use the app theme preference.
 */
export function useColorScheme() {
  const { colorScheme } = useThemePreference();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return 'light';
  }

  return colorScheme;
}
