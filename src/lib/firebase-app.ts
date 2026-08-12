import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

/**
 * Shared Firebase app instance (same project as the wellnessXplora website).
 * Auth is platform-specific — see auth.native.ts / auth.web.ts.
 */
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

const missing = [
  !apiKey && 'EXPO_PUBLIC_FIREBASE_API_KEY',
  !authDomain && 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  !projectId && 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  !storageBucket && 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  !messagingSenderId && 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  !appId && 'EXPO_PUBLIC_FIREBASE_APP_ID',
].filter(Boolean) as string[];

if (missing.length > 0) {
  throw new Error(
    `Firebase is not configured: missing ${missing.join(', ')}. ` +
      'Copy .env.example to .env.local, fill in values from your Firebase web app config, then restart Expo.',
  );
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
