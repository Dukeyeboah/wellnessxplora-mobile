import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppColorScheme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'automatic';

/** Automatic mode uses dark theme from 8:00 PM local time until midnight. */
export const AUTO_DARK_AFTER_HOUR = 20;

const STORAGE_KEY = 'wx.themeMode';

type ThemePreferenceValue = {
  colorScheme: AppColorScheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue | undefined>(undefined);

export function schemeForMode(mode: ThemeMode, date = new Date()): AppColorScheme {
  if (mode !== 'automatic') return mode;
  return date.getHours() >= AUTO_DARK_AFTER_HOUR ? 'dark' : 'light';
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'light' || raw === 'dark' || raw === 'automatic') {
        setModeState(raw);
      }
    });
  }, []);

  useEffect(() => {
    if (mode !== 'automatic') return;

    const tick = () => setClock(Date.now());
    const interval = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const colorScheme = useMemo(
    () => schemeForMode(mode, new Date(clock)),
    [mode, clock],
  );

  const value = useMemo(
    () => ({ colorScheme, mode, setMode }),
    [colorScheme, mode, setMode],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return ctx;
}
