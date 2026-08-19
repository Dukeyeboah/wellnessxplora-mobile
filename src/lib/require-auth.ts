import { Alert, Platform } from 'react-native';
import type { Router } from 'expo-router';

export type RequireAuthAction = 'cart' | 'favorite' | 'rating' | 'whatsapp';

const MESSAGES: Record<RequireAuthAction, string> = {
  cart: 'To add items to your cart and order from vendors via WhatsApp, please log in or sign up.',
  favorite: 'To save products and vendors to your favorites, please log in or sign up.',
  rating: 'To leave a rating, please log in or sign up.',
  whatsapp: 'To message a vendor on WhatsApp, please log in or sign up.',
};

type SignInModalHandler = (message: string) => void;

let signInModalHandler: SignInModalHandler | null = null;

export function registerSignInModalHandler(handler: SignInModalHandler | null) {
  signInModalHandler = handler;
}

function fallbackAlert(message: string, router: Router) {
  Alert.alert('Sign in required', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log in / Sign up', onPress: () => router.push('/profile?auth=signup') },
  ]);
}

/** Returns true when the user is signed in; otherwise shows a sign-in prompt. */
export function requireAuth(
  isSignedIn: boolean,
  router: Router,
  action: RequireAuthAction,
): boolean {
  if (isSignedIn) return true;

  const message = MESSAGES[action];
  if (signInModalHandler) {
    signInModalHandler(message);
    return false;
  }

  if (Platform.OS !== 'web') {
    fallbackAlert(message, router);
  }
  return false;
}
