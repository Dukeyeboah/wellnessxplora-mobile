export interface CartLineItem {
  listingId: string;
  listingTitle: string;
  listingType: 'product' | 'service';
  price?: number;
  currency?: string;
  imageUrl?: string;
  quantity: number;
}

export interface VendorCart {
  vendorId: string;
  vendorName: string;
  vendorUsername?: string;
  vendorImageUrl?: string;
  items: CartLineItem[];
  note: string;
  updatedAt: number;
}

export interface CartStorageState {
  vendors: Record<string, VendorCart>;
}

export interface AddToCartInput {
  listingId: string;
  vendorId: string;
  vendorName: string;
  vendorUsername?: string;
  vendorImageUrl?: string;
  listingTitle: string;
  listingType: 'product' | 'service';
  price?: number;
  currency?: string;
  imageUrl?: string;
  quantity?: number;
}

export const CART_STORAGE_KEY_GUEST = 'wx_vendor_carts_guest_v1';
export const CART_INTRO_DISMISSED_KEY = 'wx_cart_intro_dismissed_v1';

export function cartStorageKeyForUser(uid: string): string {
  return `wx_vendor_carts_user_${uid}_v1`;
}
