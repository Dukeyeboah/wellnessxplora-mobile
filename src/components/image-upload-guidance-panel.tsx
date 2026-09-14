import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  IMAGE_UPLOAD_GUIDANCE,
  type ImageUploadRole,
} from '@/lib/image-upload-guidance';

type Props = {
  role: ImageUploadRole;
  /** Start expanded. Default collapsed. */
  defaultExpanded?: boolean;
};

export function ImageUploadGuidancePanel({ role, defaultExpanded = false }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const guidance = IMAGE_UPLOAD_GUIDANCE[role];
  const linkColor = theme.tint;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint="Shows image size and photo tips">
        <ThemedText
          type="small"
          style={[
            styles.headerTitle,
            {
              color: linkColor,
              textDecorationLine: expanded ? 'none' : 'underline',
              textDecorationColor: `${linkColor}66`,
            },
          ]}>
          {guidance.recommendationTitle}
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={linkColor}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Image
              source={guidance.example}
              style={[
                styles.example,
                guidance.circularExample && styles.exampleCircle,
                { backgroundColor: theme.backgroundSelected },
              ]}
              contentFit="cover"
              accessibilityLabel={guidance.exampleAlt}
            />
            <View style={styles.meta}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.italic}>
                Size: {guidance.sizePixels} ({guidance.aspectRatioShort})
                {guidance.sizeMinimum ? ` — ${guidance.sizeMinimum}` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.italic}>
                Format: {guidance.format} · max {guidance.maxSize}
              </ThemedText>
            </View>
          </View>
          <View style={styles.tips}>
            {guidance.tips.map((tip) => (
              <ThemedText
                key={tip}
                type="small"
                themeColor="textSecondary"
                style={styles.italic}>
                · {tip}
              </ThemedText>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 2,
  },
  headerTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  body: {
    gap: Spacing.two,
    paddingTop: 2,
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  example: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  exampleCircle: {
    borderRadius: 32,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  tips: {
    gap: 3,
  },
  italic: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
