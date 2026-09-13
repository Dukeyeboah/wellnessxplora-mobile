import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchIsAdmin } from '@/lib/admin-auth';
import { useAuth } from '@/lib/auth-context';
import type { FeedPost } from '@/lib/feed-posts';
import { requireAuth } from '@/lib/require-auth';
import { useSignInModal } from '@/lib/sign-in-modal';
import { createStoryFromPost, notifyStoriesChanged, type StoryAuthorType } from '@/lib/stories';
import { fetchVendorProfileDoc } from '@/lib/user-profile';

type Props = {
  post: FeedPost;
  /** Currently viewed image index for multi-image posts. */
  mediaIndex?: number;
};

const RING = 28;

export function PostAddToStoryButton({ post, mediaIndex = 0 }: Props) {
  const colors = useTheme();
  const router = useRouter();
  const { user, userRole, userProfile } = useAuth();
  const { showSignInModal } = useSignInModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhotoURL, setVendorPhotoURL] = useState('');

  const isVendor = userRole === 'vendor';
  const canPublish = Boolean(user) && (isVendor || isAdmin);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setVendorName('');
      setVendorPhotoURL('');
      return;
    }
    let cancelled = false;
    void fetchIsAdmin(user.uid).then((v) => {
      if (!cancelled) setIsAdmin(v);
    });
    if (userRole === 'vendor') {
      void fetchVendorProfileDoc(user.uid).then((vendor) => {
        if (cancelled || !vendor) return;
        setVendorName(vendor.businessName || userProfile?.name || '');
        setVendorPhotoURL(vendor.logoUrl || userProfile?.photoURL || '');
      });
    }
    return () => {
      cancelled = true;
    };
  }, [user, userRole, userProfile?.name, userProfile?.photoURL]);

  const openMenu = () => {
    if (!requireAuth(Boolean(user), router, 'share_post')) return;
    if (!canPublish) {
      showSignInModal(
        'Only vendors and WellnessXplora editors can publish Stories. Log in with a creator account to share.',
      );
      return;
    }
    setMenuOpen(true);
    setError(null);
  };

  const handleAdd = useCallback(async () => {
    if (busy || !user || !canPublish) return;
    setBusy(true);
    setError(null);
    try {
      const authorType: StoryAuthorType =
        isAdmin && !isVendor ? 'wellnessxplora' : 'vendor';
      const authorName =
        authorType === 'wellnessxplora'
          ? 'WellnessXplora'
          : vendorName || userProfile?.name || user.displayName || 'Vendor';
      const authorPhotoURL =
        authorType === 'wellnessxplora'
          ? undefined
          : vendorPhotoURL || userProfile?.photoURL || undefined;

      await createStoryFromPost({
        post,
        mediaIndex,
        publisher: {
          authorId: user.uid,
          authorType,
          authorName,
          authorPhotoURL,
          vendorId: authorType === 'vendor' ? user.uid : undefined,
        },
      });
      setDone(true);
      notifyStoriesChanged();
      setMenuOpen(false);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to story');
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    canPublish,
    isAdmin,
    isVendor,
    mediaIndex,
    post,
    user,
    userProfile?.name,
    userProfile?.photoURL,
    vendorName,
    vendorPhotoURL,
  ]);

  return (
    <>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          openMenu();
        }}
        disabled={busy}
        hitSlop={8}
        style={styles.triggerWrap}
        accessibilityLabel={done ? 'Added to your story' : 'Add to story'}
        accessibilityHint="Opens a confirmation to share this post as a Story">
        {busy ? (
          <View style={[styles.dashedRing, { borderColor: `${colors.tint}99` }]}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : done ? (
          <View style={[styles.dashedRing, styles.doneRing, { borderColor: '#059669', backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark" size={16} color="#059669" />
          </View>
        ) : (
          <View
            style={[
              styles.dashedRing,
              {
                borderColor: `${colors.tint}99`,
                backgroundColor: `${colors.tint}12`,
              },
            ]}>
            <Ionicons name="add" size={18} color={colors.tint} />
          </View>
        )}
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={[
              styles.popup,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
              },
            ]}>
            <Pressable
              onPress={() => void handleAdd()}
              disabled={busy}
              style={styles.confirmRow}
              accessibilityRole="button"
              accessibilityLabel="Add to story">
              <View
                style={[
                  styles.popupRing,
                  {
                    borderColor: `${colors.tint}99`,
                    backgroundColor: `${colors.tint}12`,
                  },
                ]}>
                <Ionicons name="add" size={16} color={colors.tint} />
              </View>
              <View style={styles.confirmText}>
                <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                  {busy ? 'Adding…' : 'Add to story'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                  Visible for about 24 hours
                </ThemedText>
              </View>
              {busy ? <ActivityIndicator size="small" color={colors.tint} /> : null}
            </Pressable>
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerWrap: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  dashedRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneRing: {
    borderStyle: 'solid',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  popup: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  popupRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: '#DC2626',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
});
