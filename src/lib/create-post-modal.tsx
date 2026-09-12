import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { FeedCreateComposer } from '@/components/feed-create-composer';
import { fetchIsAdmin } from '@/lib/admin-auth';
import { useAuth } from '@/lib/auth-context';
import type { PostAuthorType } from '@/lib/feed-posts';
import { notifyFeedChanged } from '@/lib/feed-posts';
import { useSignInModal } from '@/lib/sign-in-modal';
import { fetchVendorProfileDoc } from '@/lib/user-profile';

type CreatePostContextValue = {
  openCreatePost: () => void;
};

const CreatePostContext = createContext<CreatePostContextValue | null>(null);

export function CreatePostProvider({ children }: { children: ReactNode }) {
  const { user, userRole, userProfile } = useAuth();
  const { showSignInModal } = useSignInModal();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhotoURL, setVendorPhotoURL] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const isVendor = userRole === 'vendor';
  const canCreate = Boolean(user) && (isVendor || isAdmin);

  const authorType: PostAuthorType = isAdmin && !isVendor ? 'wellnessxplora' : 'vendor';
  const authorName =
    authorType === 'wellnessxplora'
      ? 'WellnessXplora'
      : vendorName || userProfile?.name || user?.displayName || 'Vendor';
  const authorPhoto =
    authorType === 'wellnessxplora' ? undefined : vendorPhotoURL || userProfile?.photoURL;

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setVendorName('');
      setVendorPhotoURL('');
      return;
    }
    void fetchIsAdmin(user.uid).then(setIsAdmin);
    if (userRole === 'vendor') {
      void fetchVendorProfileDoc(user.uid).then((vendor) => {
        if (!vendor) return;
        setVendorName(vendor.businessName || userProfile?.name || '');
        setVendorPhotoURL(vendor.logoUrl || userProfile?.photoURL || '');
      });
    }
  }, [user, userRole, userProfile?.name, userProfile?.photoURL]);

  const openCreatePost = useCallback(() => {
    if (!user) {
      showSignInModal('Sign in with a vendor or admin account to create posts.');
      return;
    }
    if (!canCreate) {
      showSignInModal(
        'Only vendors and WellnessXplora editors can publish posts. Log in with a creator account to share.',
      );
      return;
    }
    setOpen(true);
  }, [user, canCreate, showSignInModal]);

  const value = useMemo(() => ({ openCreatePost }), [openCreatePost]);

  return (
    <CreatePostContext.Provider value={value}>
      {children}
      {user && canCreate ? (
        <FeedCreateComposer
          key={refreshKey}
          visible={open}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            setRefreshKey((k) => k + 1);
            notifyFeedChanged();
          }}
          authorType={authorType}
          authorName={authorName}
          authorPhotoURL={authorPhoto}
          vendorId={isVendor ? user.uid : undefined}
        />
      ) : null}
    </CreatePostContext.Provider>
  );
}

export function useCreatePost() {
  const ctx = useContext(CreatePostContext);
  if (!ctx) {
    return { openCreatePost: () => {} };
  }
  return ctx;
}
