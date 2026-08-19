import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const HEADER_SHOW_Y = 10;
const TAB_BAR_IDLE_MS = 320;

type ChromeContextValue = {
  headerVisible: boolean;
  tabBarVisible: boolean;
  onScrollOffset: (y: number) => void;
  onScrollBegin: () => void;
  onScrollEnd: () => void;
  resetChrome: () => void;
};

const ChromeContext = createContext<ChromeContextValue | null>(null);

export function ChromeVisibilityProvider({ children }: { children: ReactNode }) {
  const [headerVisible, setHeaderVisible] = useState(true);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdle = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const onScrollOffset = useCallback(
    (y: number) => {
      setHeaderVisible(y <= HEADER_SHOW_Y);
      setTabBarVisible(false);
      clearIdle();
      idleTimer.current = setTimeout(() => {
        setTabBarVisible(true);
      }, TAB_BAR_IDLE_MS);
    },
    [clearIdle],
  );

  const onScrollBegin = useCallback(() => {
    setTabBarVisible(false);
    clearIdle();
  }, [clearIdle]);

  const onScrollEnd = useCallback(() => {
    clearIdle();
    setTabBarVisible(true);
  }, [clearIdle]);

  const resetChrome = useCallback(() => {
    clearIdle();
    setHeaderVisible(true);
    setTabBarVisible(true);
  }, [clearIdle]);

  useEffect(() => () => clearIdle(), [clearIdle]);

  const value = useMemo(
    () => ({
      headerVisible,
      tabBarVisible,
      onScrollOffset,
      onScrollBegin,
      onScrollEnd,
      resetChrome,
    }),
    [
      headerVisible,
      tabBarVisible,
      onScrollOffset,
      onScrollBegin,
      onScrollEnd,
      resetChrome,
    ],
  );

  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useChrome() {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    return {
      headerVisible: true,
      tabBarVisible: true,
      onScrollOffset: () => {},
      onScrollBegin: () => {},
      onScrollEnd: () => {},
      resetChrome: () => {},
    };
  }
  return ctx;
}

/** Attach to a vertical ScrollView / FlatList to drive header + tab bar chrome. */
export function useScrollChrome() {
  const { onScrollOffset, onScrollBegin, onScrollEnd } = useChrome();

  return {
    scrollEventThrottle: 16 as const,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollOffset(e.nativeEvent.contentOffset.y);
    },
    onScrollBeginDrag: onScrollBegin,
    onMomentumScrollBegin: onScrollBegin,
    onScrollEndDrag: onScrollEnd,
    onMomentumScrollEnd: onScrollEnd,
  };
}
