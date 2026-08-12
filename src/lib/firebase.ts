import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { auth } from '@/lib/auth';
import { app } from '@/lib/firebase-app';

/**
 * Same Firebase project as the wellnessXplora website.
 *
 * - `auth` comes from auth.native.ts on phone, auth.web.ts in the browser
 *   (Expo/Metro picks the right file automatically)
 * - `db` / `storage` are shared
 */
export { app, auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
