import Ionicons from '@expo/vector-icons/Ionicons';
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  isStoryPubliclyActive,
  postPathFromStory,
  type StoryAuthorGroup,
} from '@/lib/stories';
import { resolveStorageImageUrl } from '@/lib/storage-url';

const WX_LOGO = require('@/assets/images/logo.png');

type Props = {
  groups: StoryAuthorGroup[];
  startGroupIndex: number;
  onClose: () => void;
};

function StoryVideo({
  src,
  onEnded,
}: {
  src: string;
  onEnded: () => void;
}) {
  const player = useVideoPlayer(src, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEventListener(player, 'playToEnd', onEnded);

  useEffect(() => {
    player.play();
    return () => {
      player.pause();
    };
  }, [player, src]);

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="contain"
      nativeControls={false}
      allowsFullscreen={false}
    />
  );
}

/**
 * Loads full story media only for the currently viewed item.
 * Rail covers are never videos; video src is set only while this story is active.
 */
export function StoryViewer({ groups, startGroupIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [group, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      return;
    }
    if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex((g) => g - 1);
      setStoryIndex(Math.max(0, (prev?.stories.length ?? 1) - 1));
    }
  }, [storyIndex, groupIndex, groups]);

  useEffect(() => {
    if (!story) {
      onClose();
      return;
    }
    if (!isStoryPubliclyActive(story)) {
      goNext();
    }
    // Only react to the active story id changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  if (!group || !story) return null;

  const media = story.media[0];
  const imageUrl =
    media?.type === 'image' ? resolveStorageImageUrl(media.url) || media.url : '';
  const videoUrl =
    media?.type === 'video' ? resolveStorageImageUrl(media.url) || media.url : '';

  const sourcePostPath = postPathFromStory(story);
  const seeLabel = story.sourcePostContentType === 'event' ? 'See event' : 'See post';
  const showAlbumBadge = (story.sourceMediaCount ?? 0) > 1;
  const authorPhoto = group.authorPhotoURL
    ? resolveStorageImageUrl(group.authorPhotoURL) || group.authorPhotoURL
    : '';
  const displayName =
    group.authorType === 'wellnessxplora' ? 'WellnessXplora' : group.authorName;

  const openSourcePost = () => {
    if (!sourcePostPath) return;
    onClose();
    router.push(sourcePostPath as never);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
        ]}>
        <View style={styles.header}>
          {group.authorType === 'wellnessxplora' ? (
            <Image source={WX_LOGO} style={styles.avatar} contentFit="cover" />
          ) : authorPhoto ? (
            <Image source={{ uri: authorPhoto }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <ThemedText type="smallBold" style={{ color: '#FFF' }}>
                {displayName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.headerMeta}>
            <ThemedText type="smallBold" style={styles.headerName} numberOfLines={1}>
              {displayName}
            </ThemedText>
            <ThemedText type="small" style={styles.headerSub}>
              {storyIndex + 1} / {group.stories.length}
            </ThemedText>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>

        <View style={styles.progressRow}>
          {group.stories.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.progressSeg,
                { backgroundColor: i <= storyIndex ? '#FFFFFF' : 'rgba(255,255,255,0.25)' },
              ]}
            />
          ))}
        </View>

        <View style={[styles.stage, { maxHeight: height * 0.7 }]}>
          <Pressable style={styles.tapLeft} onPress={goPrev} accessibilityLabel="Previous" />
          <Pressable style={styles.tapRight} onPress={goNext} accessibilityLabel="Next" />

          {showAlbumBadge ? (
            <View style={styles.albumBadge} pointerEvents="none">
              <Ionicons name="images-outline" size={16} color="#FFFFFF" />
            </View>
          ) : null}

          {media?.type === 'video' && videoUrl ? (
            <StoryVideo key={story.id} src={videoUrl} onEnded={goNext} />
          ) : imageUrl ? (
            <Image
              key={story.id}
              source={{ uri: imageUrl }}
              style={styles.media}
              contentFit="contain"
            />
          ) : (
            <View style={styles.textStory}>
              <ThemedText style={styles.textStoryBody}>
                {story.caption || '…'}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {story.caption && media ? (
            <ThemedText type="small" style={styles.caption} numberOfLines={4}>
              {story.caption}
            </ThemedText>
          ) : null}
          {sourcePostPath ? (
            <Pressable onPress={openSourcePost} style={styles.seePostBtn}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                {seeLabel}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.three,
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: { flex: 1, minWidth: 0 },
  headerName: { color: '#FFFFFF', fontSize: 14 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
  closeBtn: { padding: 4 },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  progressSeg: {
    flex: 1,
    height: 2,
    borderRadius: 999,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    position: 'relative',
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '33%',
    zIndex: 10,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '33%',
    zIndex: 10,
  },
  albumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  textStory: {
    maxWidth: 320,
    paddingHorizontal: Spacing.four,
  },
  textStoryBody: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  seePostBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
