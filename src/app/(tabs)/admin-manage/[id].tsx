import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { AccountScrollScreen } from '@/components/account-scroll-screen';
import { CategorySelectField } from '@/components/category-select-field';
import {
  ContactToggle,
  FormActions,
  FormCard,
  FormField,
  FormInput,
  FormSectionTitle,
} from '@/components/form-primitives';
import { VendorProfileHeaderEditor } from '@/components/vendor-profile-header-editor';
import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { fetchIsAdmin } from '@/lib/admin-auth';
import { getCategoryBySlug } from '@/lib/explore-categories';
import { db } from '@/lib/firebase';
import {
  uploadImageFromUri,
  userAvatarPath,
  vendorCoverPath,
  vendorLogoPath,
} from '@/lib/storage-upload';
import {
  fetchUserProfile,
  fetchVendorProfileDoc,
  updateExplorerProfile,
  updateVendorProfile,
  type UserLocation,
} from '@/lib/user-profile';
import {
  createEmptyListingDraft,
  createVendorListing,
  deleteVendorListing,
  fetchVendorListings,
  listingToDraftInput,
  updateVendorListing,
  type DashboardListing,
  type ListingDraftInput,
} from '@/lib/vendor-dashboard';

function splitCategories(slugs: string[]) {
  const primary = slugs[0] ?? '';
  const secondary = slugs.slice(1, 4);
  return { primary, secondary };
}

function mergeCategories(primary: string, secondary: string[]) {
  return [primary, ...secondary.filter((s) => s && s !== primary)].slice(0, 4);
}

