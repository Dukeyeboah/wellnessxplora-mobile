import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { CartStorageState } from '@/lib/cart-types';

const cartDocPath = (uid: string) => doc(db, 'users', uid, 'private', 'cart');

export async function loadCartFromFirestore(uid: string): Promise<CartStorageState | null> {
  try {
    const snap = await getDoc(cartDocPath(uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data?.vendors || typeof data.vendors !== 'object') return null;
    return { vendors: data.vendors as CartStorageState['vendors'] };
  } catch {
    return null;
  }
}

export async function saveCartToFirestore(uid: string, state: CartStorageState): Promise<void> {
  try {
    await setDoc(cartDocPath(uid), { vendors: state.vendors, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn('Could not sync cart to Firestore', err);
  }
}
