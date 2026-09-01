import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { updateProfile } from 'firebase/auth';

import { AccountScrollScreen } from '@/components/account-scroll-screen';
import { CategorySelectField } from '@/components/category-select-field';
import {
  ContactToggle,
  FormActions,
  FormCard,
  FormField,
  FormInput,
  FormSectionTitle,
  FormTip,
} from '@/components/form-primitives';
import { VendorProfileHeaderEditor } from '@/components/vendor-profile-header-editor';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import {
  uploadImageFromUri,
  userAvatarPath,
  vendorCoverPath,
  vendorLogoPath,
} from '@/lib/storage-upload';
import {
  fetchVendorProfileDoc,
  updateExplorerProfile,
  updateVendorProfile,
  type UserLocation,
} from '@/lib/user-profile';

function splitCategories(slugs: string[]) {
  const primary = slugs[0] ?? '';
  const secondary = slugs.slice(1, 4);
  return { primary, secondary };
}

function mergeCategories(primary: string, secondary: string[]) {
  return [primary, ...secondary.filter((s) => s && s !== primary)].slice(0, 4);
}

export default function ProfileEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { user, userRole, userProfile, reloadUserProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [photoUri, setPhotoUri] = useState('');
  const [coverUri, setCoverUri] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<string | null>(null);
  const [initialUsername, setInitialUsername] = useState('');
  const [initialBusinessName, setInitialBusinessName] = useState('');

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const load = useCallback(async () => {
    if (!user || !userProfile) return;
    setUsername(userProfile.username ?? '');
    setInitialUsername(userProfile.username ?? '');
    setInitialBusinessName(userProfile.name);
    setFirstName(userProfile.firstName ?? '');
    setLastName(userProfile.lastName ?? '');
    setBusinessName(userProfile.name);
    setEmail(userProfile.contact.email ?? userProfile.email);
    setPhone(userProfile.contact.phone ?? '');
    setWhatsapp(userProfile.contact.whatsapp ?? '');
    setArea(userProfile.location.area);
    setCity(userProfile.location.city);
    setCountry(userProfile.location.country || 'Ghana');
    setPhotoUri(userProfile.photoURL);
    setContactPersonName(userProfile.name);

    if (userRole === 'vendor') {
      const vendor = await fetchVendorProfileDoc(user.uid);
      if (vendor) {
        setBusinessName(vendor.businessName);
        setInitialBusinessName(vendor.businessName);
        setDescription(vendor.description);
        setPhotoUri(vendor.logoUrl || userProfile.photoURL);
        setCoverUri(vendor.coverUrl);
        setContactPersonName(vendor.contact.contactPersonName ?? vendor.businessName);
        setShowEmailPublic(vendor.contact.showEmailPublic === true);
        setShowPhonePublic(vendor.contact.showPhonePublic === true);
        setShowWhatsappPublic(vendor.contact.showWhatsappPublic !== false);
        const split = splitCategories(vendor.categorySlugs);
        setPrimaryCategory(split.primary);
        setSecondaryCategories(split.secondary);
      }
    }
    setLoading(false);
  }, [user, userProfile, userRole]);

  useEffect(() => {
    if (!user) {
      router.replace('/profile');
      return;
    }
    if (userProfile) void load();
  }, [user, userProfile, load, router]);

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
    if (!user || !userProfile) return;
    if (userRole === 'vendor' && !primaryCategory) {
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

      if (userRole === 'vendor') {
        let logoPath: string | undefined;
        let coverPath: string | undefined;
        if (pendingPhoto) logoPath = await uploadImageFromUri(vendorLogoPath(user.uid), pendingPhoto);
        if (pendingCover) coverPath = await uploadImageFromUri(vendorCoverPath(user.uid), pendingCover);
        await updateVendorProfile(user.uid, user.uid, {
          businessName,
          description,
          categorySlugs: mergeCategories(primaryCategory, secondaryCategories),
          location,
          contact,
          logoPath,
          coverPath,
        });
      } else {
        let photoPath: string | undefined;
        if (pendingPhoto) photoPath = await uploadImageFromUri(userAvatarPath(user.uid), pendingPhoto);
        await updateExplorerProfile(user.uid, {
          name: businessName.trim() || `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          interests: userProfile.interests,
          location,
          contact,
          photoURL: photoPath,
        });
        if (photoPath && auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: pendingPhoto ?? undefined });
        }
      }
      await reloadUserProfile();
      Alert.alert('Profile saved', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.replace('/explore') },
      ]);
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const isVendor = userRole === 'vendor';
  const displayLogo = pendingPhoto ?? photoUri;
  const displayCover = pendingCover ?? coverUri;
  const publicLink = username.trim()
    ? `wellnessxplora.com/${username.trim()}`
    : 'Set a username for your public link';

  if (loading || !userProfile) {
    return (
      <AccountScrollScreen>
        <View style={{ paddingVertical: Spacing.six, alignItems: 'center' }}>
          <ActivityIndicator color={theme.tint} />
        </View>
      </AccountScrollScreen>
    );
  }

  return (
    <AccountScrollScreen scrollRef={scrollRef}>
      <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={12}>
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          ← Back
        </ThemedText>
      </Pressable>
      <ThemedText style={styles.pageTitle}>Edit profile</ThemedText>
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
          <FormField
            label="Username"
            helper="Your profile link uses this handle — not your business name. Visitors see your business name on the page."
            hint={
              username.trim().length >= 3 && username.trim() === initialUsername.trim()
                ? 'Username is available.'
                : undefined
            }>
            <FormInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="wellness_xplora" />
            <FormTip>{`Public link: ${publicLink}`}</FormTip>
          </FormField>

          <FormField
            label="Business name"
            helper="This is the name shown on your public profile, explore cards, and listings. It must be unique across vendors."
            hint={
              businessName.trim().length >= 2 && businessName.trim() === initialBusinessName.trim()
                ? 'Business name is available.'
                : undefined
            }>
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

          <FormSectionTitle>Location</FormSectionTitle>
          <FormField label="Address / area">
            <FormInput value={area} onChangeText={setArea} placeholder="Address / area" />
          </FormField>
          <FormField label="City">
            <FormInput value={city} onChangeText={setCity} placeholder="Accra" />
          </FormField>
          <FormField label="Country">
            <FormInput value={country} onChangeText={setCountry} placeholder="Ghana" />
          </FormField>

          <FormField label="Description">
            <FormInput value={description} onChangeText={setDescription} multiline />
          </FormField>

          <FormCard>
            <FormSectionTitle>Contact details</FormSectionTitle>
            <FormField
              label="Contact person full name (optional but recommended)"
              helper="The main point of contact for this business (prefilled from Google when available).">
              <FormInput value={contactPersonName} onChangeText={setContactPersonName} />
            </FormField>
            <FormField label="Email (optional but recommended)">
              <FormInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </FormField>
            <ContactToggle
              label="Show email button on public profile"
              description="Lets customers email you from your profile and through the WhatsApp cart. Your address stays private — they open their mail app instead."
              value={showEmailPublic}
              onValueChange={setShowEmailPublic}
            />
            <FormField
              label="Phone (optional but recommended)"
              helper="Enter 9 digits without the country code — a leading 0 is removed automatically.">
              <FormInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="20 979 1121" />
            </FormField>
            <ContactToggle
              label="Show call button on public profile"
              description="Lets clients call you from your profile page."
              value={showPhonePublic}
              onValueChange={setShowPhonePublic}
            />
            <FormField label="WhatsApp (optional but recommended)">
              <FormInput value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
            </FormField>
            <ContactToggle
              label="Show WhatsApp button on public profile"
              description="Lets customers message you on WhatsApp from your profile and cart."
              value={showWhatsappPublic}
              onValueChange={setShowWhatsappPublic}
            />
            <FormTip>
              Tip: Add at least WhatsApp or a public email contact. Without one, customers cannot use
              the WhatsApp cart on your listings.
            </FormTip>
          </FormCard>
        </>
      ) : (
        <>
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
        </>
      )}
      <FormActions
        onCancel={() => router.back()}
        onSave={() => void onSave()}
        saving={saving}
      />
    </AccountScrollScreen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    marginBottom: Spacing.two,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: Spacing.three,
  },
});
