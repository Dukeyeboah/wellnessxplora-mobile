import {
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
// @ts-expect-error RN bundle exports this; web type defs often omit it
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

import { app } from '@/lib/firebase-app';

/**
 * Native Auth must store the session in AsyncStorage,
 * otherwise signing in is forgotten when the app restarts.
 */
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
