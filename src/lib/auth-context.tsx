import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db } from '@/lib/firebase';
import { signInWithGoogleIdToken, signInWithGooglePopup } from '@/lib/google-auth';
import { clearPhoneRecaptcha, normalizePhoneForAuth, sendPhoneCode } from '@/lib/phone-auth';

export type UserRole = 'explorer' | 'vendor';

type AuthContextValue = {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  startPhoneLogin: (phone: string, recaptchaContainerId: string) => Promise<ConfirmationResult>;
  confirmPhoneLogin: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Popup blocked. Allow popups for this site and try again.';
    case 'auth/invalid-verification-code':
      return 'That SMS code is incorrect.';
    case 'auth/invalid-phone-number':
      return 'That phone number looks invalid. Use format +233XXXXXXXXX.';
    case 'auth/phone-native-unavailable':
      return 'Phone sign-in on device needs a development build. Test it in the browser for now.';
    case 'auth/no-app-profile':
      return 'No WellnessXplora account found for this login. Sign up on the website first.';
    default:
      return 'Could not sign in. Please try again.';
  }
}

async function requireExistingProfile(user: User): Promise<UserRole | null> {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    const err = new Error('No app profile') as Error & { code: string };
    err.code = 'auth/no-app-profile';
    throw err;
  }

  const role = snap.data()?.role;
  if (role === 'vendor' || role === 'explorer') return role;
  if (role === 'user') return 'explorer';
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const role = await requireExistingProfile(currentUser);
        setUser(currentUser);
        setUserRole(role);
      } catch (err) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: string }).code)
            : '';
        if (code === 'auth/no-app-profile') {
          setUser(null);
          setUserRole(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const finishLogin = useCallback(async (currentUser: User) => {
    await requireExistingProfile(currentUser);
  }, []);

  const loginWithGoogleIdTokenCb = useCallback(
    async (idToken: string) => {
      const cred = await signInWithGoogleIdToken(idToken);
      await finishLogin(cred.user);
    },
    [finishLogin],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userRole,
      loading,
      login: async (email, password) => {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await finishLogin(cred.user);
      },
      loginWithGoogle: async () => {
        if (Platform.OS !== 'web') {
          const err = new Error(
            'Use the Google button native flow on device.',
          ) as Error & { code: string };
          err.code = 'auth/operation-not-supported-in-this-environment';
          throw err;
        }
        const cred = await signInWithGooglePopup();
        await finishLogin(cred.user);
      },
      loginWithGoogleIdToken: loginWithGoogleIdTokenCb,
      startPhoneLogin: async (phone, recaptchaContainerId) => {
        const normalized = normalizePhoneForAuth(phone);
        if (!normalized.startsWith('+') || normalized.length < 11) {
          const err = new Error('Invalid phone') as Error & { code: string };
          err.code = 'auth/invalid-phone-number';
          throw err;
        }
        return sendPhoneCode(normalized, recaptchaContainerId);
      },
      confirmPhoneLogin: async (confirmation, code) => {
        try {
          const cred = await confirmation.confirm(code.trim());
          await finishLogin(cred.user);
        } finally {
          clearPhoneRecaptcha();
        }
      },
      logout: async () => {
        clearPhoneRecaptcha();
        await signOut(auth);
      },
    }),
    [user, userRole, loading, finishLogin, loginWithGoogleIdTokenCb],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthErrorMessage(error: unknown): string {
  return mapAuthError(error);
}
