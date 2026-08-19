import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/lib/auth-context';
import { SignInModalProvider } from '@/lib/sign-in-modal';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colorScheme } = useThemePreference();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <SignInModalProvider>
          <RootNavigator />
        </SignInModalProvider>
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}
