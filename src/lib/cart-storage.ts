import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCartFromFirestore, saveCartToFirestore } from '@/lib/cart-firestore';
import type {
  AddToCartInput,
  CartLineItem,
  CartStorageState,
  VendorCart,
} from '@/lib/cart-types';
import {
  CART_INTRO_DISMISSED_KEY,
  CART_STORAGE_KEY_GUEST,
  cartStorageKeyForUser,
} from '@/lib/cart-types';

function emptyState(): CartStorageState {
  return { vendors: {} };
}

let activeStorageKey = CART_STORAGE_KEY_GUEST;
let activeUid: string | null = null;

function mergeStates(a: CartStorageState, b: CartStorageState): CartStorageState {
  const vendors = { ...a.vendors };
  for (const [vendorId, cart] of Object.entries(b.vendors)) {
    const existing = vendors[vendorId];
    if (!existing) {
      vendors[vendorId] = cart;
      continue;
    }
    const items = [...existing.items];
    for (const item of cart.items) {
      const idx = items.findIndex((i) => i.listingId === item.listingId);
      if (idx >= 0) {
        items[idx] = {
          ...items[idx],
          ...item,
          quantity: items[idx].quantity + item.quantity,
        };
      } else {
        items.push(item);
      }
    }
    vendors[vendorId] = {
      ...existing,
      ...cart,
      items,
      updatedAt: Math.max(existing.updatedAt, cart.updatedAt),
    };
  }
  return { vendors };
}

export function setCartStorageScope(uid: string | null): void {
  activeUid = uid;
  activeStorageKey = uid ? cartStorageKeyForUser(uid) : CART_STORAGE_KEY_GUEST;
}

export async function hydrateCartScope(uid: string | null): Promise<void> {
  setCartStorageScope(uid);
  if (!uid) return;

  const [guestRaw, userRaw, cloud] = await Promise.all([
    AsyncStorage.getItem(CART_STORAGE_KEY_GUEST),
    AsyncStorage.getItem(cartStorageKeyForUser(uid)),
    loadCartFromFirestore(uid),
  ]);

  let state = emptyState();
  if (guestRaw) {
    try {
      const guest = JSON.parse(guestRaw) as CartStorageState;
      if (guest?.vendors) state = mergeStates(state, guest);
    } catch {
      /* ignore */
    }
  }
  if (userRaw) {
    try {
      const local = JSON.parse(userRaw) as CartStorageState;
      if (local?.vendors) state = mergeStates(state, local);
    } catch {
      /* ignore */
    }
  }
  if (cloud?.vendors) {
    state = mergeStates(state, cloud);
  }

  await writeState(state);
  await AsyncStorage.removeItem(CART_STORAGE_KEY_GUEST);
}

async function readState(): Promise<CartStorageState> {
  try {
    const raw = await AsyncStorage.getItem(activeStorageKey);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as CartStorageState;
    if (!parsed?.vendors || typeof parsed.vendors !== 'object') return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

async function writeState(state: CartStorageState): Promise<void> {
  await AsyncStorage.setItem(activeStorageKey, JSON.stringify(state));
  if (activeUid) {
    await saveCartToFirestore(activeUid, state);
  }
}

export async function getVendorCarts(): Promise<VendorCart[]> {
  const state = await readState();
  return Object.values(state.vendors).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getVendorCart(vendorId: string): Promise<VendorCart | null> {
  const state = await readState();
  return state.vendors[vendorId] ?? null;
}

export async function getTotalCartItemCount(): Promise<number> {
  const carts = await getVendorCarts();
  return carts.reduce(
    (sum, cart) => sum + cart.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );
}

export async function getListingCartQuantity(vendorId: string, listingId: string): Promise<number> {
  const cart = await getVendorCart(vendorId);
  return cart?.items.find((item) => item.listingId === listingId)?.quantity ?? 0;
}

export async function isListingInCart(vendorId: string, listingId: string): Promise<boolean> {
  return (await getListingCartQuantity(vendorId, listingId)) > 0;
}

export async function setCartItemQuantity(input: AddToCartInput): Promise<void> {
  const state = await readState();
  const now = Date.now();
  const qty = Math.max(0, input.quantity ?? 1);
  const existing = state.vendors[input.vendorId];

  if (qty <= 0) {
    if (existing) {
      existing.items = existing.items.filter((item) => item.listingId !== input.listingId);
      if (existing.items.length === 0) delete state.vendors[input.vendorId];
      else existing.updatedAt = now;
    }
    await writeState(state);
    return;
  }

  const line: CartLineItem = {
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    listingType: input.listingType,
    price: input.price,
    currency: input.currency,
    imageUrl: input.imageUrl,
    quantity: qty,
  };

  if (existing) {
    const idx = existing.items.findIndex((item) => item.listingId === input.listingId);
    if (idx >= 0) {
      existing.items[idx] = { ...existing.items[idx], ...line, quantity: qty };
    } else {
      existing.items.push(line);
    }
    existing.vendorName = input.vendorName;
    existing.vendorUsername = input.vendorUsername ?? existing.vendorUsername;
    existing.vendorImageUrl = input.vendorImageUrl ?? existing.vendorImageUrl;
    existing.updatedAt = now;
  } else {
    state.vendors[input.vendorId] = {
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      vendorUsername: input.vendorUsername,
      vendorImageUrl: input.vendorImageUrl,
      items: [line],
      note: '',
      updatedAt: now,
    };
  }

  await writeState(state);
}

export async function addToCart(input: AddToCartInput): Promise<void> {
  const current = await getListingCartQuantity(input.vendorId, input.listingId);
  const qty = Math.max(1, input.quantity ?? 1);
  await setCartItemQuantity({ ...input, quantity: current + qty });
}

export async function removeFromCart(vendorId: string, listingId: string): Promise<void> {
  const state = await readState();
  const cart = state.vendors[vendorId];
  if (!cart) return;

  cart.items = cart.items.filter((item) => item.listingId !== listingId);
  if (cart.items.length === 0) {
    delete state.vendors[vendorId];
  } else {
    cart.updatedAt = Date.now();
  }
  await writeState(state);
}

export async function updateCartItemQuantity(
  vendorId: string,
  listingId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    await removeFromCart(vendorId, listingId);
    return;
  }
  const state = await readState();
  const cart = state.vendors[vendorId];
  if (!cart) return;
  const item = cart.items.find((i) => i.listingId === listingId);
  if (!item) return;
  item.quantity = quantity;
  cart.updatedAt = Date.now();
  await writeState(state);
}

export async function deleteVendorCart(vendorId: string): Promise<void> {
  const state = await readState();
  delete state.vendors[vendorId];
  await writeState(state);
}

export async function hasDismissedCartIntro(): Promise<boolean> {
  return (await AsyncStorage.getItem(CART_INTRO_DISMISSED_KEY)) === '1';
}

export async function dismissCartIntro(): Promise<void> {
  await AsyncStorage.setItem(CART_INTRO_DISMISSED_KEY, '1');
}
