import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
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
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { parseEventDateTime } from '@/lib/event-posts';
import {
  createPost,
  isFeedPermissionError,
  POST_CAPTION_MAX_LENGTH,
  updatePost,
  type PostAuthorType,
  type PostContentType,
  type PostMediaItem,
} from '@/lib/feed-posts';
import {
  MAX_POST_VIDEO_DURATION_LABEL,
  MAX_POST_VIDEO_LABEL,
  validatePostVideoSource,
} from '@/lib/post-video-limits';
import { resolveStorageImageUrl } from '@/lib/storage-url';
import { uploadPostImageFromUri, uploadPostVideoFromUri } from '@/lib/storage-upload';

export type ComposerFormat = 'image' | 'reel' | 'text' | 'event';

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
  authorType: PostAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
};

const FORMAT_TABS: { id: ComposerFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'image', label: 'Image', icon: 'image-outline' },
  { id: 'reel', label: 'Video', icon: 'videocam-outline' },
  { id: 'text', label: 'Text', icon: 'text-outline' },
  { id: 'event', label: 'Event', icon: 'calendar-outline' },
];

export function FeedCreateComposer({
  visible,
  onClose,
  onCreated,
  authorType,
  authorName,
  authorPhotoURL,
  vendorId,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [format, setFormat] = useState<ComposerFormat>('image');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFormat('image');
    setCaption('');
    setImages([]);
    setVideo(null);
    setEventDate('');
    setEventTime('09:00');
    setError(null);
    setBusy(false);
  }, [visible]);

  const isEvent = format === 'event';
  const resolvedContentType: PostContentType = isEvent ? 'event' : 'post';
  const hasCaption = caption.trim().length > 0;
  const hasMedia =
    format === 'image' || format === 'event'
      ? images.length > 0
      : format === 'reel'
        ? Boolean(video)
        : false;
  const eventStartsAt = isEvent ? parseEventDateTime(eventDate, eventTime) : null;

  const canSubmit = useMemo(() => {
    if (format === 'text') return hasCaption;
    if (format === 'reel') return hasMedia;
    if (format === 'event') {
      return Boolean(eventDate.trim() && eventStartsAt && (hasCaption || hasMedia));
    }
    return hasMedia || hasCaption;
  }, [format, hasCaption, hasMedia, eventDate, eventStartsAt]);

  const avatarUri = authorPhotoURL ? resolveStorageImageUrl(authorPhotoURL) || authorPhotoURL : '';

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 8,
    });
    if (result.canceled || !result.assets?.length) return;
    setImages((prev) => [
      ...prev,
      ...result.assets.map((a) => ({ uri: a.uri })),
    ].slice(0, 8));
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      videoMaxDuration: 30,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const durationSec =
      typeof asset.duration === 'number' && asset.duration > 0
        ? asset.duration > 1000
          ? asset.duration / 1000
          : asset.duration
        : null;
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

  const persistMedia = async (postId: string): Promise<PostMediaItem[]> => {
    if (format === 'reel') {
      if (!video) return [];
      const { videoPath, thumbnailPath } = await uploadPostVideoFromUri(postId, video.uri, 0, {
        mimeType: video.mimeType,
        fileName: video.fileName,
        fileSize: video.fileSize,
        durationSec: video.durationSec,
      });
      return [
        {
          url: videoPath,
          type: 'video',
          thumbnailUrl: thumbnailPath,
        },
      ];
    }
    if (format === 'text') return [];
    const media: PostMediaItem[] = [];
    for (let i = 0; i < images.length; i += 1) {
      const path = await uploadPostImageFromUri(postId, images[i]!.uri, i);
      media.push({ url: path, type: 'image' });
    }
    return media;
  };

  const onPublish = async () => {
    if (!user || !canSubmit) return;
    if (isEvent && !eventStartsAt) {
      setError('Please choose a valid event date and time (YYYY-MM-DD and HH:MM).');
      return;
    }
    if (format === 'reel' && !video) {
      setError('Please add a short video for your video post.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const postId = await createPost({
        authorId: user.uid,
        authorType,
        authorName,
        authorPhotoURL,
        vendorId: authorType === 'vendor' ? vendorId ?? user.uid : '',
        caption,
        contentType: resolvedContentType,
        status: 'published',
        linkedEntities: [],
        ...(isEvent && eventStartsAt ? { eventStartsAt } : {}),
      });
      const media = await persistMedia(postId);
      if (media.length > 0) {
        await updatePost(postId, { media });
      }
      onClose();
      onCreated?.();
    } catch (e) {
      if (isFeedPermissionError(e)) {
        setError(
          'Could not publish. Make sure your account can create posts (vendor or admin) and email is verified if required.',
        );
      } else {
        setError(e instanceof Error ? e.message : 'Could not publish. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const placeholder =
    format === 'event'
      ? 'Describe your event — what to expect, location, and any details attendees need.'
      : format === 'text'
        ? 'Share a wellness thought…'
        : 'Write a caption…';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: theme.backgroundSelected }]}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">{isEvent ? 'New event' : 'New post'}</ThemedText>
          <Pressable
            onPress={() => void onPublish()}
            disabled={!canSubmit || busy}
            hitSlop={12}
            style={{ opacity: !canSubmit || busy ? 0.4 : 1 }}>
            {busy ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Publish
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six, gap: Spacing.three }}
          keyboardShouldPersistTaps="handled">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formatRow}>
            {FORMAT_TABS.map((tab) => {
              const active = format === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setFormat(tab.id);
                    setError(null);
                  }}
                  style={[
                    styles.formatPill,
                    {
                      backgroundColor: active ? theme.tint : theme.backgroundElement,
                      borderColor: active ? theme.tint : theme.backgroundSelected,
                    },
                  ]}>
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? '#FFFFFF' : theme.textSecondary}
                  />
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 12 }}>
                    {tab.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.authorRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{authorName.charAt(0).toUpperCase()}</ThemedText>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {authorName}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                {format === 'event' ? 'Event · ' : format === 'reel' ? 'Video · ' : ''}
                Just now
              </ThemedText>
            </View>
          </View>

          {(format === 'image' || format === 'event') && (
            <View style={styles.section}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
                {images.map((img, i) => (
                  <View key={`${img.uri}-${i}`} style={styles.thumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />
                    <Pressable
                      onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      style={styles.removeThumb}>
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                {images.length < 8 ? (
                  <Pressable
                    onPress={() => void pickImages()}
                    style={[styles.addMedia, { borderColor: theme.backgroundSelected }]}>
                    <Ionicons name="images-outline" size={22} color={theme.tint} />
                    <ThemedText type="small" style={{ color: theme.tint, fontSize: 11 }}>
                      Add photos
                    </ThemedText>
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>
          )}

          {format === 'reel' ? (
            <View style={styles.section}>
              {video ? (
                <View style={[styles.videoPicked, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="videocam" size={22} color={theme.tint} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">Video selected</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                      Max {MAX_POST_VIDEO_DURATION_LABEL}, {MAX_POST_VIDEO_LABEL}
                      {video.durationSec != null
                        ? ` · ~${Math.ceil(video.durationSec)}s`
                        : ''}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => setVideo(null)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#B42318" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => void pickVideo()}
                  style={[styles.addVideo, { borderColor: theme.backgroundSelected }]}>
                  <Ionicons name="videocam-outline" size={28} color={theme.tint} />
                  <ThemedText type="smallBold" style={{ color: theme.tint }}>
                    Choose short video
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                    Up to {MAX_POST_VIDEO_DURATION_LABEL} · {MAX_POST_VIDEO_LABEL}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : null}

          {format === 'event' ? (
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.fieldLabel}>
                Event date
              </ThemedText>
              <TextInput
                value={eventDate}
                onChangeText={setEventDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                ]}
              />
              <ThemedText type="smallBold" style={[styles.fieldLabel, { marginTop: Spacing.two }]}>
                Event time
              </ThemedText>
              <TextInput
                value={eventTime}
                onChangeText={setEventTime}
                placeholder="HH:MM"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                ]}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <TextInput
              value={caption}
              onChangeText={(v) => setCaption(v.slice(0, POST_CAPTION_MAX_LENGTH))}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.caption,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
              {caption.length}/{POST_CAPTION_MAX_LENGTH}
            </ThemedText>
          </View>

          {error ? (
            <ThemedText type="small" style={[styles.error, { color: '#B42318' }]}>
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formatRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  formatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  section: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  mediaRow: { gap: Spacing.two },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: 12 },
  removeThumb: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMedia: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addVideo: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.one,
  },
  videoPicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    padding: Spacing.three,
    ...Shadows.card,
  },
  fieldLabel: { fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  caption: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  counter: { fontSize: 11, textAlign: 'right' },
  error: { paddingHorizontal: Spacing.four, fontSize: 13 },
});
