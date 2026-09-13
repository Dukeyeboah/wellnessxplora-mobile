import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { FeedCreateComposer } from '@/components/feed-create-composer';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatFeedTime, toFeedDate } from '@/lib/feed-dates';
import {
  deletePost,
  fetchVendorPosts,
  notifyFeedChanged,
  updatePost,
  type FeedPost,
} from '@/lib/feed-posts';
import { getEventStartsAt } from '@/lib/event-posts';
import { resolveStorageImageUrl } from '@/lib/storage-url';

type Props = {
  vendorId: string;
  vendorName: string;
  vendorPhotoURL?: string;
};

export function VendorPostsManager({ vendorId, vendorName, vendorPhotoURL }: Props) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setPosts(await fetchVendorPosts(vendorId));
    } catch (err) {
      console.warn('[VendorPostsManager] load failed', err);
      setPosts([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load posts.');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onRemove = (post: FeedPost) => {
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusyId(post.id);
            try {
              await deletePost(post.id);
              notifyFeedChanged();
              await reload();
            } catch (err) {
              console.warn(err);
              Alert.alert('Could not delete', 'Try again in a moment.');
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  };

  const onPublishDraft = async (post: FeedPost) => {
    setBusyId(post.id);
    try {
      await updatePost(post.id, { status: 'published' });
      notifyFeedChanged();
      await reload();
    } catch {
      Alert.alert('Could not publish', 'Try again in a moment.');
    } finally {
      setBusyId(null);
    }
  };

  const thumb = (post: FeedPost) => {
    const image = post.media.find((m) => m.type === 'image');
    const video = post.media.find((m) => m.type === 'video');
    const path = image?.url || video?.thumbnailUrl;
    if (!path) return null;
    return resolveStorageImageUrl(path) || path;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Your posts</ThemedText>
        <Pressable
          onPress={() => {
            setEditPost(null);
            setCreateOpen(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.tint }]}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <ThemedText type="smallBold" style={styles.addBtnLabel}>
            Add
          </ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.tint} style={{ marginTop: Spacing.four }} />
      ) : loadError ? (
        <ThemedText type="small" style={{ color: '#B42318' }}>
          {loadError}
        </ThemedText>
      ) : posts.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No posts yet. Tap Add to publish your first post.
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {posts.map((post) => {
            const src = thumb(post);
            const starts = getEventStartsAt(post);
            const busy = busyId === post.id;
            return (
              <View
                key={post.id}
                style={[
                  styles.row,
                  {
                    borderColor: theme.backgroundSelected,
                    backgroundColor: theme.backgroundElement,
                  },
                ]}>
                <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
                  {src ? (
                    <Image source={{ uri: src }} style={styles.thumbImg} contentFit="cover" />
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.thumbFallback}>
                      {post.contentType === 'event' ? 'Event' : 'Text'}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.meta}>
                  <View style={styles.badges}>
                    <ThemedText type="small" style={[styles.badge, { color: theme.textSecondary }]}>
                      {post.status}
                    </ThemedText>
                    {post.contentType === 'event' ? (
                      <ThemedText type="small" style={[styles.badge, { color: theme.tint }]}>
                        Event
                      </ThemedText>
                    ) : null}
                    {starts ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatFeedTime(toFeedDate(starts))}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText type="small" numberOfLines={3}>
                    {post.caption.trim() || 'No caption'}
                  </ThemedText>
                  <View style={styles.actions}>
                    <Pressable
                      disabled={busy}
                      onPress={() => {
                        setEditPost(post);
                        setCreateOpen(true);
                      }}
                      style={[styles.actionBtn, { borderColor: theme.backgroundSelected }]}>
                      <Ionicons name="pencil" size={12} color={theme.text} />
                      <ThemedText type="smallBold" style={{ fontSize: 11 }}>
                        Edit
                      </ThemedText>
                    </Pressable>
                    {post.status === 'draft' ? (
                      <Pressable
                        disabled={busy}
                        onPress={() => void onPublishDraft(post)}
                        style={[styles.actionBtn, { borderColor: theme.tint }]}>
                        <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.tint }}>
                          Publish
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable
                      disabled={busy}
                      onPress={() => onRemove(post)}
                      style={[styles.actionBtn, { borderColor: '#FECACA' }]}>
                      <Ionicons name="trash-outline" size={12} color="#B42318" />
                      <ThemedText type="smallBold" style={{ fontSize: 11, color: '#B42318' }}>
                        Delete
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <FeedCreateComposer
        visible={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditPost(null);
        }}
        onCreated={() => void reload()}
        authorType="vendor"
        authorName={vendorName}
        authorPhotoURL={vendorPhotoURL}
        vendorId={vendorId}
        editPost={editPost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnLabel: { color: '#FFFFFF', fontSize: 12 },
  list: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.two,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbFallback: { fontSize: 11, textAlign: 'center', paddingHorizontal: 4 },
  meta: { flex: 1, minWidth: 0, gap: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  badge: { fontSize: 11, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
