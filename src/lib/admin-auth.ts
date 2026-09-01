import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export async function fetchIsAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists();
}
