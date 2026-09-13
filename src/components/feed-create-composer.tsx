import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostLinkedEntityTagger } from '@/components/post-linked-entity-tagger';
import { QuoteLoadingOverlay } from '@/components/quote-loading-overlay';
import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  createPost,
  isFeedPermissionError,
  notifyFeedChanged,
  POST_CAPTION_MAX_LENGTH,
  updatePost,
  type FeedPost,
  type PostAuthorType,
  type PostContentType,
  type PostLinkedEntity,
  type PostMediaItem,
} from '@/lib/feed-posts';
import {
  getEventStartsAt,
  parseEventDateTime,
  toEventDateInputValue,
  toEventTimeInputValue,
} from '@/lib/event-posts';
import {
  MAX_POST_VIDEO_DURATION_LABEL,
  MAX_POST_VIDEO_LABEL,
  validatePostVideoSource,
} from '@/lib/post-video-limits';
import { resolveStorageImageUrl } from '@/lib/storage-url';
import { uploadPostImageFromUri, uploadPostVideoFromUri } from '@/lib/storage-upload';

export type ComposerFormat = 'image' | 'reel' | 'text' | 'event';

const MAX_POST_IMAGES = 5;
const THUMB = 72;
const THUMB_GAP = 10;

type PickedImage = { uri: string; key: string; storagePath?: string };
type PickedVideo = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  durationSec?: number | null;
  storagePath?: string;
  thumbnailPath?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
  authorType: PostAuthorType;
  authorName: string;
  authorPhotoURL?: string;
  vendorId?: string;
  /** When set, composer updates this post instead of creating a new one. */
  editPost?: FeedPost | null;
};

const FORMAT_TABS: { id: ComposerFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'image', label: 'Image', icon: 'image-outline' },
  { id: 'reel', label: 'Video', icon: 'videocam-outline' },
  { id: 'text', label: 'Text', icon: 'text-outline' },
  { id: 'event', label: 'Event', icon: 'calendar-outline' },
];

