# WellnessXplora mobile — end-to-end QA checklist

Use this as a walkthrough. Check each box as you go. Prefer **web** (`npm run web`) for phone auth; use Expo Go or a device for Google native and media uploads.

**Product model (current):** Everyone signs up as a **Member** by default (explorer role). They can optionally choose **Vendor** at signup, or upgrade later via Account / profile menu → **Become a vendor**. Vendors get a `vendors/{uid}` storefront, Dashboard, products, and follower lists. Connect is one-way (`vendor_follows`); **Mutual** means both storefronts follow each other.

---

## 0. Prep

- [ ] App loads (Discover as home / guest browse works)
- [ ] Firebase env (`.env.local`) points at the shared project you intend to test
- [ ] Sign out any leftover session before signup tests
- [ ] Have two test accounts ready (Member A, Vendor B) — or create them in this run
- [ ] Optional third account (Vendor C) for mutual-connect tests

---

## 1. Signup — Member (default path)

- [ ] Open Profile tab → Create an account
- [ ] **Member** is selected by default; hint says you can become a vendor later
- [ ] Sign up with **Google** (or email: password + confirm)
- [ ] Lands on Discover signed in
- [ ] Profile menu shows: Connections, Favorites, Cart, Edit profile, Account — **no** Dashboard
- [ ] Account screen shows **Explorer account** + **Become a vendor**
- [ ] Edit profile works (name/photo) without requiring business category

### Email signup notes

- [ ] Mismatched passwords blocked
- [ ] Weak password shows clear error
- [ ] Existing email prompts login instead

### Phone signup (web)

- [ ] Send SMS + verify code creates Member account when Member selected
- [ ] On native: message about needing a dev build is acceptable

---

## 2. Signup — Vendor (optional at signup)

- [ ] Sign out → Sign up again with a fresh account
- [ ] Choose **Vendor** → hint about storefront
- [ ] Complete signup (Google recommended — password accounts may need email verify before vendor doc create under Firestore rules)
- [ ] Profile menu shows **Dashboard**
- [ ] Dashboard loads (even if storefront is mostly empty)
- [ ] Edit profile asks for / saves business fields (category required to save as vendor)

---

## 3. Login / session

- [ ] Log out → Log in with email / Google / phone
- [ ] Wrong password shows friendly error
- [ ] Session persists after refresh (web) / app restart
- [ ] Guest prompts appear when liking, connecting, saving, carting without auth

---

## 4. Become a vendor (upgrade path)

With a **Member** account:

- [ ] Account → **Become a vendor** → confirm → navigates to Edit profile
- [ ] Role badge becomes **Vendor account**
- [ ] Dashboard tab / menu item appears and loads
- [ ] Profile menu **Become a vendor** disappears
- [ ] Can also upgrade from profile menu (same result)

If upgrade fails (permissions / unverified email):

- [ ] Error is shown; note it for Firestore rules / email verification follow-up

---

## 5. Discover (feed)

### Guest

- [ ] Stories / posts load (or empty state — no crash)
- [ ] Content filters (image / text / events) toggle feed
- [ ] Tap Connect / like / create prompts sign-in

### Signed in (Member)

- [ ] Can like posts (heart)
- [ ] Can Connect on others’ posts / profiles
- [ ] Create tab: Member **cannot** publish vendor posts (auth gate / no create) — only vendors/admins create
- [ ] Avatar / name opens vendor profile when available
- [ ] Category chip opens Explore category
- [ ] Editorial posts show soft green treatment + badge (if present in data)

### Signed in (Vendor / Admin)

- [ ] Create opens composer
- [ ] Stories rail “add” works for vendors
- [ ] Own posts do not show Connect on self

---

## 6. Create post

As vendor (or admin):

- [ ] **Image:** media required, caption after media, upload overlay with quote
- [ ] **Event:** caption above photos, media required
- [ ] Max **5** images; reorder thumbs; cover is first
- [ ] Tag vendor / product (linked entity tagger)
- [ ] Publish appears on Discover
- [ ] Edit existing post (if entry point available) saves changes
- [ ] Add post to story (when offered) succeeds

---

## 7. Dashboard & products

As vendor:

- [ ] Products | Posts toggle
- [ ] Add product via listing editor (title, price, images, category, etc.)
- [ ] Edit / delete product
- [ ] Product appears on public vendor profile and Explore (allow indexing delay)
- [ ] Posts manager: own posts listed; edit/delete/publish states work
- [ ] Trust badges display if verified / founding flags set

---

## 8. Public vendor profile

- [ ] Open `/vendor/{id}` from Discover or Explore
- [ ] **Posts** first / default, then Products
- [ ] Connect FAB works; bookmark/save works
- [ ] WhatsApp / contact actions respect public flags
- [ ] Own profile: no Connect-to-self

---

## 9. Explore, listings, favorites, cart

- [ ] Explore vendors + products hubs load
- [ ] Category filter / search
- [ ] Open listing detail; add to cart; favorite/bookmark
- [ ] Favorites: vendors, listings, saved posts; remove works
- [ ] Cart: quantities, remove, WhatsApp order flow (needs vendor WhatsApp)

---

## 10. Connections (follow graph)

### As Member

- [ ] Connect to Vendor B from Discover or vendor profile
- [ ] **Connections** → Following lists Vendor B
- [ ] No Followers tab (members don’t receive storefront followers)
- [ ] Footer hint about becoming a vendor for mutuals / followers
- [ ] Disconnect (unfollow) removes them from Following
- [ ] Re-connect works

### As Vendor (two vendor accounts A ↔ C)

- [ ] A connects to C → A Following shows C (not mutual yet)
- [ ] C connects to A → both show **Mutual** chip
- [ ] Followers tab on A lists C (and mutual when A follows back)
- [ ] Tap a row opens that vendor profile

---

## 11. Profile edit & account chrome

- [ ] Collapsible header / scroll chrome on account screens
- [ ] Appearance settings toggle (if present)
- [ ] Admin menu item only for admin UIDs
- [ ] Sign out clears session and gated actions

---

## 12. Regression / polish

- [ ] Tab bar: Discover, Explore, Create, Dashboard, Profile
- [ ] Profile tab opens menu when signed in (not only Account page)
- [ ] Hidden routes (favorites, cart, connections, profile-edit) reachable from menu
- [ ] No crash on deep link refresh for vendor / listing / post
- [ ] Images load (Storage URLs); broken images don’t freeze UI

---

## Suggested test order (same session)

1. Guest Discover smoke  
2. Signup as **Member** → Connect someone → Connections Following  
3. **Become a vendor** → Edit storefront → Add product → Create post  
4. Second browser/profile: signup **Vendor** → mutual Connect  
5. Explore / favorites / cart on both roles  
6. Log out / log in round-trip  

---

## Known caveats to watch while testing

| Area | What to watch |
|------|----------------|
| Vendor doc on email signup | Firestore may require verified email; Google signup usually OK; upgrade path retries `ensureVendorDoc` |
| Phone auth | Web-only until native dev build |
| Mutual chip | Only when **both** sides are vendors and each follows the other’s storefront id |
| Member create | Creating feed posts is vendor/admin; members browse/connect/save |
| Stories guest query | Public story rules must be deployed on shared Firebase |

Mark failures with the screen, account role, and exact error text so they can be fixed in order.
