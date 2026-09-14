import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AccountScrollScreen } from '@/components/account-scroll-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  fetchFollowerConnections,
  fetchFollowingConnections,
  type ConnectionVendor,
} from '@/lib/vendor-follows';

type Tab = 'following' | 'followers';

export default function ConnectionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const isVendor = userRole === 'vendor';

  const [tab, setTab] = useState<Tab>('following');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState<ConnectionVendor[]>([]);
  const [followers, setFollowers] = useState<ConnectionVendor[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [followingRows, followerRows] = await Promise.all([
        fetchFollowingConnections(user.uid, isVendor),
        isVendor ? fetchFollowerConnections(user.uid) : Promise.resolve([]),
      ]);
      setFollowing(followingRows);
      setFollowers(followerRows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isVendor]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
  }, [user, load]);

  if (!user) {
    return (
      <AccountScrollScreen title="WellnessXplora" headerRight={<HeaderLabel />}>
        <ThemedView type="backgroundElement" style={[styles.emptyCard, Shadows.card]}>
          <ThemedText type="smallBold">Sign in to see connections</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyCopy}>
            Connect with vendors on Discover and Explore, then manage them here.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile?auth=login' as never)}
            style={[styles.primaryBtn, { backgroundColor: theme.tint }]}>
            <ThemedText type="smallBold" style={styles.primaryLabel}>
              Sign in
            </ThemedText>
          </Pressable>
        </ThemedView>
      </AccountScrollScreen>
    );
  }

  const rows = tab === 'following' ? following : followers;

  return (
    <AccountScrollScreen
      title="WellnessXplora"
      headerRight={<HeaderLabel />}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      sticky={
        <View style={styles.tabs}>
          {(
            [
              { id: 'following' as const, label: `Following (${following.length})` },
              ...(isVendor
                ? [{ id: 'followers' as const, label: `Followers (${followers.length})` }]
                : []),
            ] as { id: Tab; label: string }[]
          ).map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? theme.tint : theme.backgroundElement,
                    borderColor: active ? theme.tint : theme.backgroundSelected,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: active ? '#FFFFFF' : theme.text, fontSize: 13 }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      }>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.tint} />
        </View>
      ) : rows.length === 0 ? (
        <ThemedView type="backgroundElement" style={[styles.emptyCard, Shadows.card]}>
          <Ionicons name="people-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="smallBold">
            {tab === 'following' ? 'No connections yet' : 'No followers yet'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyCopy}>
            {tab === 'following'
              ? 'Tap Connect on a vendor profile or Discover post to follow them.'
              : 'When others connect to your storefront, they appear here. Mutual means you follow each other.'}
          </ThemedText>
          {tab === 'following' ? (
            <Pressable
              onPress={() => router.push('/discover' as never)}
              style={[styles.primaryBtn, { backgroundColor: theme.tint }]}>
              <ThemedText type="smallBold" style={styles.primaryLabel}>
                Browse Discover
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      ) : (
        <View style={styles.list}>
          {rows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/vendor/${row.id}` as never)}
              style={({ pressed }) => [
                styles.row,
                Shadows.card,
                {
                  backgroundColor: theme.backgroundElement,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              {row.avatarUrl ? (
                <Image source={{ uri: row.avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name="person" size={22} color={theme.textSecondary} />
                </View>
              )}
              <View style={styles.rowCopy}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
                    {row.name}
                  </ThemedText>
                  {row.verified ? (
                    <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
                  ) : null}
                </View>
                {row.mutual ? (
                  <View style={[styles.mutualChip, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="swap-horizontal" size={12} color="#047857" />
                    <ThemedText type="small" style={styles.mutualLabel}>
                      Mutual
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {tab === 'following' ? 'You connected' : 'Connected to you'}
                  </ThemedText>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}

      {!isVendor ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
          Become a vendor to receive followers and see mutual connections both ways.
        </ThemedText>
      ) : null}
    </AccountScrollScreen>
  );
}

function HeaderLabel() {
  return (
    <ThemedText type="smallBold" style={{ fontSize: 15 }}>
      Connections
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  tabChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  loading: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyCard: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyCopy: {
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: Spacing.two,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
  },
  mutualChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mutualLabel: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '600',
  },
  footerHint: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
