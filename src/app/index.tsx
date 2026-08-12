import { createElement, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ConfirmationResult } from 'firebase/auth';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useNativeGoogleSignIn } from '@/hooks/use-native-google-sign-in';
import { useTheme } from '@/hooks/use-theme';
import { getAuthErrorMessage, useAuth } from '@/lib/auth-context';

type Mode = 'email' | 'phone';

const RECAPTCHA_ID = 'phone-recaptcha';

export default function HomeScreen() {
  const theme = useTheme();
  const {
    user,
    userRole,
    loading,
    login,
    loginWithGoogle,
    startPhoneLogin,
    confirmPhoneLogin,
    logout,
  } = useAuth();
  const nativeGoogle = useNativeGoogleSignIn();

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setConfirmation(null);
    setSmsCode('');
  }, [mode]);

  const onEmailSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (Platform.OS === 'web') {
        await loginWithGoogle();
      } else if (nativeGoogle.missingClientId) {
        setError(
          'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env.local (from Firebase → Authentication → Google). Or test Google in the browser with npm run web.',
        );
      } else {
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
    setSubmitting(true);
    try {
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
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
        <ThemedText type="small" themeColor="textSecondary">
          Checking session…
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.heroSection}>
            <ThemedText type="title" style={styles.title}>
              WellnessXplora
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {user
                ? 'Signed in with the same account as the website'
                : 'Sign in with your WellnessXplora account'}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            {user ? (
              <>
                <ThemedText type="smallBold">Signed in</ThemedText>
                <ThemedText type="code">{user.email ?? user.phoneNumber}</ThemedText>
                {userRole ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Role: {userRole}
                  </ThemedText>
                ) : null}

                <Pressable
                  onPress={() => logout()}
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    { borderColor: theme.textSecondary, opacity: pressed ? 0.7 : 1 },
                  ]}>
                  <ThemedText type="smallBold">Sign out</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.modeRow}>
                  {(['email', 'phone'] as Mode[]).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMode(m)}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor:
                            mode === m ? theme.backgroundSelected : 'transparent',
                        },
                      ]}>
                      <ThemedText type="smallBold">
                        {m === 'email' ? 'Email' : 'Phone'}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {mode === 'email' ? (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      Email
                    </ThemedText>
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

                    <ThemedText type="small" themeColor="textSecondary">
                      Password
                    </ThemedText>
                    <TextInput
                      secureTextEntry
                      autoComplete="password"
                      placeholder="••••••••"
                      placeholderTextColor={theme.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.backgroundSelected },
                      ]}
                    />

                    <Pressable
                      disabled={submitting || !email || !password}
                      onPress={onEmailSignIn}
                      style={({ pressed }) => [
                        styles.button,
                        {
                          backgroundColor: theme.text,
                          opacity: submitting || !email || !password ? 0.4 : pressed ? 0.8 : 1,
                        },
                      ]}>
                      {submitting ? (
                        <ActivityIndicator color={theme.background} />
                      ) : (
                        <ThemedText type="smallBold" style={{ color: theme.background }}>
                          Sign in with email
                        </ThemedText>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      {Platform.OS === 'web'
                        ? 'Phone (E.164, e.g. +233241234567)'
                        : 'Phone sign-in on device needs a development build — test in the browser for now'}
                    </ThemedText>
                    <TextInput
                      autoComplete="tel"
                      keyboardType="phone-pad"
                      placeholder="+233…"
                      placeholderTextColor={theme.textSecondary}
                      value={phone}
                      onChangeText={setPhone}
                      editable={Platform.OS === 'web'}
                      style={[
                        styles.input,
                        { color: theme.text, borderColor: theme.backgroundSelected },
                      ]}
                    />

                    {Platform.OS === 'web'
                      ? // reCAPTCHA needs a real DOM node with this id
                        createElement('div', {
                          id: RECAPTCHA_ID,
                          style: { minHeight: 78 },
                        })
                      : null}

                    {!confirmation ? (
                      <Pressable
                        disabled={submitting || !phone || Platform.OS !== 'web'}
                        onPress={onSendCode}
                        style={({ pressed }) => [
                          styles.button,
                          {
                            backgroundColor: theme.text,
                            opacity:
                              submitting || !phone || Platform.OS !== 'web'
                                ? 0.4
                                : pressed
                                  ? 0.8
                                  : 1,
                          },
                        ]}>
                        {submitting ? (
                          <ActivityIndicator color={theme.background} />
                        ) : (
                          <ThemedText type="smallBold" style={{ color: theme.background }}>
                            Send SMS code
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : (
                      <>
                        <ThemedText type="small" themeColor="textSecondary">
                          SMS code
                        </ThemedText>
                        <TextInput
                          keyboardType="number-pad"
                          placeholder="123456"
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
                          onPress={onConfirmCode}
                          style={({ pressed }) => [
                            styles.button,
                            {
                              backgroundColor: theme.text,
                              opacity:
                                submitting || smsCode.length < 6 ? 0.4 : pressed ? 0.8 : 1,
                            },
                          ]}>
                          {submitting ? (
                            <ActivityIndicator color={theme.background} />
                          ) : (
                            <ThemedText type="smallBold" style={{ color: theme.background }}>
                              Verify & sign in
                            </ThemedText>
                          )}
                        </Pressable>
                      </>
                    )}
                  </>
                )}

                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                  <ThemedText type="small" themeColor="textSecondary">
                    or
                  </ThemedText>
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                </View>

                <Pressable
                  disabled={submitting}
                  onPress={onGoogleSignIn}
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    {
                      borderColor: theme.text,
                      opacity: submitting ? 0.4 : pressed ? 0.7 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold">Continue with Google</ThemedText>
                </Pressable>

                {error ? (
                  <ThemedText type="small" style={styles.error}>
                    {error}
                  </ThemedText>
                ) : null}

                {Platform.OS !== 'web' ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                    Tip: Google is easiest to test in the browser right now (`npm run web`). Native
                    Google needs a Web Client ID in `.env.local`, and full native Google/Phone work
                    best with a development build later.
                  </ThemedText>
                ) : null}
              </>
            )}
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.five,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    marginTop: Spacing.four,
    gap: Spacing.two,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  modeChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.three : Spacing.two,
    marginBottom: Spacing.two,
    fontSize: 16,
  },
  button: {
    marginTop: Spacing.two,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  error: {
    color: '#B42318',
    marginTop: Spacing.two,
  },
  hint: {
    marginTop: Spacing.two,
  },
});
