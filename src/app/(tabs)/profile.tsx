import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ConfirmationResult } from 'firebase/auth';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AccountMenuRow } from '@/components/account-menu-row';
import { AppearanceSettingsCard } from '@/components/appearance-settings-card';
import { AuthCategoryBackdrop } from '@/components/auth-category-backdrop';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { PasswordField } from '@/components/password-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Shadows, Spacing } from '@/constants/theme';
import { useNativeGoogleSignIn } from '@/hooks/use-native-google-sign-in';
import { useTheme } from '@/hooks/use-theme';
import {
  getAuthErrorMessage,
  setPendingSignupRole,
  useAuth,
  type UserRole,
} from '@/lib/auth-context';

type AuthScreen = 'login' | 'signup';
type Method = 'email' | 'phone' | null;

const RECAPTCHA_ID = 'phone-recaptcha';
const LOGO = require('@/assets/images/logo.png');

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { auth: authParam } = useLocalSearchParams<{ auth?: string }>();
  const {
    user,
    userRole,
    userProfile,
    loading,
    login,
    signup,
    loginWithGoogle,
    signupWithGoogle,
    startPhoneLogin,
    confirmPhoneLogin,
    logout,
  } = useAuth();
  const nativeGoogle = useNativeGoogleSignIn();

  const [authScreen, setAuthScreen] = useState<AuthScreen>('signup');
  const [accountType, setAccountType] = useState<UserRole | null>(null);
  const [method, setMethod] = useState<Method>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authParam === 'login') setAuthScreen('login');
    else if (authParam === 'signup') setAuthScreen('signup');
  }, [authParam]);

  useEffect(() => {
    setError(null);
    setConfirmation(null);
    setSmsCode('');
  }, [method, authScreen]);

  const switchScreen = (next: AuthScreen) => {
    setAuthScreen(next);
    setMethod(null);
    setAccountType(null);
    setPendingSignupRole(null);
    setError(null);
  };

  const onEmailSubmit = async () => {
    setError(null);
    if (authScreen === 'signup') {
      if (!accountType) {
        setError('Select Vendor or Explorer before continuing.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setSubmitting(true);
    try {
      if (authScreen === 'signup' && accountType) {
        await signup(email, password, accountType);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    if (authScreen === 'signup' && !accountType) {
      setError('Select Vendor or Explorer before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      if (Platform.OS === 'web') {
        if (authScreen === 'signup' && accountType) {
          await signupWithGoogle(accountType);
        } else {
          await loginWithGoogle();
        }
      } else if (nativeGoogle.missingClientId) {
        setError(
          'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env.local (from Firebase → Authentication → Google). Or test Google in the browser with npm run web.',
        );
      } else {
        setPendingSignupRole(authScreen === 'signup' ? accountType : null);
        await nativeGoogle.promptAsync();
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onSendCode = async () => {
    setError(null);
    if (authScreen === 'signup' && !accountType) {
      setError('Select Vendor or Explorer before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      setPendingSignupRole(authScreen === 'signup' ? accountType : null);
      const result = await startPhoneLogin(phone, RECAPTCHA_ID);
      setConfirmation(result);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmCode = async () => {
    if (!confirmation) return;
    setError(null);
    setSubmitting(true);
    try {
      await confirmPhoneLogin(confirmation, smsCode);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            Checking session…
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      {user ? (
        <View style={[styles.accountHeader, { paddingTop: insets.top + Spacing.two }]}>
          <View style={styles.accountHeaderSpacer} />
          <View style={styles.accountHeaderCenter}>
            <Ionicons name="settings-outline" size={18} color={theme.tint} />
            <ThemedText type="smallBold" style={styles.accountHeaderTitle}>
              Account
            </ThemedText>
          </View>
          <View style={styles.accountHeaderSpacer} />
        </View>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.flex}>
          {!user ? <AuthCategoryBackdrop /> : null}
          <ScrollView
            contentContainerStyle={[
              styles.content,
              !user && {
                flexGrow: 1,
                justifyContent: 'center',
                minHeight: windowHeight - insets.top - insets.bottom - BottomTabInset,
              },
              { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
            ]}
            keyboardShouldPersistTaps="handled">
            {user ? (
              <View style={styles.accountStack}>
                <ThemedView type="backgroundElement" style={[styles.card, styles.identityCard, Shadows.card]}>
                  <View style={styles.identityRow}>
                    {userProfile?.photoURL || user.photoURL ? (
                      <Image
                        source={{ uri: userProfile?.photoURL || user.photoURL || '' }}
                        style={styles.accountAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.accountAvatar, { backgroundColor: theme.backgroundSelected }]}>
                        <Ionicons name="person" size={28} color={theme.textSecondary} />
                      </View>
                    )}
                    <View style={styles.identityCopy}>
                      <ThemedText type="smallBold" style={styles.accountName}>
                        {userProfile?.username
                          ? `@${userProfile.username}`
                          : userProfile?.name || user.displayName || 'Account'}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        style={styles.accountEmail}>
                        {user.email ?? user.phoneNumber}
                      </ThemedText>
                      {userRole ? (
                        <ThemedText
                          type="small"
                          style={{
                            color: userRole === 'vendor' ? '#0284C7' : '#B45309',
                            fontSize: 12,
                            marginTop: 2,
                          }}>
                          {userRole === 'vendor' ? 'Vendor account' : 'Explorer account'}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                </ThemedView>

                {userRole === 'vendor' ? (
                  <AccountMenuRow
                    icon="grid-outline"
                    label="Dashboard"
                    subtitle="Manage listings and storefront"
                    onPress={() => router.push('/dashboard' as never)}
                  />
                ) : null}
                <AccountMenuRow
                  icon="heart-outline"
                  label="Favorites"
                  subtitle="Saved products and vendors"
                  onPress={() => router.push('/favorites')}
                />
                <AccountMenuRow
                  icon="cart-outline"
                  label="Cart"
                  subtitle="WhatsApp order cart"
                  onPress={() => router.push('/cart')}
                />
                <AccountMenuRow
                  icon="person-outline"
                  label="Edit profile"
                  subtitle="Photo, contact, and location"
                  onPress={() => router.push('/profile-edit' as never)}
                />
                <AccountMenuRow
                  icon="log-out-outline"
                  label="Sign out"
                  destructive
                  onPress={() => void logout()}
                />
                <AppearanceSettingsCard />
              </View>
            ) : (
              <ThemedView type="backgroundElement" style={[styles.card, Shadows.card]}>
                <Image source={LOGO} style={styles.logo} contentFit="contain" />

                <ThemedText type="smallBold" style={styles.title}>
                  {authScreen === 'signup' ? 'Create an account' : 'Welcome back'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                  {authScreen === 'signup'
                    ? 'Sign up for your WellnessXplora account'
                    : 'Log in with your WellnessXplora account'}
                </ThemedText>

                {authScreen === 'signup' ? (
                  <View style={styles.roleBlock}>
                    <ThemedText type="smallBold" style={styles.roleHeading}>
                      Select account type
                    </ThemedText>
                    <View style={styles.roleRow}>
                      <Pressable
                        onPress={() => {
                          setAccountType('vendor');
                          setPendingSignupRole('vendor');
                        }}
                        style={[
                          styles.roleCard,
                          {
                            borderColor:
                              accountType === 'vendor' ? '#C9A227' : theme.backgroundSelected,
                            backgroundColor:
                              accountType === 'vendor' ? '#FFF8E8' : theme.backgroundElement,
                          },
                        ]}>
                        <ThemedText type="smallBold" style={styles.roleCardText}>
                          Vendor (seller)
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.roleCardText}>
                          List your business
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setAccountType('explorer');
                          setPendingSignupRole('explorer');
                        }}
                        style={[
                          styles.roleCard,
                          {
                            borderColor:
                              accountType === 'explorer' ? '#7EB6D9' : theme.backgroundSelected,
                            backgroundColor:
                              accountType === 'explorer' ? '#F0F7FC' : theme.backgroundElement,
                          },
                        ]}>
                        <ThemedText type="smallBold" style={styles.roleCardText}>
                          Explorer (buyer)
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.roleCardText}>
                          Browse & discover
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {authScreen === 'signup' && !accountType ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                    Select an account type to sign up
                  </ThemedText>
                ) : null}

                <GoogleAuthButton
                  label={
                    authScreen === 'signup' ? 'Sign up with Google' : 'Log in with Google'
                  }
                  disabled={submitting || (authScreen === 'signup' && !accountType)}
                  loading={submitting && method === null}
                  onPress={() => void onGoogle()}
                />

                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.or}>
                    OR
                  </ThemedText>
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                </View>

                <View style={styles.methodRow}>
                  {([
                    { id: 'email' as const, label: 'Email & password', icon: 'mail-outline' },
                    { id: 'phone' as const, label: 'Phone', icon: 'call-outline' },
                  ] as const).map((item) => {
                    const active = method === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setMethod(active ? null : item.id)}
                        style={[
                          styles.methodChip,
                          active ? Shadows.buttonPressed : Shadows.button,
                          {
                            borderColor: theme.backgroundSelected,
                            backgroundColor: active
                              ? theme.backgroundSelected
                              : theme.backgroundElement,
                          },
                        ]}>
                        <Ionicons
                          name={item.icon}
                          size={16}
                          color={active ? theme.tint : theme.text}
                        />
                        <ThemedText type="smallBold" style={styles.methodLabel}>
                          {item.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {method === 'email' ? (
                  <View style={styles.fields}>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      placeholder="you@example.com"
                      placeholderTextColor={theme.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.backgroundSelected },
                      ]}
                    />
                    <PasswordField
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                    />
                    {authScreen === 'signup' ? (
                      <PasswordField
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                    ) : null}
                    <Pressable
                      disabled={
                        submitting ||
                        !email ||
                        !password ||
                        (authScreen === 'signup' && (!accountType || !confirmPassword))
                      }
                      onPress={() => void onEmailSubmit()}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        {
                          backgroundColor: theme.tint,
                          opacity:
                            submitting ||
                            !email ||
                            !password ||
                            (authScreen === 'signup' && (!accountType || !confirmPassword))
                              ? 0.4
                              : pressed
                                ? 0.85
                                : 1,
                        },
                      ]}>
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <ThemedText type="smallBold" style={styles.primaryLabel}>
                          {authScreen === 'signup' ? 'Create account' : 'Log in'}
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {method === 'phone' ? (
                  <View style={styles.phoneFields}>
                    <TextInput
                      autoComplete="tel"
                      keyboardType="phone-pad"
                      placeholder="0209792234"
                      placeholderTextColor={theme.textSecondary}
                      value={phone}
                      onChangeText={setPhone}
                      editable={Platform.OS === 'web'}
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.backgroundSelected },
                      ]}
                    />
                    {!confirmation ? (
                      <Pressable
                        disabled={submitting || !phone || Platform.OS !== 'web'}
                        onPress={() => void onSendCode()}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          {
                            backgroundColor: theme.tint,
                            opacity:
                              submitting || !phone || Platform.OS !== 'web'
                                ? 0.4
                                : pressed
                                  ? 0.85
                                  : 1,
                          },
                        ]}>
                        {submitting ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <ThemedText type="smallBold" style={styles.primaryLabel}>
                            Send SMS code
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : (
                      <>
                        <TextInput
                          keyboardType="number-pad"
                          placeholder="SMS code"
                          placeholderTextColor={theme.textSecondary}
                          value={smsCode}
                          onChangeText={setSmsCode}
                          style={[
                            styles.input,
                            { color: theme.text, borderColor: theme.backgroundSelected },
                          ]}
                        />
                        <Pressable
                          disabled={submitting || smsCode.length < 6}
                          onPress={() => void onConfirmCode()}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            {
                              backgroundColor: theme.tint,
                              opacity:
                                submitting || smsCode.length < 6 ? 0.4 : pressed ? 0.85 : 1,
                            },
                          ]}>
                          {submitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <ThemedText type="smallBold" style={styles.primaryLabel}>
                              Verify
                            </ThemedText>
                          )}
                        </Pressable>
                      </>
                    )}
                    {Platform.OS === 'web'
                      ? createElement('div', {
                          id: RECAPTCHA_ID,
                          style: { height: 0, overflow: 'hidden' },
                        })
                      : (
                        <ThemedText type="small" themeColor="textSecondary">
                          Phone sign-in on device needs a development build — test in the browser for now.
                        </ThemedText>
                      )}
                  </View>
                ) : null}

                {error ? (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                ) : null}

                <Pressable
                  onPress={() => switchScreen(authScreen === 'signup' ? 'login' : 'signup')}
                  style={styles.footerLink}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {authScreen === 'signup'
                      ? 'Already have an account? '
                      : "Don't have an account? "}
                    <ThemedText type="smallBold" style={{ color: theme.tint }}>
                      {authScreen === 'signup' ? 'Log in here' : 'Sign up here'}
                    </ThemedText>
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    borderRadius: 20,
  },
  accountStack: {
    gap: Spacing.three,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  accountHeaderSpacer: {
    width: 40,
  },
  accountHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  accountHeaderTitle: {
    fontSize: 16,
  },
  identityCard: {
    gap: Spacing.two,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: 2,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 16,
    textAlign: 'left',
  },
  accountEmail: {
    textAlign: 'left',
    fontStyle: 'italic',
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    borderRadius: 36,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: -Spacing.two,
  },
  roleBlock: {
    gap: Spacing.two,
  },
  roleHeading: {
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: Spacing.three,
    gap: 4,
    alignItems: 'center',
  },
  roleCardText: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  or: {
    fontSize: 11,
    letterSpacing: 1,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  methodLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  fields: {
    gap: Spacing.two,
  },
  phoneFields: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.three : Spacing.two,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  outlineButton: {
    marginTop: Spacing.two,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
  },
  footerLink: {
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  error: {
    color: '#B42318',
    textAlign: 'center',
  },
});
