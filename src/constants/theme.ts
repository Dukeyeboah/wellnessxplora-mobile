/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1C19',
    /** Page chrome — CSS snow. Cards stay white via `backgroundElement`. */
    background: '#FFFAFA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEE8E8',
    textSecondary: '#6B6F66',
    tint: '#3D6B4F',
  },
  dark: {
    text: '#F4F4F0',
    background: '#121412',
    backgroundElement: '#1C1E1B',
    backgroundSelected: '#2A2D28',
    textSecondary: '#B0B4BA',
    tint: '#8FBF9A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Tab bar content height plus breathing room so lists aren't covered. */
export const BottomTabInset = Platform.select({ ios: 72, android: 80, default: 72 }) ?? 72;
export const MaxContentWidth = 800;

/** Extra space under the last Explore item (on top of BottomTabInset + safe area). */
export const ExploreBottomExtra = 8;

/** Gap between Explore carousel sections, and before “Browse all categories”. */
export const ExploreSectionGap = 32;

/**
 * Raised / pressed shadows. Tweak opacity, offset, and radius here.
 * `buttonPressed` uses an inset shadow so active pills look pushed into the screen.
 */
export const Shadows = {
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 3.5,
    elevation: 4,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.14)',
  },
  buttonPressed: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    boxShadow: 'inset 0px 2px 4px rgba(0, 0, 0, 0.22)',
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.14,
    elevation: 5,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
  },
} as const;
