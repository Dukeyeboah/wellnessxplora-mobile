import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { AddToCartModal } from '@/components/add-to-cart-modal';
import { useCart } from '@/lib/cart-context';
import type { ExploreListing } from '@/lib/listings';
import { requireAuth } from '@/lib/require-auth';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

type CartModalContextValue = {
  openAddToCart: (listing: ExploreListing) => void;
};

const CartModalContext = createContext<CartModalContextValue | null>(null);

export function CartModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { setItem, getQuantity, ready } = useCart();
  const [listing, setListing] = useState<ExploreListing | null>(null);
  const [quantity, setQuantity] = useState(1);

  const openAddToCart = useCallback(
    (item: ExploreListing) => {
      if (!requireAuth(!!user, router, 'cart')) return;
      const current = ready ? getQuantity(item.vendorId, item.id) : 0;
      setQuantity(current > 0 ? current : 1);
      setListing(item);
    },
    [user, router, getQuantity, ready],
  );

  const close = useCallback(() => setListing(null), []);

  const confirm = useCallback(async () => {
    if (!listing) return;
    await setItem({
      listingId: listing.id,
      vendorId: listing.vendorId,
      vendorName: listing.vendorName,
      vendorUsername: undefined,
      vendorImageUrl: listing.vendorAvatarUrl,
      listingTitle: listing.title,
      listingType: 'product',
      price: listing.price,
      currency: listing.currency,
      imageUrl: listing.imageUrl,
      quantity,
    });
    close();
  }, [listing, quantity, setItem, close]);

  const value = useMemo(() => ({ openAddToCart }), [openAddToCart]);

  return (
    <CartModalContext.Provider value={value}>
      {children}
      <AddToCartModal
        visible={!!listing}
        listing={listing}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onClose={close}
        onConfirm={() => void confirm()}
      />
    </CartModalContext.Provider>
  );
}

export function useCartModal() {
  const ctx = useContext(CartModalContext);
  if (!ctx) throw new Error('useCartModal must be used within CartModalProvider');
  return ctx;
}
