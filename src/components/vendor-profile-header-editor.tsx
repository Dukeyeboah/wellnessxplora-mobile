import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ImageUploadGuidancePanel } from '@/components/image-upload-guidance-panel';
import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  logoUri?: string;
  coverUri?: string;
  editable?: boolean;
  onEditLogo?: () => void;
  onEditCover?: () => void;
};

export function VendorProfileHeaderEditor({
  logoUri,
  coverUri,
  editable = true,
  onEditLogo,
  onEditCover,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={!editable}
        onPress={onEditCover}
        style={[styles.coverWrap, { backgroundColor: theme.backgroundSelected }]}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={28} color={theme.textSecondary} />
            {editable ? (
              <ThemedText type="small" themeColor="textSecondary">
                Add banner
              </ThemedText>
            ) : null}
          </View>
        )}
        {editable ? (
          <Pressable hitSlop={8} onPress={onEditCover} style={[styles.editFab, Shadows.button]}>
            <Ionicons name="pencil" size={14} color={theme.text} />
          </Pressable>
        ) : null}
      </Pressable>

      <View style={styles.logoRow}>
        <Pressable
          disabled={!editable}
          onPress={onEditLogo}
          style={[
            styles.logoWrap,
            { borderColor: theme.backgroundElement, backgroundColor: theme.backgroundElement },
          ]}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} contentFit="cover" />
          ) : (
            <View
              style={[
                styles.logo,
                styles.logoPlaceholder,
                { backgroundColor: theme.backgroundSelected },
              ]}>
              <Ionicons name="storefront-outline" size={24} color={theme.textSecondary} />
            </View>
          )}
          {editable ? (
            <Pressable hitSlop={8} onPress={onEditLogo} style={[styles.logoEditFab, Shadows.button]}>
              <Ionicons name="pencil" size={12} color={theme.text} />
            </Pressable>
          ) : null}
        </Pressable>
      </View>

      {editable ? (
        <View style={styles.guidanceStack}>
          <ImageUploadGuidancePanel role="profile" />
          <ImageUploadGuidancePanel role="banner" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  coverWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 148,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: 148,
  },
  coverPlaceholder: {
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editFab: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    marginTop: -40,
    paddingLeft: Spacing.two,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    overflow: 'visible',
    position: 'relative',
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEditFab: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceStack: {
    paddingHorizontal: Spacing.one,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
