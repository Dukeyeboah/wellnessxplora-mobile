import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type PickedImageAsset = {
  uri: string;
};

type PickOptions = {
  /** Max number of images to return. */
  selectionLimit: number;
  /** Allow multi-select from the library when limit > 1. */
  allowsMultiple?: boolean;
};

/**
 * Prompt for photo source (library / camera on device), then return picked assets.
 * On web, opens the file library directly (camera sheet is less useful).
 */
export async function pickImagesWithSource(
  options: PickOptions,
): Promise<PickedImageAsset[]> {
  const limit = Math.max(1, options.selectionLimit);
  const allowsMultiple = Boolean(options.allowsMultiple) && limit > 1;

  const fromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access to upload listing images.',
      );
      return [] as PickedImageAsset[];
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowsMultiple,
      selectionLimit: limit,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return [];
    return result.assets.slice(0, limit).map((a) => ({ uri: a.uri }));
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access to take a listing photo.');
      return [] as PickedImageAsset[];
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return [];
    return [{ uri: result.assets[0].uri }];
  };

  if (Platform.OS === 'web') {
    return fromLibrary();
  }

  return new Promise((resolve) => {
    Alert.alert('Add photo', 'Choose where to get your image from.', [
      {
        text: 'Photo library',
        onPress: () => {
          void fromLibrary().then(resolve);
        },
      },
      {
        text: 'Take photo',
        onPress: () => {
          void fromCamera().then(resolve);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve([]),
      },
    ]);
  });
}
