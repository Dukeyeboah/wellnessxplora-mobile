import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

import { SignInRequiredModal } from '@/components/sign-in-required-modal';
import { registerSignInModalHandler } from '@/lib/require-auth';

type SignInModalContextValue = {
  showSignInModal: (message: string) => void;
};

const SignInModalContext = createContext<SignInModalContextValue | null>(null);

export function SignInModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const showSignInModal = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    setVisible(true);
  }, []);

  useLayoutEffect(() => {
    registerSignInModalHandler(showSignInModal);
    return () => registerSignInModalHandler(null);
  }, [showSignInModal]);

  const value = useMemo(() => ({ showSignInModal }), [showSignInModal]);

  return (
    <SignInModalContext.Provider value={value}>
      {children}
      <SignInRequiredModal
        visible={visible}
        message={message}
        onClose={() => setVisible(false)}
      />
    </SignInModalContext.Provider>
  );
}

export function useSignInModal() {
  const ctx = useContext(SignInModalContext);
  if (!ctx) {
    return { showSignInModal: () => {} };
  }
  return ctx;
}
