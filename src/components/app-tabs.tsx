import Ionicons from '@expo/vector-icons/Ionicons';
import {
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChrome } from '@/lib/chrome';

function HidingTabBar(props: BottomTabBarProps) {
  const { tabBarVisible } = useChrome();
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(tabBarVisible ? 0 : 120, { duration: 220 });
  }, [tabBarVisible, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents={tabBarVisible ? 'auto' : 'none'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
        style,
      ]}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

/** Change this number to resize every bottom-tab icon. */
const TAB_ICON_SIZE = 22;

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();
  const tabBarHeight =
    50 + Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 0);

  return (
    <Tabs
      tabBar={(props) => <HidingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // Hide the label
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.backgroundElement,
          borderTopWidth: 0,
          borderTopColor: colors.backgroundSelected,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
      }}
    >
      <Tabs.Screen name='index' options={{ href: null }} />
      <Tabs.Screen name='listing' options={{ href: null }} />
      <Tabs.Screen name='category' options={{ href: null }} />
      <Tabs.Screen name='vendor' options={{ href: null }} />
      <Tabs.Screen
        name='explore'
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Ionicons name='search-outline' size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='favorites'
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => (
            <Ionicons name='heart-outline' size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='cart'
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => (
            <Ionicons name='cart-outline' size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name='person-circle-outline' size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 9,
    fontWeight: '600',
  },
});
