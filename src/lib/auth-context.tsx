import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db } from '@/lib/firebase';
import { ensureVendorDoc } from '@/lib/ensure-vendor-doc';
import { signInWithGoogleIdToken, signInWithGooglePopup } from '@/lib/google-auth';
import { clearPhoneRecaptcha, normalizePhoneForAuth, sendPhoneCode } from '@/lib/phone-auth';
import { fetchUserProfile, type UserProfile } from '@/lib/user-profile';

export type UserRole = 'explorer' | 'vendor';

type AuthContextValue = {
  user: User | null;
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  reloadUserProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signupWithGoogle: (role: UserRole) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  startPhoneLogin: (phone: string, recaptchaContainerId: string) => Promise<ConfirmationResult>;
  confirmPhoneLogin: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  /** Upgrade an explorer to vendor and ensure a storefront doc exists. */
  upgradeToVendorRole: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let pendingSignupRole: UserRole | null = null;

export function setPendingSignupRole(role: UserRole | null) {
  pendingSignupRole = role;
}

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
    case 'auth/email-already-in-use':
      return 'That email already has an account. Log in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
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
      return 'No WellnessXplora account found for this login. Create an account first.';
    case 'auth/profile-exists':
      return 'That account already exists. Log in instead.';
    case 'auth/role-required':
      return 'Choose Member or Vendor before continuing.';
    default:
      return 'Could not sign in. Please try again.';
  }
}

function roleFromDoc(data: Record<string, unknown> | undefined): UserRole | null {
  const role = data?.role;
  if (role === 'vendor' || role === 'explorer') return role;
  if (role === 'user') return 'explorer';
  return null;
}

async function createUserProfile(user: User, role: UserRole): Promise<void> {
  const email = user.email ?? '';
  const displayName =
    user.displayName || user.phoneNumber || (email ? email.split('@')[0] : '') || 'Member';

  await setDoc(doc(db, 'users', user.uid), {
    name: displayName,
    email,
    role,
    capabilities: role === 'vendor' ? ['member', 'vendor'] : ['member'],
    photoURL: user.photoURL ?? '',
    bannerURL: '',
    profileComplete: false,
    createdAt: serverTimestamp(),
    location: { country: '', city: '', area: '' },
  });

  if (role === 'vendor') {
    try {
      await ensureVendorDoc({
        uid: user.uid,
        businessName: displayName,
        photoURL: user.photoURL ?? '',
      });
    } catch (err) {
      // Rules may require verified email — role is still set; storefront can be created later.
      console.warn('[auth] ensureVendorDoc on signup failed', err);
    }
  }
}

async function ensureProfile(user: User): Promise<UserRole | null> {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists()) {
    pendingSignupRole = null;
    return roleFromDoc(snap.data() as Record<string, unknown>);
  }

  if (pendingSignupRole) {
    const role = pendingSignupRole;
    await createUserProfile(user, role);
    pendingSignupRole = null;
    return role;
  }

  await signOut(auth);
  const err = new Error('No app profile') as Error & { code: string };
  err.code = 'auth/no-app-profile';
  throw err;
}

async function googlePopup() {
  if (Platform.OS !== 'web') {
    const err = new Error('Use the Google button native flow on device.') as Error & {
      code: string;
    };
    err.code = 'auth/operation-not-supported-in-this-environment';
    throw err;
  }
  return signInWithGooglePopup();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const profile = await fetchUserProfile(uid);
    setUserProfile(profile);
    if (profile) setUserRole(profile.role);
  }, []);

  const reloadUserProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.uid);
  }, [loadProfile, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const role = await ensureProfile(currentUser);
        setUser(currentUser);
        setUserRole(role);
        await loadProfile(currentUser.uid);
      } catch (err) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code: string }).code)
            : '';
        if (code === 'auth/no-app-profile' || code === 'auth/profile-exists') {
          setUser(null);
          setUserRole(null);
          setUserProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const finishAuth = useCallback(async (currentUser: User) => {
    await ensureProfile(currentUser);
  }, []);

  const loginWithGoogleIdTokenCb = useCallback(
    async (idToken: string) => {
      const cred = await signInWithGoogleIdToken(idToken);
      await finishAuth(cred.user);
    },
    [finishAuth],
  );

  const upgradeToVendorRole = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('You must be signed in to become a vendor.');
    await updateDoc(doc(db, 'users', current.uid), {
      role: 'vendor',
      capabilities: ['member', 'vendor'],
      updatedAt: serverTimestamp(),
    });
    const profile = await fetchUserProfile(current.uid);
    await ensureVendorDoc({
      uid: current.uid,
      businessName: profile?.name || current.displayName || 'My business',
      photoURL: profile?.photoURL || current.photoURL || '',
    });
    await reloadUserProfile();
  }, [reloadUserProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userRole,
      userProfile,
      loading,
      reloadUserProfile,
      upgradeToVendorRole,
      login: async (email, password) => {
        pendingSignupRole = null;
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await finishAuth(cred.user);
      },
      signup: async (email, password, role) => {
        pendingSignupRole = role;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await finishAuth(cred.user);
        } catch (err) {
          pendingSignupRole = null;
          throw err;
        }
      },
      loginWithGoogle: async () => {
        pendingSignupRole = null;
        const cred = await googlePopup();
        await finishAuth(cred.user);
      },
      signupWithGoogle: async (role) => {
        pendingSignupRole = role;
        try {
          const cred = await googlePopup();
          await finishAuth(cred.user);
        } catch (err) {
          pendingSignupRole = null;
          throw err;
        }
      },
      loginWithGoogleIdToken: loginWithGoogleIdTokenCb,
      startPhoneLogin: async (phone, recaptchaContainerId) => {
        const normalized = normalizePhoneForAuth(phone);
        if (!/^\+\d{10,15}$/.test(normalized)) {
          const err = new Error('Invalid phone') as Error & { code: string };
          err.code = 'auth/invalid-phone-number';
          throw err;
        }
        return sendPhoneCode(normalized, recaptchaContainerId);
      },
      confirmPhoneLogin: async (confirmation, code) => {
        try {
          const cred = await confirmation.confirm(code.trim());
          await finishAuth(cred.user);
        } finally {
          clearPhoneRecaptcha();
        }
      },
      logout: async () => {
        pendingSignupRole = null;
        clearPhoneRecaptcha();
        setUserProfile(null);
        await signOut(auth);
      },
    }),
    [
      user,
      userRole,
      userProfile,
      loading,
      reloadUserProfile,
      upgradeToVendorRole,
      finishAuth,
      loginWithGoogleIdTokenCb,
    ],
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
