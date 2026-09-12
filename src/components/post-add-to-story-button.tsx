import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
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
import type { FeedPost } from '@/lib/feed-posts';
import { createStoryFromPost, notifyStoriesChanged } from '@/lib/stories';

type Props = {
  post: FeedPost;
  /** Currently viewed image index for multi-image posts. */
  mediaIndex?: number;
};

export function PostAddToStoryButton({ post, mediaIndex = 0 }: Props) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createStoryFromPost({ post, mediaIndex });
      setDone(true);
      notifyStoriesChanged();
      setMenuOpen(false);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to story');
    } finally {
      setBusy(false);
    }
  }, [busy, mediaIndex, post]);

  return (
    <>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          setMenuOpen(true);
          setError(null);
        }}
        disabled={busy}
        hitSlop={8}
        style={styles.iconBtn}
        accessibilityLabel={done ? 'Added to your story' : 'Add to your story'}>
        {busy ? (
          <ActivityIndicator size="small" color={theme.tint} />
        ) : (
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={done ? '#059669' : theme.textSecondary}
          />
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
            style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              Add to your story
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sheetHint}>
              Shares this post as a Story for about 24 hours.
            </ThemedText>
            {error ? (
              <ThemedText type="small" style={{ color: '#DC2626', marginBottom: Spacing.two }}>
                {error}
              </ThemedText>
            ) : null}
            <Pressable
              onPress={() => void handleAdd()}
              disabled={busy}
              style={[styles.primaryBtn, { backgroundColor: theme.tint, opacity: busy ? 0.6 : 1 }]}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                  Add to story
                </ThemedText>
              )}
            </Pressable>
            <Pressable onPress={() => setMenuOpen(false)} style={styles.cancelBtn}>
              <ThemedText type="small" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  sheet: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sheetTitle: { fontSize: 16 },
  sheetHint: { fontSize: 12, marginBottom: Spacing.one },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
});
