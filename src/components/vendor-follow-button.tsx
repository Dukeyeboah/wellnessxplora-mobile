import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
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
};

export function VendorFollowButton({
  vendorId,
  size = 'sm',
  hideWhenConnected = false,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
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
  }, [user, vendorId]);

  const toggle = async () => {
    if (!requireAuth(Boolean(user), router, 'follow')) return;
    if (!user || busy) return;
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

  if (hideWhenConnected && loaded && following) return null;

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
});
