import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { CreateChoiceSheet } from '@/components/create-choice-sheet';
import { FeedCreateComposer } from '@/components/feed-create-composer';
import { ListingEditorSheet } from '@/components/listing-editor-sheet';
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
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhotoURL, setVendorPhotoURL] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const isVendor = userRole === 'vendor';
  const canCreatePost = Boolean(user) && (isVendor || isAdmin);
  const canCreateProduct = Boolean(user) && isVendor;

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
      showSignInModal(
        'Sign in to create posts. Vendors and service providers can also list products from here.',
      );
      return;
    }
    setChoiceOpen(true);
  }, [user, showSignInModal]);

  const onChoosePost = useCallback(() => {
    if (!canCreatePost) return;
    setChoiceOpen(false);
    setComposerOpen(true);
  }, [canCreatePost]);

  const onChooseProduct = useCallback(() => {
    if (!canCreateProduct) return;
    setChoiceOpen(false);
    setProductOpen(true);
  }, [canCreateProduct]);

  const value = useMemo(() => ({ openCreatePost }), [openCreatePost]);

  return (
    <CreatePostContext.Provider value={value}>
      {children}
      <CreateChoiceSheet
        visible={choiceOpen}
        canCreatePost={canCreatePost}
        canCreateProduct={canCreateProduct}
        onClose={() => setChoiceOpen(false)}
        onChoosePost={onChoosePost}
        onChooseProduct={onChooseProduct}
      />
      {canCreatePost ? (
        <FeedCreateComposer
          key={refreshKey}
          visible={composerOpen}
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            setRefreshKey((k) => k + 1);
            notifyFeedChanged();
          }}
          authorType={authorType}
          authorName={authorName}
          authorPhotoURL={authorPhoto}
          vendorId={user?.uid}
        />
      ) : null}
      {canCreateProduct && user ? (
        <ListingEditorSheet
          visible={productOpen}
          vendorId={user.uid}
          listing={null}
          onClose={() => setProductOpen(false)}
          onSaved={() => setProductOpen(false)}
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
