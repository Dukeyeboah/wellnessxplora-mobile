import type { ImageSourcePropType } from 'react-native';

export type ImageUploadRole = 'listing' | 'profile' | 'banner';

export type ImageUploadGuidance = {
  role: ImageUploadRole;
  recommendationTitle: string;
  sizePixels: string;
  aspectRatioShort: string;
  sizeMinimum?: string;
  format: string;
  maxSize: string;
  tips: string[];
  example: ImageSourcePropType;
  exampleAlt: string;
  /** Profile examples render circular. */
  circularExample?: boolean;
};

export const IMAGE_UPLOAD_GUIDANCE: Record<ImageUploadRole, ImageUploadGuidance> = {
  listing: {
    role: 'listing',
    recommendationTitle: 'Listing image recommendation',
    sizePixels: '800 × 800 px',
    aspectRatioShort: '1:1',
    sizeMinimum: 'minimum 600 × 600',
    format: 'JPEG, PNG, or WebP',
    maxSize: '5 MB',
    tips: [
      'Square photos crop cleanly on cards and in the enquiry cart.',
      'Leave breathing room around products — avoid tight edge-to-edge crops.',
      'Use bright, even lighting and a clean background when possible.',
    ],
    example: require('@/assets/images/examples/product_example.jpeg'),
    exampleAlt: 'Example product listing image',
  },
  profile: {
    role: 'profile',
    recommendationTitle: 'Profile image recommendation',
    sizePixels: '800 × 800 px',
    aspectRatioShort: '1:1',
    sizeMinimum: 'minimum 400 × 400',
    format: 'JPEG, PNG, or WebP',
    maxSize: '5 MB',
    tips: [
      'Center your logo or portrait — it displays as a circle on your profile.',
      'Use a simple background so the image stays clear at small sizes.',
    ],
    example: require('@/assets/images/examples/profile_example.jpeg'),
    exampleAlt: 'Example business profile image',
    circularExample: true,
  },
  banner: {
    role: 'banner',
    recommendationTitle: 'Banner recommendation',
    sizePixels: '1800 × 600 px',
    aspectRatioShort: '3:1',
    sizeMinimum: 'minimum 1200 × 400',
    format: 'JPEG, PNG, or WebP',
    maxSize: '5 MB',
    tips: [
      'Keep your business name or main visual in the center third.',
      'Avoid important details at the far left or right — edges may crop on some screens.',
    ],
    example: require('@/assets/images/examples/banner_example.jpeg'),
    exampleAlt: 'Example business banner image',
  },
};

/** Realistic limits for listing copy fields. */
export const LISTING_TITLE_MAX = 80;
export const LISTING_DESCRIPTION_MAX = 1200;