export default function AdminManageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const targetId = typeof id === 'string' ? id : '';
  const { user, loading: authLoading } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const navigationReady = rootNavigationState?.key != null;

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<'explorer' | 'vendor'>('explorer');

  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([]);
  const [showEmailPublic, setShowEmailPublic] = useState(false);
  const [showPhonePublic, setShowPhonePublic] = useState(false);
  const [showWhatsappPublic, setShowWhatsappPublic] = useState(true);
  const [verified, setVerified] = useState(false);
  const [foundingMember, setFoundingMember] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState('');
  const [coverUri, setCoverUri] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<string | null>(null);

  const [listings, setListings] = useState<DashboardListing[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newListingTitle, setNewListingTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [editListing, setEditListing] = useState<DashboardListing | null>(null);
  const [editDraft, setEditDraft] = useState<ListingDraftInput | null>(null);
  const [savingListing, setSavingListing] = useState(false);

  const goBackToAdmin = useCallback(() => {
    const tab =
      from === 'admin-vendors'
        ? 'vendors'
        : from === 'admin-users'
          ? 'users'
          : 'overview';
    router.replace(`/admin?tab=${tab}` as never);
  }, [from, router]);

  const load = useCallback(async () => {
    if (!targetId) return;
    const profile = await fetchUserProfile(targetId);
    if (!profile) {
      setLoading(false);
      return;
    }
    setRole(profile.role);
    setUsername(profile.username ?? '');
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setBusinessName(profile.name);
    setEmail(profile.contact.email ?? profile.email);
    setPhone(profile.contact.phone ?? '');
    setWhatsapp(profile.contact.whatsapp ?? '');
    setArea(profile.location.area);
    setCity(profile.location.city);
    setCountry(profile.location.country || 'Ghana');
    setPhotoUri(profile.photoURL);
    setCoverUri(profile.bannerURL);
    setInterests(profile.interests);
    setContactPersonName(profile.name);

    if (profile.role === 'vendor') {
      const vendor = await fetchVendorProfileDoc(targetId);
      if (vendor) {
        setBusinessName(vendor.businessName);
        setDescription(vendor.description);
        setPhotoUri(vendor.logoUrl || profile.photoURL);
        setCoverUri(vendor.coverUrl);
        setContactPersonName(vendor.contact.contactPersonName ?? vendor.businessName);
        setShowEmailPublic(vendor.contact.showEmailPublic === true);
        setShowPhonePublic(vendor.contact.showPhonePublic === true);
        setShowWhatsappPublic(vendor.contact.showWhatsappPublic !== false);
        setVerified(vendor.verified);
        setFoundingMember(vendor.foundingMember);
        const split = splitCategories(vendor.categorySlugs);
        setPrimaryCategory(split.primary);
        setSecondaryCategories(split.secondary);
      }
      const vendorListings = await fetchVendorListings(targetId);
      setListings(vendorListings);
    }
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    if (!navigationReady || authLoading) return;
    if (!user) {
      router.replace('/explore');
      return;
    }
    void fetchIsAdmin(user.uid).then((admin) => {
      setIsAdmin(admin);
      setAdminChecked(true);
    if (!admin) {
      router.replace('/explore');
      return;
    }
      void load();
    });
  }, [user, authLoading, navigationReady, load, router]);

  const pickImage = async (kind: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
      aspect: kind === 'cover' ? [16, 9] : [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    if (kind === 'avatar') setPendingPhoto(result.assets[0].uri);
    else setPendingCover(result.assets[0].uri);
  };

  const onSave = async () => {
    if (!targetId) return;
    if (role === 'vendor' && !primaryCategory) {
      Alert.alert('Category required', 'Select a primary business category.');
      return;
    }
    setSaving(true);
    try {
      const location: UserLocation = { area, city, country };
      const contact = {
        email,
        phone,
        whatsapp,
        contactPersonName,
        showEmailPublic,
        showPhonePublic,
        showWhatsappPublic,
      };

      if (role === 'vendor') {
        let logoPath: string | undefined;
        let coverPath: string | undefined;
        if (pendingPhoto) logoPath = await uploadImageFromUri(vendorLogoPath(targetId), pendingPhoto);
        if (pendingCover) coverPath = await uploadImageFromUri(vendorCoverPath(targetId), pendingCover);
        await updateVendorProfile(targetId, targetId, {
          businessName,
          description,
          categorySlugs: mergeCategories(primaryCategory, secondaryCategories),
          location,
          contact,
          logoPath,
          coverPath,
        });
        await updateDoc(doc(db, 'vendors', targetId), {
          verified,
          foundingMember,
          updatedAt: serverTimestamp(),
        });
        if (username.trim()) {
          await updateDoc(doc(db, 'users', targetId), {
            username: username.trim().toLowerCase(),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        let photoPath: string | undefined;
        if (pendingPhoto) photoPath = await uploadImageFromUri(userAvatarPath(targetId), pendingPhoto);
        await updateExplorerProfile(targetId, {
          name: businessName.trim() || `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          interests,
          location,
          contact,
          photoURL: photoPath,
        });
        if (username.trim()) {
          await updateDoc(doc(db, 'users', targetId), {
            username: username.trim().toLowerCase(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      Alert.alert('Saved', 'User profile updated.', [{ text: 'OK', onPress: goBackToAdmin }]);
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmCreateListing = async () => {
    if (!newListingTitle.trim()) return;
    setCreating(true);
    try {
      const draft = createEmptyListingDraft();
      draft.title = newListingTitle.trim();
      await createVendorListing(targetId, draft);
      setCreateOpen(false);
      setNewListingTitle('');
      const vendorListings = await fetchVendorListings(targetId);
      setListings(vendorListings);
    } catch (err) {
      Alert.alert('Could not create listing', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  const openEditListing = (listing: DashboardListing) => {
    setEditListing(listing);
    setEditDraft(listingToDraftInput(listing));
  };

  const saveEditListing = async () => {
    if (!editListing || !editDraft) return;
    setSavingListing(true);
    try {
      await updateVendorListing(editListing.id, targetId, editDraft);
      setEditListing(null);
      setEditDraft(null);
      const vendorListings = await fetchVendorListings(targetId);
      setListings(vendorListings);
    } catch (err) {
      Alert.alert('Could not save listing', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSavingListing(false);
    }
  };

  const confirmDeleteListing = (listing: DashboardListing) => {
    Alert.alert('Delete listing', `Remove "${listing.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteVendorListing(listing.id, targetId)
            .then(() => fetchVendorListings(targetId))
            .then(setListings)
            .catch((err) =>
              Alert.alert('Could not delete', err instanceof Error ? err.message : 'Try again.'),
            );
        },
      },
    ]);
  };

  if (!navigationReady || authLoading || !adminChecked) {
    return (
      <AccountScrollScreen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </AccountScrollScreen>
    );
  }

  if (!user || !isAdmin) return null;

  const isVendor = role === 'vendor';
  const displayLogo = pendingPhoto ?? photoUri;
  const displayCover = pendingCover ?? coverUri;
  const pageTitle = isVendor ? businessName || 'Manage vendor' : businessName || 'Manage user';

  if (loading) {
    return (
      <AccountScrollScreen>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </AccountScrollScreen>
    );
  }

  return (
    <AccountScrollScreen>
      <Pressable onPress={goBackToAdmin} style={styles.backRow} hitSlop={12}>
        <Ionicons name="shield-outline" size={14} color={theme.tint} />
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          Back to admin
        </ThemedText>
      </Pressable>
      <ThemedText style={styles.pageTitle}>{pageTitle}</ThemedText>

      {isVendor ? (
        <VendorProfileHeaderEditor
          logoUri={displayLogo}
          coverUri={displayCover}
          onEditLogo={() => void pickImage('avatar')}
          onEditCover={() => void pickImage('cover')}
        />
      ) : (
        <VendorProfileHeaderEditor
          logoUri={displayLogo}
          coverUri={undefined}
          onEditLogo={() => void pickImage('avatar')}
        />
      )}

      {isVendor ? (
        <>
          <FormField label="Username">
            <FormInput value={username} onChangeText={setUsername} autoCapitalize="none" />
          </FormField>
          <FormField label="Business name">
            <FormInput value={businessName} onChangeText={setBusinessName} />
          </FormField>
          <CategorySelectField
            primarySlug={primaryCategory}
            secondarySlugs={secondaryCategories}
            onPrimaryChange={setPrimaryCategory}
            onSecondaryToggle={(slug) => {
              setSecondaryCategories((current) =>
                current.includes(slug)
                  ? current.filter((s) => s !== slug)
                  : current.length < 3
                    ? [...current, slug]
                    : current,
              );
            }}
          />
          <FormCard>
            <FormSectionTitle>Admin flags</FormSectionTitle>
            <View style={styles.switchRow}>
              <ThemedText type="small">Verified vendor</ThemedText>
              <Switch value={verified} onValueChange={setVerified} />
            </View>
            <View style={styles.switchRow}>
              <ThemedText type="small">Founding member</ThemedText>
              <Switch value={foundingMember} onValueChange={setFoundingMember} />
            </View>
          </FormCard>
          <FormSectionTitle>Location</FormSectionTitle>
          <FormField label="Address / area">
            <FormInput value={area} onChangeText={setArea} />
          </FormField>
          <FormField label="City">
            <FormInput value={city} onChangeText={setCity} />
          </FormField>
          <FormField label="Country">
            <FormInput value={country} onChangeText={setCountry} />
          </FormField>
          <FormField label="Description">
            <FormInput value={description} onChangeText={setDescription} multiline />
          </FormField>
          <FormCard>
            <FormSectionTitle>Contact details</FormSectionTitle>
            <FormField label="Contact person">
              <FormInput value={contactPersonName} onChangeText={setContactPersonName} />
            </FormField>
            <FormField label="Email">
              <FormInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FormField>
            <ContactToggle
              label="Show email on public profile"
              description=""
              value={showEmailPublic}
              onValueChange={setShowEmailPublic}
            />
            <FormField label="Phone">
              <FormInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </FormField>
            <ContactToggle
              label="Show phone on public profile"
              description=""
              value={showPhonePublic}
              onValueChange={setShowPhonePublic}
            />
            <FormField label="WhatsApp">
              <FormInput value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
            </FormField>
            <ContactToggle
              label="Show WhatsApp on public profile"
              description=""
              value={showWhatsappPublic}
              onValueChange={setShowWhatsappPublic}
            />
          </FormCard>

          <View style={styles.listingsHeader}>
            <View>
              <FormSectionTitle>Listings</FormSectionTitle>
              <ThemedText type="small" themeColor="textSecondary">
                {listings.length} listing{listings.length === 1 ? '' : 's'}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => {
                setNewListingTitle('');
                setCreateOpen(true);
              }}
              style={[styles.addListingBtn, { backgroundColor: theme.tint }]}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <ThemedText type="smallBold" style={styles.addBtnLabel}>
                Add listing
              </ThemedText>
            </Pressable>
          </View>
          {listings.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No listings yet.
            </ThemedText>
          ) : (
            listings.map((listing) => {
              const categoryLabel =
                listing.categoryTitle ??
                (listing.categorySlug
                  ? getCategoryBySlug(listing.categorySlug)?.title ?? listing.categorySlug
                  : '');
              return (
                <View
                  key={listing.id}
                  style={[styles.listingCard, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
                  {listing.imageUrl ? (
                    <Image
                      source={{ uri: listing.imageUrl }}
                      style={styles.listingImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.listingImage, { backgroundColor: theme.backgroundSelected }]} />
                  )}
                  <View style={styles.listingContent}>
                    <ThemedText type="smallBold" numberOfLines={2}>
                      {listing.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {listing.type} · {categoryLabel || 'Uncategorized'}
                    </ThemedText>
                    <View style={styles.listingActions}>
                      <Pressable
                        onPress={() => openEditListing(listing)}
                        style={[styles.listingActionBtn, { borderColor: theme.backgroundSelected }]}>
                        <Ionicons name="pencil-outline" size={12} color={theme.text} />
                        <ThemedText type="smallBold">Edit</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDeleteListing(listing)}
                        style={[styles.listingActionBtn, styles.listingDeleteBtn]}>
                        <Ionicons name="trash-outline" size={12} color="#B42318" />
                        <ThemedText type="smallBold" style={{ color: '#B42318' }}>
                          Delete
                        </ThemedText>
                      </Pressable>
                    </View>
                    {listing.isActive ? (
                      <View style={styles.liveBadge}>
                        <ThemedText type="small" style={styles.liveBadgeText}>
                          Live
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={styles.hiddenBadge}>
                        <ThemedText type="small" style={styles.hiddenBadgeText}>
                          Hidden
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </>
      ) : (
        <>
          <FormField label="Username">
            <FormInput value={username} onChangeText={setUsername} autoCapitalize="none" />
          </FormField>
          <FormField label="Display name">
            <FormInput value={businessName} onChangeText={setBusinessName} />
          </FormField>
          <FormField label="First name">
            <FormInput value={firstName} onChangeText={setFirstName} />
          </FormField>
          <FormField label="Last name">
            <FormInput value={lastName} onChangeText={setLastName} />
          </FormField>
          <FormSectionTitle>Location</FormSectionTitle>
          <FormField label="Area">
            <FormInput value={area} onChangeText={setArea} />
          </FormField>
          <FormField label="City">
            <FormInput value={city} onChangeText={setCity} />
          </FormField>
          <FormField label="Country">
            <FormInput value={country} onChangeText={setCountry} />
          </FormField>
          <FormField label="Email">
            <FormInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </FormField>
          <FormField label="Phone">
            <FormInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </FormField>
          <FormField label="WhatsApp">
            <FormInput value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
          </FormField>
        </>
      )}

      <FormActions onCancel={goBackToAdmin} onSave={() => void onSave()} saving={saving} />

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="smallBold" style={styles.modalTitle}>
              New listing
            </ThemedText>
            <FormField label="Title">
              <FormInput
                value={newListingTitle}
                onChangeText={setNewListingTitle}
                placeholder="Listing title"
              />
            </FormField>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCreateOpen(false)} style={styles.modalBtn}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable
                disabled={creating || !newListingTitle.trim()}
                onPress={() => void confirmCreateListing()}
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.tint }]}>
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                    Create
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(editListing && editDraft)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEditListing(null);
          setEditDraft(null);
        }}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setEditListing(null);
            setEditDraft(null);
          }}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}
            onPress={(e) => e.stopPropagation()}>
            {editDraft ? (
              <>
                <ThemedText type="smallBold" style={styles.modalTitle}>
                  Edit listing
                </ThemedText>
                <FormField label="Title">
                  <FormInput
                    value={editDraft.title}
                    onChangeText={(v) => setEditDraft({ ...editDraft, title: v })}
                  />
                </FormField>
                <FormField label="Description">
                  <FormInput
                    value={editDraft.description}
                    onChangeText={(v) => setEditDraft({ ...editDraft, description: v })}
                    multiline
                  />
                </FormField>
                <FormField label="Price">
                  <FormInput
                    value={editDraft.price}
                    onChangeText={(v) => setEditDraft({ ...editDraft, price: v })}
                    keyboardType="decimal-pad"
                  />
                </FormField>
                <View style={styles.switchRow}>
                  <ThemedText type="small">Active (visible in explore)</ThemedText>
                  <Switch
                    value={editDraft.isActive}
                    onValueChange={(v) => setEditDraft({ ...editDraft, isActive: v })}
                  />
                </View>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => editListing && confirmDeleteListing(editListing)}
                    style={styles.modalBtn}>
                    <ThemedText type="smallBold" style={{ color: '#B42318' }}>
                      Delete
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={savingListing}
                    onPress={() => void saveEditListing()}
                    style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.tint }]}>
                    {savingListing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                        Save
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AccountScrollScreen>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: Spacing.six, alignItems: 'center' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  pageTitle: { fontSize: 22, fontWeight: '600', marginBottom: Spacing.three },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  listingsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  addListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexShrink: 0,
  },
  addBtnLabel: { color: '#FFFFFF' },
  listingCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  listingImage: { width: 88, height: 88, borderRadius: 12 },
  listingContent: { flex: 1, minWidth: 0, gap: Spacing.one },
  listingActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  listingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  listingDeleteBtn: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: Spacing.one,
  },
  liveBadgeText: { color: '#047857', fontSize: 11, fontWeight: '600' },
  hiddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: Spacing.one,
  },
  hiddenBadgeText: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: { borderRadius: 16, padding: Spacing.four, gap: Spacing.two },
  modalTitle: { fontSize: 16, marginBottom: Spacing.one },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  modalBtn: {
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    minWidth: 80,
  },
  modalBtnPrimary: {},
});
