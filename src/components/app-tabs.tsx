import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import {
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileMenuSheet } from '@/components/profile-menu-sheet';
import { useAuth } from '@/lib/auth-context';
import { useChrome } from '@/lib/chrome';
import { useCreatePost } from '@/lib/create-post-modal';

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
const TAB_ICON_SIZE = 20;
const TAB_AVATAR_SIZE = 28;

function TabIcon({
  name,
  color,
  focused,
  tint,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  tint: string;
}) {
  return (
    <View
      style={[
        styles.tabIconWrap,
        focused && { backgroundColor: tint },
      ]}>
      <Ionicons
        name={name}
        size={TAB_ICON_SIZE}
        color={focused ? '#FFFFFF' : color}
      />
    </View>
  );
}

function CreateTabIcon({ tint }: { tint: string }) {
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name="add" size={26} color={tint} />
    </View>
  );
}

function ProfileTabIcon({
  color,
  focused,
  tint,
  photoUrl,
}: {
  color: string;
  focused: boolean;
  tint: string;
  photoUrl?: string;
}) {
  if (photoUrl) {
    return (
      <View
        style={[
          styles.tabIconWrap,
          focused && { backgroundColor: tint },
        ]}>
        <Image
          source={{ uri: photoUrl }}
          style={[
            styles.tabAvatar,
            focused && styles.tabAvatarFocused,
          ]}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <TabIcon
      name="person-circle-outline"
      color={color}
      focused={focused}
      tint={tint}
    />
  );
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { openCreatePost } = useCreatePost();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const tabBarHeight =
    50 + Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 0);

  const profilePhoto =
    userProfile?.photoURL || user?.photoURL || undefined;

  return (
    <>
    <Tabs
      tabBar={(props) => <HidingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
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
      <Tabs.Screen name='post' options={{ href: null }} />
      <Tabs.Screen name='dashboard' options={{ href: null }} />
      <Tabs.Screen name='profile-edit' options={{ href: null }} />
      <Tabs.Screen name='admin' options={{ href: null }} />
      <Tabs.Screen name='admin-manage' options={{ href: null }} />
      <Tabs.Screen name='cart' options={{ href: null }} />
      <Tabs.Screen
        name='discover'
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'compass' : 'compass-outline'}
              color={color}
              focused={focused}
              tint={colors.tint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='explore'
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="search-outline"
              color={color}
              focused={focused}
              tint={colors.tint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='create'
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            openCreatePost();
          },
        }}
        options={{
          title: 'Create',
          tabBarIcon: () => <CreateTabIcon tint={colors.tint} />,
        }}
      />
      <Tabs.Screen
        name='favorites'
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'bookmark' : 'bookmark-outline'}
              color={color}
              focused={focused}
              tint={colors.tint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        listeners={{
          tabPress: (e) => {
            if (user) {
              e.preventDefault();
              setProfileMenuOpen(true);
            }
          },
        }}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <ProfileTabIcon
              color={color}
              focused={focused}
              tint={colors.tint}
              photoUrl={user ? profilePhoto : undefined}
            />
          ),
        }}
      />
    </Tabs>
    <ProfileMenuSheet visible={profileMenuOpen} onClose={() => setProfileMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 9,
    fontWeight: '600',
  },
  tabIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabAvatar: {
    width: TAB_AVATAR_SIZE,
    height: TAB_AVATAR_SIZE,
    borderRadius: TAB_AVATAR_SIZE / 2,
  },
  tabAvatarFocused: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
