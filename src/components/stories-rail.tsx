import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { StoryCreateComposer } from '@/components/story-create-composer';
import { StoryViewer } from '@/components/story-viewer';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchIsAdmin } from '@/lib/admin-auth';
import { useSignInModal } from '@/lib/sign-in-modal';
import {
  fetchActiveStories,
  groupStoriesByAuthor,
  subscribeStoriesChanged,
  type StoryAuthorGroup,
  type StoryAuthorType,
} from '@/lib/stories';
import { resolveStorageImageUrl } from '@/lib/storage-url';

const WX_LOGO = require('@/assets/images/logo.png');
const AVATAR = 60;

type Props = {
  canCreate?: boolean;
  createAuthorId?: string;
  createAuthorType?: StoryAuthorType;
  createAuthorName?: string;
  createAuthorPhotoURL?: string;
  createVendorId?: string;
};

export function StoriesRail({
  canCreate,
  createAuthorId,
  createAuthorType,
  createAuthorName,
  createAuthorPhotoURL,
  createVendorId,
}: Props) {
  const theme = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { showSignInModal } = useSignInModal();
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void fetchIsAdmin(user.uid).then(setIsAdmin);
  }, [user]);

  const reload = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { stories, error } = await fetchActiveStories(80, {
        viewerAuthorId: createAuthorId,
        isAdmin,
      });
      setGroups(groupStoriesByAuthor(stories));
      setLoadError(error ?? null);
    } catch (err) {
      console.warn('[StoriesRail] load failed', err);
      setGroups([]);
      setLoadError(err instanceof Error ? err.message : 'Could not load stories.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, createAuthorId, isAdmin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => subscribeStoriesChanged(() => void reload()), [reload]);

  const onPressAddStory = () => {
    if (!user) {
      showSignInModal('Sign in with a vendor or admin account to add a story.');
      return;
    }
    if (!canCreate || !createAuthorId || !createAuthorType || !createAuthorName) {
      showSignInModal(
        'Only vendors and WellnessXplora editors can publish stories. Log in with a creator account.',
      );
      return;
    }
    setCreateOpen(true);
  };

  const selfPhoto = createAuthorPhotoURL
    ? resolveStorageImageUrl(createAuthorPhotoURL) || createAuthorPhotoURL
    : '';

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.scroll}
        contentContainerStyle={styles.row}>
        {/* Add story — always first, same size as story avatars */}
        <Pressable
          onPress={onPressAddStory}
          style={styles.item}
          accessibilityLabel="Add story">
          <View style={styles.addWrap}>
            <View
              style={[
                styles.addCircle,
                {
                  borderColor: theme.backgroundSelected,
                  backgroundColor: theme.backgroundElement,
                },
              ]}>
              {canCreate && createAuthorType === 'wellnessxplora' ? (
                <Image source={WX_LOGO} style={styles.avatarImg} contentFit="cover" />
              ) : selfPhoto ? (
                <Image source={{ uri: selfPhoto }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Ionicons name="person" size={26} color={theme.textSecondary} />
              )}
            </View>
            <View style={[styles.plusBadge, { backgroundColor: theme.tint, borderColor: theme.background }]}>
              <Ionicons name="add" size={14} color="#FFFFFF" />
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.label}>
            Your story
          </ThemedText>
        </Pressable>

        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <View key={`sk-${i}`} style={styles.item}>
                <View style={[styles.skeleton, { backgroundColor: theme.backgroundSelected }]} />
                <View
                  style={[styles.skeletonLabel, { backgroundColor: theme.backgroundSelected }]}
                />
              </View>
            ))
          : groups.map((group, index) => {
              const photo = group.authorPhotoURL
                ? resolveStorageImageUrl(group.authorPhotoURL) || group.authorPhotoURL
                : '';
              const label =
                group.authorType === 'wellnessxplora' ? 'WellnessXplora' : group.authorName;

              return (
                <Pressable
                  key={group.authorId}
                  onPress={() => setViewerIndex(index)}
                  style={styles.item}>
                  <View style={styles.gradientRing}>
                    <View style={[styles.innerRing, { backgroundColor: theme.background }]}>
                      {group.authorType === 'wellnessxplora' ? (
                        <Image source={WX_LOGO} style={styles.avatarImg} contentFit="cover" />
                      ) : photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarImg} contentFit="cover" />
                      ) : (
                        <View
                          style={[
                            styles.avatarImg,
                            {
                              backgroundColor: theme.backgroundSelected,
                              alignItems: 'center',
                              justifyContent: 'center',
                            },
                          ]}>
                          <ThemedText type="smallBold">{label.charAt(0).toUpperCase()}</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                  <ThemedText type="small" numberOfLines={1} style={styles.label}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
      </ScrollView>

      {loadError && !loading && groups.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.errorHint}>
          {loadError}
        </ThemedText>
      ) : !loading && groups.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.errorHint}>
          No live stories right now — they stay up for about 24 hours.
        </ThemedText>
      ) : null}

      {viewerIndex != null && groups[viewerIndex] ? (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}

      {canCreate && createAuthorId && createAuthorType && createAuthorName ? (
        <StoryCreateComposer
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void reload()}
          authorId={createAuthorId}
          authorType={createAuthorType}
          authorName={createAuthorName}
          authorPhotoURL={createAuthorPhotoURL}
          vendorId={createVendorId}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 92,
  },
  scroll: {
    flexGrow: 0,
  },
  row: {
    gap: 14,
    paddingVertical: 4,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  addWrap: {
    width: AVATAR + 4,
    height: AVATAR + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plusBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  gradientRing: {
    width: AVATAR + 4,
    height: AVATAR + 4,
    borderRadius: (AVATAR + 4) / 2,
    padding: 2,
    backgroundColor: '#34D399',
  },
  innerRing: {
    flex: 1,
    borderRadius: AVATAR / 2,
    padding: 2,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR / 2,
  },
  label: {
    fontSize: 11,
    width: '100%',
    textAlign: 'center',
  },
  skeleton: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  skeletonLabel: {
    width: 40,
    height: 10,
    borderRadius: 4,
  },
  errorHint: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
