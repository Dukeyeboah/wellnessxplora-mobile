import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';

let activeVerifier: RecaptchaVerifier | null = null;

export function clearPhoneRecaptcha() {
  if (activeVerifier) {
    try {
      activeVerifier.clear();
    } catch {
      /* already cleared */
    }
    activeVerifier = null;
  }
}

/** Ghana-friendly normalization (same idea as the website). */
export function normalizePhoneForAuth(raw: string): string {
  const trimmed = raw.trim().replace(/[\s-()]/g, '');
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  if (trimmed.startsWith('00')) {
    const digits = trimmed.slice(2).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `+233${digitsOnly.slice(1)}`;
  }
  if (trimmed.startsWith('0') && digitsOnly.length >= 10) {
    return `+233${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith('233') && digitsOnly.length >= 12) {
    return `+${digitsOnly}`;
  }

  return digitsOnly ? `+${digitsOnly}` : '';
}

/**
 * Phone SMS auth with Firebase JS needs a reCAPTCHA widget (DOM).
 * That works in the browser. On a real phone inside Expo Go it does not —
 * native phone auth needs a development build later.
 */
export async function sendPhoneCode(
  phoneNumber: string,
  containerId: string,
): Promise<ConfirmationResult> {
  if (Platform.OS !== 'web') {
    const err = new Error(
      'Phone sign-in on a physical device needs a development build. For now, test phone auth in the browser (npm run web).',
    ) as Error & { code: string };
    err.code = 'auth/phone-native-unavailable';
    throw err;
  }

  if (typeof document === 'undefined') {
    throw new Error('Phone verification requires a browser.');
  }

  clearPhoneRecaptcha();
  const el = document.getElementById(containerId);
  if (!el) {
    throw new Error('reCAPTCHA container missing. Refresh and try again.');
  }
  el.innerHTML = '';

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {},
  });
  activeVerifier = verifier;
  await verifier.render();

  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}
