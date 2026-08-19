import type { ImageSource } from 'expo-image';

/** Static requires — Metro cannot load these from a dynamic path. */
export const CATEGORY_LOGO_SOURCES: Record<string, ImageSource> = {
  'natural-foods': require('../../assets/images/category_logos_highres/organic_food.jpeg'),
  'teas-juices-healthy-drinks': require('../../assets/images/category_logos_highres/healthy_drinks_juice.jpeg'),
  bakeries: require('../../assets/images/category_logos_highres/bakeries.jpeg'),
  'vitamins-supplements': require('../../assets/images/category_logos_highres/vitamins_supplements.jpeg'),
  'fitness-yoga': require('../../assets/images/category_logos_highres/fitness_yoga.jpeg'),
  'spas-massage-wellness': require('../../assets/images/category_logos_highres/spas_massage_wellness.jpeg'),
  'skincare-aromatherapy': require('../../assets/images/category_logos_highres/skincare_aromatherapy.jpeg'),
  'holistic-naturopathic-alternative-remedies': require('../../assets/images/category_logos_highres/holistic_naturopathic_remedies.jpeg'),
  'workshops-retreats': require('../../assets/images/category_logos_highres/workshops_retreats.jpeg'),
  'eco-friendly-sustainable-products': require('../../assets/images/category_logos_highres/eco_friendly_products.jpeg'),
  'natural-home-products': require('../../assets/images/category_logos_highres/natural_home_products.jpeg'),
  'pet-wellness': require('../../assets/images/category_logos_highres/pet_wellness.jpeg'),
};
