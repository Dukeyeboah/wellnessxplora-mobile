import Ionicons from '@expo/vector-icons/Ionicons';
import { useWindowDimensions, ScrollView, StyleSheet, View } from 'react-native';

import { FeedPostCard } from '@/components/feed-post-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FeedPost } from '@/lib/feed-posts';

type Props = {
  title?: string;
  posts: FeedPost[];
};

export function FeedEventsCarousel({ title = 'Upcoming Events', posts }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const sidePad = Spacing.three;
  const cardWidth = Math.min(width - sidePad * 2, 560);

  if (posts.length === 0) return null;

  if (posts.length === 1) {
    return (
      <View style={styles.wrap}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
        </View>
        <View style={styles.singleWrap}>
          <View style={[styles.card, { width: '100%', maxWidth: cardWidth }]}>
            <FeedPostCard post={posts[0]!} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.hint}>
          <Ionicons name="chevron-back" size={14} color={theme.textSecondary} />
          <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + Spacing.three}
        snapToAlignment="center"
        contentContainerStyle={[
          styles.row,
          { paddingHorizontal: Math.max(0, (width - cardWidth) / 2 - sidePad) },
        ]}
        nestedScrollEnabled>
        {posts.map((post) => (
          <View key={post.id} style={[styles.card, { width: cardWidth }]}>
            <FeedPostCard post={post} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    opacity: 0.7,
  },
  singleWrap: {
    width: '100%',
    alignItems: 'center',
  },
  row: {
    gap: Spacing.three,
    paddingVertical: 2,
    alignItems: 'flex-start',
  },
  card: {
    alignSelf: 'center',
  },
});
