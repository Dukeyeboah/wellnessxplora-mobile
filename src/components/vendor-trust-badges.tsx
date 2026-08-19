import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const VERIFIED_BADGE = require('@/assets/images/verifiedBadge.png');
const FOUNDING_BADGE = require('@/assets/images/foundingMember.png');

const SIZES = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
} as const;

type BadgeSize = keyof typeof SIZES;

type Props = {
  verified?: boolean;
  foundingMember?: boolean;
  size?: BadgeSize;
};

export function VendorTrustBadges({
  verified = false,
  foundingMember = false,
  size = 'sm',
}: Props) {
  if (!verified && !foundingMember) return null;
  const dim = SIZES[size];

  return (
    <View style={styles.row}>
      {foundingMember ? (
        <Image
          source={FOUNDING_BADGE}
          style={{ width: dim, height: dim }}
          contentFit="contain"
          accessibilityLabel="Founding member"
        />
      ) : null}
      {verified ? (
        <Image
          source={VERIFIED_BADGE}
          style={{ width: dim, height: dim }}
          contentFit="contain"
          accessibilityLabel="Verified vendor"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
});
