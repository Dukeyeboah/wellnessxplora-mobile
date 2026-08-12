import { getAuth } from 'firebase/auth';

import { app } from '@/lib/firebase-app';

/** Browser Auth uses built-in web persistence (localStorage / IndexedDB). */
export const auth = getAuth(app);
