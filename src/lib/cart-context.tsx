import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AddToCartInput, VendorCart } from '@/lib/cart-types';
import { useAuth } from '@/lib/auth-context';
import {
  addToCart as addToCartStorage,
  deleteVendorCart,
  dismissCartIntro,
  getListingCartQuantity,
  getTotalCartItemCount,
  getVendorCarts,
  hasDismissedCartIntro,
  hydrateCartScope,
  isListingInCart,
  removeFromCart,
  setCartItemQuantity,
  updateCartItemQuantity,
} from '@/lib/cart-storage';

type CartContextValue = {
  vendorCarts: VendorCart[];
  totalItemCount: number;
  ready: boolean;
  refresh: () => Promise<void>;
  addItem: (input: AddToCartInput) => Promise<void>;
  setItem: (input: AddToCartInput) => Promise<void>;
  removeItem: (vendorId: string, listingId: string) => Promise<void>;
  updateQuantity: (vendorId: string, listingId: string, quantity: number) => Promise<void>;
  deleteCart: (vendorId: string) => Promise<void>;
  getQuantity: (vendorId: string, listingId: string) => number;
  isInCart: (vendorId: string, listingId: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [vendorCarts, setVendorCarts] = useState<VendorCart[]>([]);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [carts, count] = await Promise.all([getVendorCarts(), getTotalCartItemCount()]);
    setVendorCarts(carts);
    setTotalItemCount(count);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    void (async () => {
      setReady(false);
      await hydrateCartScope(user?.uid ?? null);
      if (!cancelled) {
        await refresh();
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid, refresh]);

  const addItem = useCallback(
    async (input: AddToCartInput) => {
      const countBefore = await getTotalCartItemCount();
      await addToCartStorage(input);
      await refresh();
      if (countBefore === 0 && !(await hasDismissedCartIntro())) {
        await dismissCartIntro();
      }
    },
    [refresh],
  );

  const setItem = useCallback(
    async (input: AddToCartInput) => {
      await setCartItemQuantity(input);
      await refresh();
    },
    [refresh],
  );

  const removeItemCb = useCallback(
    async (vendorId: string, listingId: string) => {
      await removeFromCart(vendorId, listingId);
      await refresh();
    },
    [refresh],
  );

  const updateQuantity = useCallback(
    async (vendorId: string, listingId: string, quantity: number) => {
      await updateCartItemQuantity(vendorId, listingId, quantity);
      await refresh();
    },
    [refresh],
  );

  const deleteCart = useCallback(
    async (vendorId: string) => {
      await deleteVendorCart(vendorId);
      await refresh();
    },
    [refresh],
  );

  const getQuantity = useCallback(
    (vendorId: string, listingId: string) => {
      const cart = vendorCarts.find((c) => c.vendorId === vendorId);
      return cart?.items.find((i) => i.listingId === listingId)?.quantity ?? 0;
    },
    [vendorCarts],
  );

  const isInCart = useCallback(
    (vendorId: string, listingId: string) => getQuantity(vendorId, listingId) > 0,
    [getQuantity],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      vendorCarts,
      totalItemCount,
      ready,
      refresh,
      addItem,
      setItem,
      removeItem: removeItemCb,
      updateQuantity,
      deleteCart,
      getQuantity,
      isInCart,
    }),
    [
      vendorCarts,
      totalItemCount,
      ready,
      refresh,
      addItem,
      setItem,
      removeItemCb,
      updateQuantity,
      deleteCart,
      getQuantity,
      isInCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
