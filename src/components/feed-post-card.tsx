import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostEngagementBar } from '@/components/post-engagement-bar';
import { ThemedText } from '@/components/themed-text';
import { VendorFollowButton } from '@/components/vendor-follow-button';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { formatFeedTime, toFeedDate } from '@/lib/feed-dates';
import type { FeedPost, PostLinkedEntity, PostMediaItem } from '@/lib/feed-posts';
import { getCategoryBySlug } from '@/lib/explore-categories';
import { resolveStorageImageUrl } from '@/lib/storage-url';
import { fetchVendorProfileDoc } from '@/lib/user-profile';

const EDITORIAL_LOGO = require('@/assets/images/editorialLogo.png');
const EDITORIAL_BADGE = require('@/assets/images/editorialBadge.png');

const EDITORIAL_FILL = '#F0FDF4';

function isListingEntity(entity: PostLinkedEntity): boolean {
  return entity.type === 'listing' || entity.type === 'product' || entity.type === 'service';
}

function FeedCaption({ text }: { text: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const isLong = trimmed.length > 90 || trimmed.split('\n').length > 2;
  if (!trimmed) return null;

  return (
    <View style={styles.captionWrap}>
      <ThemedText
        type="small"
        numberOfLines={expanded ? undefined : isLong ? 2 : undefined}
        style={styles.caption}>
        {trimmed}
      </ThemedText>
      {isLong ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setExpanded((v) => !v);
          }}
          hitSlop={8}>
          <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
            {expanded ? 'Show less' : 'Show more'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function LinkedEntitiesRow({ entities }: { entities: PostLinkedEntity[] }) {
  const theme = useTheme();
  const router = useRouter();
  const [menu, setMenu] = useState<'vendors' | 'products' | null>(null);
  const [vendorMeta, setVendorMeta] = useState<
    Record<string, { businessName?: string; logoUrl?: string }>
  >({});

  const vendors = useMemo(
    () => entities.filter((e) => e.type === 'vendor'),
    [entities],
  );
  const listings = useMemo(() => entities.filter(isListingEntity), [entities]);
  const vendorIdsKey = vendors.map((v) => v.id).join('|');

  useEffect(() => {
    if (vendors.length === 0) return;
    let cancelled = false;
    void Promise.all(
      vendors.map(async (v) => {
        try {
          const profile = await fetchVendorProfileDoc(v.id);
          if (!profile) return null;
          return [
            v.id,
            { businessName: profile.businessName, logoUrl: profile.logoUrl },
          ] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, { businessName?: string; logoUrl?: string }> = {};
      for (const e of entries) {
        if (e) next[e[0]] = e[1];
      }
      if (Object.keys(next).length > 0) setVendorMeta((prev) => ({ ...prev, ...next }));
    });
    return () => {
      cancelled = true;
    };
    // vendorIdsKey captures identity of vendor list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorIdsKey]);

  if (vendors.length === 0 && listings.length === 0) {
    return <View style={styles.entityPlaceholder} />;
  }

  const vendorLabel = (entity: PostLinkedEntity) =>
    vendorMeta[entity.id]?.businessName?.trim() || entity.label?.trim() || 'View vendor';

  const listingLabel = (entity: PostLinkedEntity) =>
    entity.label?.trim() || 'View product';

  const openVendor = (id: string) => {
    setMenu(null);
    router.push(`/vendor/${id}` as never);
  };

  const openListing = (id: string) => {
    setMenu(null);
    router.push(`/listing/${id}?from=discover` as never);
  };

  const menuItems =
    menu === 'vendors'
      ? vendors.map((v) => ({
          key: v.id,
          label: vendorLabel(v),
          logoUrl: vendorMeta[v.id]?.logoUrl,
          onPress: () => openVendor(v.id),
        }))
      : menu === 'products'
        ? listings.map((l) => ({
            key: l.id,
            label: listingLabel(l),
            logoUrl: undefined as string | undefined,
            onPress: () => openListing(l.id),
          }))
        : [];

  return (
    <View style={styles.entityRow}>
      {vendors.length === 1 ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            openVendor(vendors[0]!.id);
          }}
          style={[styles.entityChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Ionicons name="storefront-outline" size={12} color="#065F46" />
          <ThemedText type="small" numberOfLines={1} style={styles.vendorChipText}>
            {vendorLabel(vendors[0]!)}
          </ThemedText>
        </Pressable>
      ) : vendors.length > 1 ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setMenu('vendors');
          }}
          style={[styles.entityChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Ionicons name="storefront-outline" size={12} color="#065F46" />
          <ThemedText type="small" style={styles.vendorChipText}>
            Vendors {vendors.length}
          </ThemedText>
          <Ionicons name="chevron-down" size={12} color="#065F46" />
        </Pressable>
      ) : null}

      {listings.length === 1 ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            openListing(listings[0]!.id);
          }}
          style={[styles.entityChip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="cube-outline" size={12} color="#92400E" />
          <ThemedText type="small" numberOfLines={1} style={styles.productChipText}>
            {listingLabel(listings[0]!)}
          </ThemedText>
        </Pressable>
      ) : listings.length > 1 ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setMenu('products');
          }}
          style={[styles.entityChip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="cube-outline" size={12} color="#92400E" />
          <ThemedText type="small" style={styles.productChipText}>
            Products {listings.length}
          </ThemedText>
          <Ionicons name="chevron-down" size={12} color="#92400E" />
        </Pressable>
      ) : null}

      <Modal
        visible={menu != null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenu(null)}>
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={[styles.menuSheet, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
              {menu === 'vendors' ? 'Vendors' : 'Products'}
            </ThemedText>
            {menuItems.map((item) => (
              <Pressable key={item.key} onPress={item.onPress} style={styles.menuRow}>
                {menu === 'vendors' ? (
                  item.logoUrl ? (
                    <Image
                      source={{ uri: item.logoUrl }}
                      style={styles.menuAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.menuAvatar,
                        { backgroundColor: theme.backgroundSelected, alignItems: 'center', justifyContent: 'center' },
                      ]}>
                      <ThemedText type="smallBold">{item.label.charAt(0).toUpperCase()}</ThemedText>
                    </View>
                  )
                ) : (
                  <View
                    style={[
                      styles.menuAvatar,
                      { backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' },
                    ]}>
                    <Ionicons name="cube-outline" size={14} color="#92400E" />
                  </View>
                )}
                <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1 }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function VideoPoster({
  item,
  onOpenFullscreen,
}: {
  item: PostMediaItem;
  onOpenFullscreen: () => void;
}) {
  const theme = useTheme();
  const poster = item.thumbnailUrl
    ? resolveStorageImageUrl(item.thumbnailUrl) || item.thumbnailUrl
    : resolveStorageImageUrl(item.url) || item.url;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        onOpenFullscreen();
      }}
      style={styles.mediaFrame}>
      {poster ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundSelected }]} />
      )}
      <View style={styles.playOverlay}>
        <View style={[styles.playBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Ionicons name="play" size={22} color="#FFFFFF" />
        </View>
      </View>
      <View style={[styles.videoHint, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" style={{ fontSize: 10 }}>
          Video
        </ThemedText>
      </View>
    </Pressable>
  );
}

function VideoFullscreen({
  visible,
  src,
  onClose,
}: {
  visible: boolean;
  src: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(src, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (!visible) return;
    player.play();
    return () => {
      player.pause();
    };
  }, [visible, player]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.fullscreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable onPress={onClose} style={styles.fullscreenClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <VideoView
          player={player}
          style={styles.fullscreenVideo}
          contentFit="contain"
          nativeControls
          allowsFullscreen
        />
      </View>
    </Modal>
  );
}

function MediaCarousel({
  media,
  onOpenVideo,
  onIndexChange,
}: {
  media: PostMediaItem[];
  onOpenVideo: (item: PostMediaItem) => void;
  onIndexChange?: (index: number) => void;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const images = media.filter((m) => m.type === 'image');
  const video = media.find((m) => m.type === 'video');

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  if (video) {
    return <VideoPoster item={video} onOpenFullscreen={() => onOpenVideo(video)} />;
  }
  if (images.length === 0) return null;

  const current = images[index]!;
  const src = resolveStorageImageUrl(current.url) || current.url;

  const setIndexSafe = (next: number | ((prev: number) => number)) => {
    setIndex((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      return value;
    });
  };

  return (
    <View style={styles.mediaFrame}>
      <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {images.length > 1 ? (
        <>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setIndexSafe((i) => (i - 1 + images.length) % images.length);
            }}
            style={[styles.carouselArrow, styles.carouselLeft, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="chevron-back" size={14} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              setIndexSafe((i) => (i + 1) % images.length);
            }}
            style={[styles.carouselArrow, styles.carouselRight, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="chevron-forward" size={14} color={theme.text} />
          </Pressable>
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }]}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

type Props = {
  post: FeedPost;
  vendorVerified?: boolean;
  disableOpen?: boolean;
};

export function FeedPostCard({ post, vendorVerified, disableOpen }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const publishedAt = toFeedDate(post.publishedAt ?? post.createdAt);
  const categorySlug = post.categorySlugs[0];
  const primaryCategory = categorySlug ? getCategoryBySlug(categorySlug)?.title : null;
  const displayName = post.authorType === 'wellnessxplora' ? 'WellnessXplora' : post.authorName;
  const authorPhoto = post.authorPhotoURL
    ? resolveStorageImageUrl(post.authorPhotoURL) || post.authorPhotoURL
    : '';

  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saveCount, setSaveCount] = useState(post.saveCount);
  const [videoItem, setVideoItem] = useState<PostMediaItem | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const videoSrc = videoItem ? resolveStorageImageUrl(videoItem.url) || videoItem.url : '';

  useEffect(() => {
    setLikeCount(post.likeCount);
    setSaveCount(post.saveCount);
  }, [post.likeCount, post.saveCount]);

  const isEditorial = post.authorType === 'wellnessxplora';
  const isOwnPost =
    Boolean(user) && (post.authorId === user?.uid || post.vendorId === user?.uid);
  // Prefer storefront id; fall back to author so WellnessXplora / admin profiles open.
  const profileVendorId =
    post.vendorId?.trim() || post.authorId.trim() || undefined;
  const showConnect = !isOwnPost && Boolean(profileVendorId) && post.authorType === 'vendor';

  const metaTime = formatFeedTime(publishedAt);

  const openDetail = () => {
    if (disableOpen) return;
    router.push(`/post/${post.id}` as never);
  };

  const openAuthor = () => {
    if (profileVendorId) {
      router.push(`/vendor/${profileVendorId}` as never);
    }
  };

  const openCategory = () => {
    if (!categorySlug) return;
    router.push(`/category/${categorySlug}` as never);
  };

  return (
    <Pressable
      onPress={openDetail}
      style={({ pressed }) => [
        styles.card,
        Shadows.card,
        {
          backgroundColor: isEditorial ? EDITORIAL_FILL : theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          maxWidth: Math.min(width - Spacing.three * 2, 560),
          opacity: pressed && !disableOpen ? 0.96 : 1,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              openAuthor();
            }}
            style={styles.authorHit}
            disabled={!profileVendorId}
            accessibilityRole="link"
            accessibilityLabel={`${displayName} profile`}>
            {isEditorial ? (
              <Image source={EDITORIAL_LOGO} style={styles.avatar} contentFit="cover" />
            ) : authorPhoto ? (
              <Image source={{ uri: authorPhoto }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{displayName.charAt(0).toUpperCase()}</ThemedText>
              </View>
            )}
            <View style={styles.nameRow}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                {displayName}
              </ThemedText>
              {isEditorial ? (
                <Image
                  source={EDITORIAL_BADGE}
                  style={styles.editorialBadge}
                  contentFit="contain"
                  accessibilityLabel="Editorial"
                />
              ) : null}
              {post.authorType === 'vendor' && vendorVerified ? (
                <VendorTrustBadges verified size="xs" />
              ) : null}
            </View>
          </Pressable>
          <View style={styles.metaRow}>
            {post.contentType === 'event' ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
                Event
              </ThemedText>
            ) : null}
            {post.contentType === 'event' && (primaryCategory || metaTime) ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
                {' · '}
              </ThemedText>
            ) : null}
            {primaryCategory && categorySlug ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  openCategory();
                }}
                hitSlop={6}
                accessibilityRole="link"
                accessibilityLabel={`Category ${primaryCategory}`}>
                <ThemedText type="small" style={[styles.meta, { color: theme.tint }]}>
                  {primaryCategory}
                </ThemedText>
              </Pressable>
            ) : null}
            {primaryCategory && metaTime ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
                {' · '}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
              {metaTime}
            </ThemedText>
          </View>
        </View>
        {showConnect && profileVendorId ? (
          <VendorFollowButton vendorId={profileVendorId} hideWhenConnected />
        ) : null}
      </View>

      {post.media.length > 0 ? (
        <View style={styles.mediaPad}>
          <MediaCarousel
            media={post.media}
            onOpenVideo={setVideoItem}
            onIndexChange={setMediaIndex}
          />
          <PostEngagementBar
            postId={post.id}
            likeCount={likeCount}
            saveCount={saveCount}
            layout="under-media"
            addToStoryPost={post}
            addToStoryMediaIndex={mediaIndex}
            onCountsChange={({ likeCount: l, saveCount: s }) => {
              setLikeCount(l);
              setSaveCount(s);
            }}
          />
        </View>
      ) : null}

      <View style={styles.body}>
        <FeedCaption text={post.caption} />
        <LinkedEntitiesRow entities={post.linkedEntities} />
        {post.media.length === 0 ? (
          <PostEngagementBar
            postId={post.id}
            likeCount={likeCount}
            saveCount={saveCount}
            layout="inline"
            addToStoryPost={post}
            addToStoryMediaIndex={mediaIndex}
            onCountsChange={({ likeCount: l, saveCount: s }) => {
              setLikeCount(l);
              setSaveCount(s);
            }}
          />
        ) : null}
      </View>

      {videoItem && videoSrc ? (
        <VideoFullscreen visible src={videoSrc} onClose={() => setVideoItem(null)} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  authorRow: { flex: 1, minWidth: 0, gap: 0 },
  authorHit: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  name: { flexShrink: 1, fontSize: 14, lineHeight: 18 },
  editorialBadge: {
    width: 68,
    height: 22,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginLeft: 46,
    marginTop: -1,
  },
  meta: { fontSize: 11, lineHeight: 14 },
  mediaPad: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
  mediaFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8E4DF',
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselLeft: { left: 8 },
  carouselRight: { right: 8 },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoHint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  body: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.two },
  captionWrap: { gap: 2 },
  caption: { lineHeight: 20 },
  entityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 28, alignItems: 'center' },
  entityPlaceholder: { minHeight: 28 },
  entityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  vendorChipText: { fontSize: 11, color: '#065F46', maxWidth: 140 },
  productChipText: { fontSize: 11, color: '#92400E', maxWidth: 140 },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: Spacing.three,
  },
  menuSheet: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: 4,
    maxHeight: '60%',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  menuAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 2,
  },
  fullscreenVideo: {
    width: '100%',
    height: '80%',
  },
});
