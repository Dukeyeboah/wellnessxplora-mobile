import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountScrollScreen } from '@/components/account-scroll-screen';
import { ThemedText } from '@/components/themed-text';
import { VendorTrustBadges } from '@/components/vendor-trust-badges';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  approveVerification,
  denyVerification,
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminVendors,
  fetchAllVerifications,
  isPendingVerificationStatus,
  type AdminStats,
  type AdminUserRow,
  type AdminVendorRow,
  type AdminVerificationRow,
} from '@/lib/admin';
import { fetchIsAdmin } from '@/lib/admin-auth';
import { getCategoryBySlug } from '@/lib/explore-categories';

const ADMIN_TABS = [
  'overview',
  'users',
  'vendors',
  'verification',
  'batch',
  'posts',
  'tools',
] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

function isAdminTab(value: string): value is AdminTab {
  return (ADMIN_TABS as readonly string[]).includes(value);
}

type UserFilter = 'all' | 'explorer' | 'vendor';

const TAB_ROWS: { id: AdminTab; label: string }[][] = [
  [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'verification', label: 'Verification' },
  ],
  [
    { id: 'batch', label: 'Batch import' },
    { id: 'posts', label: 'Posts' },
    { id: 'tools', label: 'Tools' },
  ],
];

function verificationStatusLabel(status: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function verificationStatusStyle(status: string) {
  if (status === 'approved') return { bg: '#D1FAE5', text: '#047857' };
  if (status === 'rejected') return { bg: '#FEE2E2', text: '#B42318' };
  return { bg: '#FEF3C7', text: '#B45309' };
}

function formatVerificationDate(date?: Date): string | null {
  if (!date) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function OverviewStatCard({
  label,
  value,
  theme,
  onPress,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.overviewCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.overviewValue}>{value}</ThemedText>
      {onPress ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.overviewHint}>
          Tap for details
        </ThemedText>
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

function UserCard({
  row,
  theme,
  onManage,
}: {
  row: AdminUserRow;
  theme: ReturnType<typeof useTheme>;
  onManage: () => void;
}) {
  return (
    <View style={[styles.vendorStyleCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardBannerWrap}>
        {row.bannerURL ? (
          <Image source={{ uri: row.bannerURL }} style={styles.cardBanner} contentFit="cover" />
        ) : (
          <View style={[styles.cardBanner, styles.cardBannerPlaceholder]} />
        )}
      </View>
      <View style={styles.cardBody}>
        {row.photoURL ? (
          <Image source={{ uri: row.photoURL }} style={styles.cardAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.cardAvatar, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">{(row.name || row.email || '?').charAt(0).toUpperCase()}</ThemedText>
          </View>
        )}
        <ThemedText type="smallBold" numberOfLines={1} style={styles.cardTitle}>
          {row.name || row.email || '—'}
        </ThemedText>
        {row.email ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {row.email}
          </ThemedText>
        ) : null}
        <View style={styles.badgeRow}>
          <View style={[styles.roleBadge, row.role === 'vendor' ? styles.badgeVendor : styles.badgeExplorer]}>
            <ThemedText type="small" style={styles.roleBadgeText}>
              {row.role}
            </ThemedText>
          </View>
          {row.authProvider ? (
            <View style={[styles.roleBadge, styles.badgeMuted]}>
              <ThemedText type="small" style={styles.roleBadgeText}>
                {row.authProvider === 'email' ? 'Email' : row.authProvider}
              </ThemedText>
            </View>
          ) : null}
        </View>
        {row.location ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {row.location}
          </ThemedText>
        ) : null}
        <Pressable onPress={onManage} style={[styles.manageBtn, { borderColor: theme.backgroundSelected }]}>
          <Ionicons name="settings-outline" size={14} color={theme.text} />
          <ThemedText type="smallBold">Manage</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function VendorCard({
  row,
  theme,
  onManage,
}: {
  row: AdminVendorRow;
  theme: ReturnType<typeof useTheme>;
  onManage: () => void;
}) {
  const categoryLine = row.categories
    .map((slug) => getCategoryBySlug(slug)?.title ?? slug)
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.vendorStyleCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardBannerWrap}>
        {row.coverUrl ? (
          <Image source={{ uri: row.coverUrl }} style={styles.cardBanner} contentFit="cover" />
        ) : (
          <View style={[styles.cardBanner, styles.cardBannerPlaceholder]} />
        )}
      </View>
      <View style={styles.cardBody}>
        {row.logoUrl ? (
          <Image source={{ uri: row.logoUrl }} style={styles.cardAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.cardAvatar, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">{(row.businessName || '?').charAt(0).toUpperCase()}</ThemedText>
          </View>
        )}
        <View style={styles.nameRow}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.cardTitleFlex}>
            {row.businessName}
          </ThemedText>
          <VendorTrustBadges verified={row.verified} foundingMember={row.foundingMember} size="sm" />
        </View>
        <View style={styles.ownerRow}>
          {row.ownerPhotoURL ? (
            <Image source={{ uri: row.ownerPhotoURL }} style={styles.ownerAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.ownerAvatar, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.ownerName}>
            {row.ownerName || row.ownerEmail || '—'}
          </ThemedText>
        </View>
        {categoryLine ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {categoryLine}
          </ThemedText>
        ) : null}
        <Pressable onPress={onManage} style={[styles.manageBtn, { borderColor: theme.backgroundSelected }]}>
          <Ionicons name="cube-outline" size={14} color={theme.text} />
          <ThemedText type="smallBold">Manage</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const { user, loading: authLoading } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const navigationReady = rootNavigationState?.key != null;
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [userSearch, setUserSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [vendors, setVendors] = useState<AdminVendorRow[]>([]);
  const [verifications, setVerifications] = useState<AdminVerificationRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && isAdminTab(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const load = useCallback(async () => {
    if (!user) return;
    const admin = await fetchIsAdmin(user.uid);
    setIsAdmin(admin);
    if (!admin) {
      setLoading(false);
      return;
    }
    const [s, u, v, allVerifications] = await Promise.all([
      fetchAdminStats(),
      fetchAdminUsers(),
      fetchAdminVendors(),
      fetchAllVerifications(),
    ]);
    setStats(s);
    setUsers(u);
    setVendors(v);
    setVerifications(allVerifications);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!navigationReady || authLoading) return;
    if (!user) {
      router.replace('/explore');
      return;
    }
    void load();
  }, [user, authLoading, navigationReady, load, router]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userFilter !== 'all' && u.role !== userFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, userFilter, userSearch]);

  const filteredVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.businessName.toLowerCase().includes(q) ||
        (v.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        (v.ownerName?.toLowerCase().includes(q) ?? false) ||
        v.id.toLowerCase().includes(q),
    );
  }, [vendors, vendorSearch]);

  const pendingCount = useMemo(
    () => verifications.filter((row) => isPendingVerificationStatus(row.status)).length,
    [verifications],
  );

  const onApprove = (vendorId: string) => {
    setBusy(vendorId);
    void approveVerification(vendorId)
      .then(load)
      .catch((err) => Alert.alert('Failed', err instanceof Error ? err.message : 'Try again.'))
      .finally(() => setBusy(null));
  };

  const onDeny = (row: AdminVerificationRow) => {
    Alert.prompt('Deny verification', 'Reason (optional)', (reason) => {
      setBusy(row.vendorId);
      void denyVerification(row.vendorId, reason ?? '')
        .then(load)
        .catch((err) => Alert.alert('Failed', err instanceof Error ? err.message : 'Try again.'))
        .finally(() => setBusy(null));
    });
  };

  if (!navigationReady || authLoading || loading) {
    return (
      <AccountScrollScreen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </AccountScrollScreen>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <AccountScrollScreen>
        <ThemedText type="smallBold">Admin access required</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Your account is not in the admins collection.
        </ThemedText>
        <Pressable onPress={() => router.replace('/explore')} style={{ marginTop: Spacing.three }}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            Back to Explore
          </ThemedText>
        </Pressable>
      </AccountScrollScreen>
    );
  }

  return (
    <AccountScrollScreen
      headerRight={
        <ThemedText type="smallBold" style={styles.headerAdminLabel}>
          Admin
        </ThemedText>
      }>
      <View style={styles.headerActions}>
        <Pressable
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
          style={[styles.headerBtn, { borderColor: theme.backgroundSelected }]}>
          <Ionicons name="refresh-outline" size={12} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.headerBtnLabel}>
            Refresh
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/explore')}
          style={[styles.headerBtn, { borderColor: theme.backgroundSelected }]}>
          <Ionicons name="home-outline" size={12} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.headerBtnLabel}>
            Back to site
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.tabGrid, { backgroundColor: theme.backgroundSelected }]}>
        {TAB_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tabGridRow}>
            {row.map((t) => {
              const active = tab === t.id;
              const badge =
                t.id === 'verification' && pendingCount > 0 ? ` (${pendingCount})` : '';
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[
                    styles.tabCell,
                    active && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: active ? theme.text : theme.textSecondary,
                      fontSize: 11,
                      textAlign: 'center',
                    }}>
                    {t.label}
                    {badge}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.four, gap: Spacing.three }}>
        {tab === 'overview' && stats ? (
          <>
            {(
              [
                { label: 'Total users', value: stats.totalUsers },
                { label: 'Explorers', value: stats.explorers },
                { label: 'Vendors (role)', value: stats.vendors },
                { label: 'Vendor profiles', value: stats.vendorProfiles },
                { label: 'Verified vendors', value: stats.verifiedVendors },
                { label: 'Pending verification', value: stats.pendingVerifications, jumpTab: 'verification' as const },
                { label: 'Active listings', value: stats.activeListings },
                { label: 'Saved vendors (bookmarks)', value: stats.totalBookmarks },
              ] as const
            ).map((item) => (
              <OverviewStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                theme={theme}
                onPress={
                  'jumpTab' in item && item.jumpTab
                    ? () => setTab(item.jumpTab)
                    : undefined
                }
              />
            ))}
            <View style={[styles.mixCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.mixHeader}>
                <Ionicons name="bar-chart-outline" size={18} color={theme.tint} />
                <ThemedText type="smallBold">User mix</ThemedText>
              </View>
              <View style={[styles.mixBar, { backgroundColor: theme.backgroundSelected }]}>
                {stats.totalUsers > 0 ? (
                  <>
                    <View
                      style={[
                        styles.mixSegmentExplorer,
                        { width: `${(stats.explorers / stats.totalUsers) * 100}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.mixSegmentVendor,
                        { width: `${(stats.vendors / stats.totalUsers) * 100}%` },
                      ]}
                    />
                  </>
                ) : null}
              </View>
              <View style={styles.mixLegend}>
                <ThemedText type="small" themeColor="textSecondary">
                  Explorers {stats.explorers}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Vendors {stats.vendors}
                </ThemedText>
              </View>
            </View>
          </>
        ) : null}

        {tab === 'users' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterRow, styles.filterRowCentered]}>
              {(['all', 'explorer', 'vendor'] as const).map((f) => {
                const active = userFilter === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setUserFilter(f)}
                    style={[
                      styles.filterPill,
                      { backgroundColor: active ? theme.tint : theme.backgroundElement },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontSize: 11 }}>
                      {f === 'all' ? 'All users' : `${f}s`}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
              <TextInput
                value={userSearch}
                onChangeText={setUserSearch}
                placeholder="Search users…"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
            {filteredUsers.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No users match this filter.
              </ThemedText>
            ) : (
              filteredUsers.map((row) => (
                <UserCard
                  key={row.id}
                  row={row}
                  theme={theme}
                  onManage={() =>
                    router.push(`/admin-manage/${row.id}?from=admin-users` as never)
                  }
                />
              ))
            )}
          </>
        ) : null}

        {tab === 'vendors' ? (
          <>
            <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
              <TextInput
                value={vendorSearch}
                onChangeText={setVendorSearch}
                placeholder="Search vendors…"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
            {filteredVendors.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No vendors found.
              </ThemedText>
            ) : (
              filteredVendors.map((row) => (
                <VendorCard
                  key={row.id}
                  row={row}
                  theme={theme}
                  onManage={() =>
                    router.push(`/admin-manage/${row.id}?from=admin-vendors` as never)
                  }
                />
              ))
            )}
          </>
        ) : null}

        {tab === 'verification' ? (
          <>
            {verifications.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No verification applications yet.
              </ThemedText>
            ) : (
              verifications.map((row) => {
                const statusStyle = verificationStatusStyle(row.status);
                const isPending = isPendingVerificationStatus(row.status);
                const submitted = formatVerificationDate(row.submittedAt);
                const reviewed = formatVerificationDate(row.reviewedAt);
                return (
                  <View
                    key={row.vendorId}
                    style={[styles.rowCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.verificationTop}>
                      <ThemedText type="smallBold" style={styles.verificationTitle}>
                        {row.businessName}
                      </ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <ThemedText type="small" style={{ color: statusStyle.text, fontSize: 11 }}>
                          {verificationStatusLabel(row.status)}
                        </ThemedText>
                      </View>
                    </View>
                    {row.ownerEmail ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {row.ownerEmail}
                      </ThemedText>
                    ) : null}
                    {submitted ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Submitted {submitted}
                      </ThemedText>
                    ) : null}
                    {reviewed ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Reviewed {reviewed}
                      </ThemedText>
                    ) : null}
                    {row.denialReason && row.status === 'rejected' ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Reason: {row.denialReason}
                      </ThemedText>
                    ) : null}
                    {isPending ? (
                      <View style={styles.actions}>
                        <Pressable
                          disabled={busy === row.vendorId}
                          onPress={() => onApprove(row.vendorId)}
                          style={[styles.approveBtn, { backgroundColor: theme.tint }]}>
                          <ThemedText type="smallBold" style={styles.approveLabel}>
                            Approve
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          disabled={busy === row.vendorId}
                          onPress={() => onDeny(row)}
                          style={[styles.denyBtn, { borderColor: theme.backgroundSelected }]}>
                          <ThemedText type="smallBold" style={{ color: '#B42318' }}>
                            Deny
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        ) : null}

        {tab === 'batch' || tab === 'posts' || tab === 'tools' ? (
          <View style={[styles.placeholderCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.placeholderTitle}>
              {tab === 'batch' ? 'Batch product import' : tab === 'posts' ? 'Posts' : 'Admin tools'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {tab === 'batch'
                ? 'Bulk listing import is available on the web admin dashboard for now.'
                : tab === 'posts'
                  ? 'Post management is available on the web admin dashboard for now.'
                  : 'Category migrations and seeding tools are available on the web admin dashboard for now.'}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </AccountScrollScreen>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: Spacing.six, alignItems: 'center' },
  headerAdminLabel: { fontSize: 14, fontWeight: '600' },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  headerBtnLabel: { fontSize: 11, color: '#6B6F66' },
  tabGrid: { borderRadius: 16, padding: Spacing.two, gap: Spacing.one, marginBottom: Spacing.three },
  tabGridRow: { flexDirection: 'row', gap: Spacing.one },
  tabCell: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  overviewCard: { borderRadius: 16, padding: Spacing.four, gap: Spacing.one },
  overviewValue: { fontSize: 32, fontWeight: '700' },
  overviewHint: { marginTop: Spacing.one },
  mixCard: { borderRadius: 16, padding: Spacing.four, gap: Spacing.three },
  mixHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mixBar: { flexDirection: 'row', height: 10, borderRadius: 999, overflow: 'hidden' },
  mixSegmentExplorer: { backgroundColor: '#38BDF8', height: '100%' },
  mixSegmentVendor: { backgroundColor: '#8B5CF6', height: '100%' },
  mixLegend: { flexDirection: 'row', gap: Spacing.four },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: Spacing.one },
  filterRow: { gap: Spacing.two },
  filterRowCentered: { flexGrow: 1, justifyContent: 'center' },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
  },
  vendorStyleCard: { borderRadius: 16, overflow: 'hidden' },
  cardBannerWrap: { height: 80 },
  cardBanner: { width: '100%', height: '100%' },
  cardBannerPlaceholder: { backgroundColor: '#E8E4DF' },
  cardBody: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.one },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -28,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardTitle: { marginTop: Spacing.one },
  cardTitleFlex: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  ownerAvatar: { width: 18, height: 18, borderRadius: 9 },
  ownerName: { flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 2 },
  roleBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, textTransform: 'capitalize' },
  badgeExplorer: { backgroundColor: '#E0F2FE' },
  badgeVendor: { backgroundColor: '#EDE9FE' },
  badgeMuted: { backgroundColor: '#F3F4F6' },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
  rowCard: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  verificationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  verificationTitle: { flex: 1, minWidth: 0 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  approveBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  approveLabel: { color: '#FFFFFF' },
  denyBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  placeholderCard: { borderRadius: 16, padding: Spacing.four, gap: Spacing.two },
  placeholderTitle: { fontSize: 16 },
});
