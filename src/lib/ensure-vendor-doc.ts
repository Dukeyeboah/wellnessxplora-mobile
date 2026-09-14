import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/** Minimal storefront doc so mobile vendor accounts can use Dashboard / profile-edit. */
export async function ensureVendorDoc(input: {
  uid: string;
  businessName?: string;
  photoURL?: string;
}): Promise<void> {
  const ref = doc(db, 'vendors', input.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const name = input.businessName?.trim() || 'My business';
  await setDoc(ref, {
    ownerId: input.uid,
    businessName: name,
    description: '',
    category: [],
    categories: [],
    images: {
      logo: input.photoURL?.trim() || '',
      cover: '',
    },
    location: { country: '', city: '', area: '' },
    contact: {},
    isActive: true,
    verified: false,
    foundingMember: false,
    showEmailPublic: false,
    showPhonePublic: false,
    showWhatsappPublic: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