function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function DraggableThumb({
  uri,
  index,
  isCover,
  onRemove,
  onReorder,
  count,
}: {
  uri: string;
  index: number;
  isCover: boolean;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
  count: number;
}) {
  const theme = useTheme();
  const startIndex = useRef(index);
  const indexRef = useRef(index);
  const countRef = useRef(count);
  const onReorderRef = useRef(onReorder);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  indexRef.current = index;
  countRef.current = count;
  onReorderRef.current = onReorder;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        startIndex.current = indexRef.current;
        setDragging(true);
        setDx(0);
      },
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        setDx(g.dx);
      },
      onPanResponderRelease: (_e, g) => {
        const from = startIndex.current;
        const slot = Math.round(g.dx / (THUMB + THUMB_GAP));
        const to = Math.max(0, Math.min(countRef.current - 1, from + slot));
        if (to !== from) onReorderRef.current(from, to);
        setDx(0);
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        setDx(0);
        setDragging(false);
      },
    }),
  ).current;

  return (
    <View
      {...pan.panHandlers}
      style={[
        styles.thumbWrap,
        {
          transform: [{ translateX: dx }, { scale: dragging ? 1.06 : 1 }],
          zIndex: dragging ? 5 : 1,
          opacity: dragging ? 0.92 : 1,
          borderColor: isCover ? theme.tint : 'transparent',
        },
      ]}>
      <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
      {isCover ? (
        <View style={[styles.coverBadge, { backgroundColor: theme.tint }]}>
          <ThemedText type="smallBold" style={styles.coverBadgeText}>
            Cover
          </ThemedText>
        </View>
      ) : null}
      <Pressable onPress={onRemove} style={styles.removeThumb} hitSlop={6}>
        <Ionicons name="close" size={12} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function formatFromEditPost(post: FeedPost): ComposerFormat {
  if (post.contentType === 'event') return 'event';
  if (post.media.some((m) => m.type === 'video')) return 'reel';
  if (post.media.some((m) => m.type === 'image')) return 'image';
  return 'text';
}

export function FeedCreateComposer({
  visible,
  onClose,
  onCreated,
  authorType,
  authorName,
  authorPhotoURL,
  vendorId,
  editPost = null,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isEditing = Boolean(editPost);

  const [format, setFormat] = useState<ComposerFormat>('image');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('09:00');
  const [linkedEntities, setLinkedEntities] = useState<PostLinkedEntity[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authorVendorId = authorType === 'vendor' ? vendorId ?? user?.uid : vendorId;

  useEffect(() => {
    if (!visible) return;
    if (editPost) {
      setFormat(formatFromEditPost(editPost));
      setCaption(editPost.caption);
      setImages(
        editPost.media
          .filter((m) => m.type === 'image')
          .map((m) => ({
            uri: resolveStorageImageUrl(m.url) || m.url,
            key: m.url,
            storagePath: m.url,
          })),
      );
      const existingVideo = editPost.media.find((m) => m.type === 'video');
      setVideo(
        existingVideo
          ? {
              uri: resolveStorageImageUrl(existingVideo.url) || existingVideo.url,
              storagePath: existingVideo.url,
              thumbnailPath: existingVideo.thumbnailUrl,
            }
          : null,
      );
      setLinkedEntities(editPost.linkedEntities ?? []);
      const starts = getEventStartsAt(editPost);
      setEventDate(toEventDateInputValue(starts));
      setEventTime(toEventTimeInputValue(starts));
    } else {
      setFormat('image');
      setCaption('');
      setImages([]);
      setVideo(null);
      setEventDate('');
      setEventTime('09:00');
      setLinkedEntities([]);
    }
    setError(null);
    setBusy(false);
  }, [visible, editPost]);

  const isEvent = format === 'event';
  const resolvedContentType: PostContentType = isEvent ? 'event' : 'post';
  const hasCaption = caption.trim().length > 0;
  const hasImages = images.length > 0;
  const hasVideo = Boolean(video);
  const eventStartsAt = isEvent ? parseEventDateTime(eventDate, eventTime) : null;

  const canSubmit = useMemo(() => {
    if (format === 'text') return hasCaption;
    if (format === 'reel') return hasVideo;
    if (format === 'event') {
      return Boolean(hasImages && eventDate.trim() && eventStartsAt);
    }
    // image posts require at least one photo
    return hasImages;
  }, [format, hasCaption, hasImages, hasVideo, eventDate, eventStartsAt]);

  const avatarUri = authorPhotoURL ? resolveStorageImageUrl(authorPhotoURL) || authorPhotoURL : '';

  const pickImages = async () => {
    const remaining = MAX_POST_IMAGES - images.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: remaining,
    });
    if (result.canceled || !result.assets?.length) return;
    setImages((prev) =>
      [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          key: `${a.uri}-${a.assetId ?? Math.random().toString(36).slice(2)}`,
        })),
      ].slice(0, MAX_POST_IMAGES),
    );
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
      if (video.storagePath) {
        return [
          {
            url: video.storagePath,
            type: 'video',
            thumbnailUrl: video.thumbnailPath,
          },
        ];
      }
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
    const media = await Promise.all(
      images.map(async (img, i) => {
        if (img.storagePath) return { url: img.storagePath, type: 'image' as const };
        const path = await uploadPostImageFromUri(postId, img.uri, i);
        return { url: path, type: 'image' as const };
      }),
    );
    return media;
  };

  const onPublish = async () => {
    if (!user || !canSubmit) return;
    if (isEvent && !eventStartsAt) {
      setError('Please choose a valid event date and time (YYYY-MM-DD and HH:MM).');
      return;
    }
    if (format === 'image' && !hasImages) {
      setError('Please add at least one photo.');
      return;
    }
    if (format === 'event' && !hasImages) {
      setError('Event posts need at least one photo.');
      return;
    }
    if (format === 'reel' && !hasVideo) {
      setError('Please add a short video for your video post.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editPost) {
        const media = await persistMedia(editPost.id);
        await updatePost(editPost.id, {
          caption,
          media,
          contentType: resolvedContentType,
          linkedEntities,
          status: 'published',
          ...(isEvent && eventStartsAt ? { eventStartsAt } : {}),
        });
      } else {
        const postId = await createPost({
          authorId: user.uid,
          authorType,
          authorName,
          authorPhotoURL,
          vendorId: authorType === 'vendor' ? vendorId ?? user.uid : '',
          caption,
          contentType: resolvedContentType,
          status: 'published',
          linkedEntities,
          ...(isEvent && eventStartsAt ? { eventStartsAt } : {}),
        });
        const media = await persistMedia(postId);
        if (media.length > 0) {
          await updatePost(postId, { media });
        }
      }
      notifyFeedChanged();
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

  const cover = images[0];
  const title = isEditing
    ? isEvent
      ? 'Edit event'
      : 'Edit post'
    : isEvent
      ? 'New event'
      : 'New post';

  const captionBlock = (
    <View style={styles.section}>
      <TextInput
        value={caption}
        onChangeText={(v) => setCaption(v.slice(0, POST_CAPTION_MAX_LENGTH))}
        placeholder={placeholder}
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
      <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
        {caption.length}/{POST_CAPTION_MAX_LENGTH}
      </ThemedText>
    </View>
  );

  const imagesBlock =
    format === 'image' || format === 'event' ? (
      <View style={styles.section}>
        {cover ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: cover.uri }} style={styles.hero} contentFit="cover" />
            <Pressable
              onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== 0))}
              style={styles.removeHero}
              hitSlop={6}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => void pickImages()}
            style={[
              styles.addMediaLarge,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
                alignSelf: 'center',
              },
            ]}>
            <Ionicons name="images-outline" size={36} color={theme.tint} />
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Add photos
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
              Required · up to {MAX_POST_IMAGES} images
            </ThemedText>
          </Pressable>
        )}

        {images.length > 0 ? (
          <View style={styles.thumbSection}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.reorderHint}>
              Drag to reorder · first image is the cover
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRow}>
              {images.map((img, i) => (
                <DraggableThumb
                  key={img.key}
                  uri={img.uri}
                  index={i}
                  isCover={i === 0}
                  count={images.length}
                  onRemove={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  onReorder={(from, to) => setImages((prev) => reorder(prev, from, to))}
                />
              ))}
              {images.length < MAX_POST_IMAGES ? (
                <Pressable
                  onPress={() => void pickImages()}
                  style={[
                    styles.addMedia,
                    {
                      borderColor: theme.backgroundSelected,
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}>
                  <Ionicons name="add" size={26} color={theme.tint} />
                  <ThemedText type="small" style={{ color: theme.tint, fontSize: 10 }}>
                    Add
                  </ThemedText>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    ) : null;

  const videoBlock =
    format === 'reel' ? (
      <View style={styles.section}>
        {video ? (
          <View style={[styles.videoPicked, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="videocam" size={22} color={theme.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">
                {video.storagePath ? 'Video attached' : 'Video selected'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                Max {MAX_POST_VIDEO_DURATION_LABEL}, {MAX_POST_VIDEO_LABEL}
                {video.durationSec != null ? ` · ~${Math.ceil(video.durationSec)}s` : ''}
              </ThemedText>
            </View>
            <Pressable onPress={() => setVideo(null)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color="#B42318" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => void pickVideo()}
            style={[
              styles.addVideo,
              {
                borderColor: theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
                alignSelf: 'center',
              },
            ]}>
            <Ionicons name="videocam-outline" size={32} color={theme.tint} />
            <ThemedText type="smallBold" style={{ color: theme.tint }}>
              Choose short video
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
              Required · up to {MAX_POST_VIDEO_DURATION_LABEL} · {MAX_POST_VIDEO_LABEL}
            </ThemedText>
          </Pressable>
        )}
      </View>
    ) : null;

  const eventFieldsBlock =
    format === 'event' ? (
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
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
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
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        />
      </View>
    ) : null;

  const tagsBlock =
    format !== 'reel' ? (
      <View style={styles.section}>
        <PostLinkedEntityTagger
          authorVendorId={authorVendorId}
          entities={linkedEntities}
          onChange={setLinkedEntities}
          disabled={busy}
        />
      </View>
    ) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.topBar, { borderBottomColor: theme.backgroundSelected }]}>
          <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">{title}</ThemedText>
          <Pressable
            onPress={() => void onPublish()}
            disabled={!canSubmit || busy}
            hitSlop={12}
            style={{ opacity: !canSubmit || busy ? 0.4 : 1 }}>
            {busy ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {isEditing ? 'Save' : 'Publish'}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six, gap: Spacing.three }}
          keyboardShouldPersistTaps="handled">
          {!isEditing ? (
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
          ) : null}

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
                {isEditing ? 'Editing' : 'Just now'}
              </ThemedText>
            </View>
          </View>

          {/* Event: description above photos. Image/Video: media first, caption below. */}
          {format === 'event' ? (
            <>
              {captionBlock}
              {imagesBlock}
              {eventFieldsBlock}
              {tagsBlock}
            </>
          ) : format === 'text' ? (
            <>
              {captionBlock}
              {tagsBlock}
            </>
          ) : (
            <>
              {imagesBlock}
              {videoBlock}
              {captionBlock}
              {tagsBlock}
            </>
          )}

          {error ? (
            <ThemedText type="small" style={[styles.error, { color: '#B42318' }]}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
        <QuoteLoadingOverlay
          visible={busy}
          title={isEditing ? 'Saving…' : 'Publishing…'}
          subtitle="Uploading media in parallel — almost there."
        />
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
  heroWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  hero: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E8E4DF',
  },
  removeHero: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSection: { gap: 6 },
  reorderHint: { fontSize: 11 },
  mediaRow: {
    gap: THUMB_GAP,
    alignItems: 'center',
    paddingVertical: 2,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: { color: '#FFFFFF', fontSize: 9 },
  removeThumb: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaLarge: {
    width: '88%',
    maxWidth: 320,
    aspectRatio: 1.15,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addMedia: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addVideo: {
    width: '88%',
    maxWidth: 320,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: Spacing.six,
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
    minHeight: 72,
    maxHeight: 140,
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
