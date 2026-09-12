import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PostLinkedEntity, PostMediaItem } from '@/lib/feed-posts';
import {
  MAX_POST_VIDEO_DURATION_LABEL,
  MAX_POST_VIDEO_LABEL,
  validatePostVideoSource,
} from '@/lib/post-video-limits';
import {
  createStory,
  notifyStoriesChanged,
  STORY_CAPTION_MAX_LENGTH,
  updateStoryMedia,
  type StoryAuthorType,
} from '@/lib/stories';
import {
  uploadStoryImageFromUri,
  uploadStoryVideoFromUri,
} from '@/lib/storage-upload';

type StoryFormat = 'image' | 'video' | 'text';

type PickedImage = { uri: string };
type PickedVideo = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  durationSec?: number | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
  authorId: string;
  authorType: StoryAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
};

const FORMAT_TABS: { id: StoryFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'image', label: 'Image', icon: 'image-outline' },
  { id: 'video', label: 'Video', icon: 'videocam-outline' },
  { id: 'text', label: 'Text', icon: 'text-outline' },
];

export function StoryCreateComposer({
  visible,
  onClose,
  onCreated,
  authorId,
  authorType,
  authorName,
  authorPhotoURL,
  vendorId,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useState<StoryFormat>('image');
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFormat('image');
    setCaption('');
    setImage(null);
    setVideo(null);
    setError(null);
    setBusy(false);
  }, [visible]);

  const linkedEntities = (): PostLinkedEntity[] => {
    if (authorType === 'vendor' && vendorId) {
      return [{ type: 'vendor', id: vendorId }];
    }
    return [];
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;
    setImage({ uri: result.assets[0].uri });
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const durationSec =
      typeof asset.duration === 'number' ? asset.duration / 1000 : null;
    const err = validatePostVideoSource({
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      durationSec,
    });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setVideo({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      durationSec,
    });
  };

  const canSubmit =
    !busy &&
    (format === 'text'
      ? caption.trim().length > 0
      : format === 'image'
        ? Boolean(image)
        : Boolean(video));

  const onPublish = async () => {
    setError(null);
    if (format === 'image' && !image) {
      setError('Add an image for this story.');
      return;
    }
    if (format === 'video' && !video) {
      setError('Add a short video for this story.');
      return;
    }
    if (format === 'text' && !caption.trim()) {
      setError('Write a short caption for a text story.');
      return;
    }

    setBusy(true);
    try {
      const storyId = await createStory({
        authorId,
        authorType,
        authorName,
        authorPhotoURL,
        vendorId: authorType === 'vendor' ? vendorId ?? authorId : undefined,
        caption,
        linkedEntities: linkedEntities(),
      });

      const media: PostMediaItem[] = [];
      if (format === 'image' && image) {
        const path = await uploadStoryImageFromUri(storyId, image.uri, 0);
        media.push({ url: path, type: 'image' });
      } else if (format === 'video' && video) {
        const { videoPath, thumbnailPath } = await uploadStoryVideoFromUri(
          storyId,
          video.uri,
          0,
          {
            mimeType: video.mimeType,
            fileName: video.fileName,
            fileSize: video.fileSize,
            durationSec: video.durationSec,
          },
        );
        media.push({
          url: videoPath,
          type: 'video',
          thumbnailUrl: thumbnailPath,
        });
      }

      if (media.length > 0) {
        await updateStoryMedia(storyId, media);
      }

      notifyStoriesChanged();
      onClose();
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create story');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: theme.backgroundSelected }]}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <View style={styles.topTitle}>
            <ThemedText type="smallBold">New story</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
              Visible about 24 hours
            </ThemedText>
          </View>
          <Pressable
            onPress={() => void onPublish()}
            disabled={!canSubmit}
            hitSlop={12}
            style={{ opacity: !canSubmit ? 0.4 : 1 }}>
            {busy ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Share
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + Spacing.six,
            paddingHorizontal: Spacing.three,
            gap: Spacing.three,
            paddingTop: Spacing.three,
          }}
          keyboardShouldPersistTaps="handled">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formatRow}>
            {FORMAT_TABS.map(({ id, label, icon }) => {
              const active = format === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setFormat(id)}
                  style={[
                    styles.formatChip,
                    {
                      backgroundColor: active ? theme.tint : theme.backgroundElement,
                      borderColor: active ? theme.tint : theme.backgroundSelected,
                    },
                  ]}>
                  <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : theme.textSecondary} />
                  <ThemedText
                    type="smallBold"
                    style={{ fontSize: 12, color: active ? '#FFFFFF' : theme.textSecondary }}>
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {format === 'image' ? (
            <View style={styles.mediaBlock}>
              {image ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
                  <Pressable
                    onPress={() => setImage(null)}
                    style={styles.removeMedia}
                    hitSlop={8}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => void pickImage()}
                  style={[styles.pickBtn, { borderColor: theme.backgroundSelected }]}>
                  <Ionicons name="image-outline" size={22} color={theme.tint} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Choose one image
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : null}

          {format === 'video' ? (
            <View style={styles.mediaBlock}>
              {video ? (
                <View
                  style={[
                    styles.videoPicked,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                  ]}>
                  <Ionicons name="videocam" size={22} color={theme.tint} />
                  <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                    Video selected
                  </ThemedText>
                  <Pressable onPress={() => setVideo(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => void pickVideo()}
                  style={[styles.pickBtn, { borderColor: theme.backgroundSelected }]}>
                  <Ionicons name="videocam-outline" size={22} color={theme.tint} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                    Choose a short video ({MAX_POST_VIDEO_DURATION_LABEL}, {MAX_POST_VIDEO_LABEL})
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : null}

          <TextInput
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, STORY_CAPTION_MAX_LENGTH))}
            placeholder={
              format === 'text' ? 'Write a short story…' : 'Add a caption (optional)…'
            }
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[
              styles.caption,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11, alignSelf: 'flex-end' }}>
            {caption.length}/{STORY_CAPTION_MAX_LENGTH}
          </ThemedText>

          {error ? (
            <ThemedText type="small" style={{ color: '#DC2626' }}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTitle: { alignItems: 'center', gap: 2 },
  formatRow: { gap: 8, paddingVertical: 2 },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mediaBlock: { gap: Spacing.two },
  pickBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: 8,
  },
  previewWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
  },
  caption: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
