import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/lib/auth-context';

// Needed so the browser popup/sheet can close after Google redirects back.
WebBrowser.maybeCompleteAuthSession();

/**
 * Native Google Sign-In via a browser sheet + Google ID token → Firebase.
 * Works best once Google OAuth client IDs / redirect URIs are configured.
 * On web we use Firebase popup instead (see loginWithGoogle in AuthContext).
 */
export function useNativeGoogleSignIn() {
  const { loginWithGoogleIdToken } = useAuth();
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    webClientId
      ? {
          clientId: webClientId,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        }
      : {
          // Hook requires a config object; prompt will be disabled if clientId missing.
          clientId: 'missing.apps.googleusercontent.com',
        },
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (response?.type !== 'success') return;

    const idToken = response.params.id_token;
    if (!idToken) return;

    void loginWithGoogleIdToken(idToken);
  }, [response, loginWithGoogleIdToken]);

  return {
    ready: Platform.OS !== 'web' && Boolean(webClientId) && Boolean(request),
    missingClientId: Platform.OS !== 'web' && !webClientId,
    promptAsync,
  };
}
