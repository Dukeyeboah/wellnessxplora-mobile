import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_LOGO_SOURCES } from '@/lib/category-logos';

const TILES = Object.values(CATEGORY_LOGO_SOURCES);

/** Mosaic of category photos behind the auth card. */
export function AuthCategoryBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.mosaic}>
        {TILES.map((source, index) => (
          <Image key={index} source={source} style={styles.tile} contentFit="cover" />
        ))}
      </View>
      <View style={styles.dim} />
    </View>
  );
}

const styles = StyleSheet.create({
  mosaic: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '33.333%',
    height: '25%',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 250, 250, 0.55)',
  },
});
