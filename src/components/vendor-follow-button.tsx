import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { requireAuth } from '@/lib/require-auth';
import {
  followVendor,
  isFollowingVendor,
  unfollowVendor,
} from '@/lib/vendor-follows';

type Props = {
  vendorId: string;
  size?: 'sm' | 'default';
  /** When true, hide the control once the viewer is already connected. */
  hideWhenConnected?: boolean;
  /** `icon` = round FAB (+ person). `label` = Connect / Connected pill. */
  variant?: 'label' | 'icon';
};

export function VendorFollowButton({
  vendorId,
  size = 'sm',
  hideWhenConnected = false,
  variant = 'label',
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwnStorefront = Boolean(user && user.uid === vendorId);

  useEffect(() => {
    if (!user || isOwnStorefront) {
      setFollowing(false);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void isFollowingVendor(user.uid, vendorId)
      .then((v) => {
        if (!cancelled) {
          setFollowing(v);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFollowing(false);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, vendorId, isOwnStorefront]);

  const toggle = async () => {
    if (!requireAuth(Boolean(user), router, 'follow')) return;
    if (!user || busy || isOwnStorefront) return;
    setBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      if (wasFollowing) await unfollowVendor(user.uid, vendorId);
      else await followVendor(user.uid, vendorId);
    } catch {
      setFollowing(wasFollowing);
    } finally {
      setBusy(false);
    }
  };

  if (isOwnStorefront) return null;

  if (hideWhenConnected && loaded && following) return null;

  if (variant === 'icon') {
    return (
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          void toggle();
        }}
        disabled={busy || !loaded}
        accessibilityLabel={following ? 'Disconnect' : 'Connect'}
        style={[
          styles.iconFab,
          Shadows.button,
          {
            backgroundColor: following ? theme.tint : theme.backgroundElement,
            opacity: !loaded ? 0.55 : 1,
          },
        ]}>
        {busy ? (
          <ActivityIndicator size="small" color={following ? '#FFFFFF' : theme.tint} />
        ) : (
          <View style={styles.iconStack}>
            <Ionicons
              name={following ? 'person' : 'person-outline'}
              size={16}
              color={following ? '#FFFFFF' : theme.text}
            />
            {!following ? (
              <View style={[styles.plusBadge, { backgroundColor: theme.tint, borderColor: theme.backgroundElement }]}>
                <Ionicons name="add" size={10} color="#FFFFFF" />
              </View>
            ) : (
              <View style={[styles.plusBadge, { backgroundColor: '#FFFFFF', borderColor: theme.tint }]}>
                <Ionicons name="checkmark" size={9} color={theme.tint} />
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  }

  const compact = size === 'sm';

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        void toggle();
      }}
      disabled={busy || !loaded}
      accessibilityLabel={following ? 'Disconnect' : 'Connect'}
      style={[
        styles.btn,
        {
          minHeight: compact ? 30 : 34,
          paddingVertical: compact ? 5 : 7,
          paddingHorizontal: compact ? 12 : 14,
          backgroundColor: following ? theme.background : theme.tint,
          borderColor: following ? theme.backgroundSelected : theme.tint,
          opacity: !loaded ? 0.55 : 1,
        },
      ]}>
      {busy ? (
        <ActivityIndicator size="small" color={following ? theme.tint : '#FFFFFF'} />
      ) : (
        <>
          <Ionicons
            name={following ? 'checkmark' : 'add'}
            size={14}
            color={following ? theme.text : '#FFFFFF'}
          />
          <ThemedText
            type="smallBold"
            style={{ color: following ? theme.text : '#FFFFFF', fontSize: 12, letterSpacing: 0.1 }}>
            {following ? 'Connected' : 'Connect'}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    alignSelf: 'center',
    minWidth: 88,
  },
  iconFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStack: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    right: -4,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
