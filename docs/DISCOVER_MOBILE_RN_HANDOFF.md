# WellnessXplora — Discover / Community → React Native Handoff

> **Purpose:** Instructional source of truth for building the Discover / community social layer in the **React Native** mobile app.  
> **Web source of truth:** Next.js repo branch **`community-expansion`**.  
> **How to use:** Give this file to the mobile agent with: *“Follow `DISCOVER_MOBILE_RN_HANDOFF.md`. Do not invent a different social product, schema, or visual language. Prefer shared Firebase so web and mobile stay interoperable.”*

| | |
|---|---|
| **Last updated** | 2026-09-12 |
| **Web feature branch** | `community-expansion` |
| **Canonical product name** | WellnessXplora |
| **Surfaces covered** | Discover feed, Stories, create post/story, engagement, post deep links |

---

## 1. Role & mission

Build the **Discover / community social layer** of WellnessXplora in React Native.

This is **not** a marketplace rebuild. Explore/catalog is separate. Port:

- Community **feed** (posts)
- **Stories** (24h)
- **Posting** (image / video / text / event)
- **Engagement** (like, save, share, follow)
- **Deep links** to individual posts

**Do not invent** a different social product (no TikTok ranking, no Instagram-clone sprawl, no Reels-as-a-separate-app). Mirror web product principles, schema, and UX rules. Prefer the **same Firebase project**, collections, field names, and Storage path patterns.

---

## 2. Product vision (keep this framing)

WellnessXplora is becoming:

> **The discovery and connection layer for the global wellness ecosystem.**

Optimize for: **Discover · Share · Connect · Save · Follow · Learn · Enquire**  
Avoid framing this surface as only Buy / Sell / Checkout.

Editorial philosophy:

> “Here are things we think you should know about wellness.”  
> Compete on **discernment and curation**, not algorithmic noise.

Long-term loop:

```
Content → People → Community → Discovery → Vendors → Products → Enquiries → (later) Transactions
Vendors → Content → Followers → Community → Discovery
```

---

## 3. Critical product split

| Surface | Job | Must not become |
|--------|-----|------------------|
| **Discover** | Community content: posts, Stories, events, engagement | Marketplace browse |
| **Explore** | Marketplace categories / vendors / listings | Social feed |

Keep them as **separate tabs**. Discover = content; Explore = catalog.

---

## 4. Account model (do not break)

- **ACCOUNT ≠ ROLE.** Every person is a **Member**.
- **Vendor** is a **capability** on the same account (`users.capabilities` includes `'vendor'`; legacy `users.role === 'vendor'` still used by Firestore rules).
- **Admin** = `admins/{uid}` exists (platform), not a marketplace role.
- **Editorial publisher** = posts/stories with `authorType: 'wellnessxplora'`, display name **WellnessXplora** (not the admin human’s personal name).

### Who can create posts / Stories

| Actor | Can create? | `authorType` |
|-------|-------------|--------------|
| Vendor (verified) | Yes | `'vendor'` (`vendorId` + `authorId` = uid) |
| Admin (editorial) | Yes | `'wellnessxplora'` |
| Regular member | **No** — like / save / follow / view only | — |

Members **engage**; vendors + editorial **publish**.

---

## 5. Architecture (mobile)

### Stack expectations

- React Native (Expo or bare — follow the existing mobile repo conventions).
- **Same Firebase project** as web: Auth + Firestore + Storage.
- Reuse collection names, field names, doc ID conventions, and Storage paths **exactly**.
- Deep links should align with web: post detail ≈ `/post/{id}` (configure RN linking / universal links equivalently).

### Suggested screen map

| Screen | Purpose |
|--------|---------|
| **Discover** (tab) | Stories rail + content filters + feed |
| **Create Post** (modal/sheet) | Image / Video / Text / Event (vendors; admin if app supports editorial) |
| **Story Viewer** (fullscreen) | Tap through an author’s stories |
| **Create Story** (sheet) | Image / Video / Text story |
| **Post Detail** | Single post/event from share or “See post” |
| **Saved** (existing tab) | Include saved **posts** from `post_saves` (distinct from likes) |

Bottom nav (align with web mobile): **Discover · Explore · Saved · Profile**.

### Data-layer modules (mirror web responsibilities)

Implement RN equivalents of:

- Feed query + pagination (For you; Following ready but optional in UI)
- Post CRUD + **create → upload → patch media** pipeline
- Stories fetch / group / create / create-from-post
- Like / save / follow
- Video prepare + limits
- Storage path helpers + URL resolution

---

## 6. Firestore data model (exact)

### `posts/{postId}`

```
authorId: string
authorType: 'wellnessxplora' | 'vendor' | 'user'   // create rules allow only wellnessxplora|vendor
authorName: string
authorPhotoURL?: string
vendorId?: string
caption: string                    // UX max ~800; rules ≤ 4000
media: PostMediaItem[]             // Storage PATHS, not download URLs
mediaType: 'image' | 'video' | 'none'
categorySlugs: string[]
tags: string[]
linkedEntities: { type, id, label? }[]
status: 'draft' | 'published' | 'archived' | 'removed'
visibility: 'public'
contentType?: 'post' | 'event'
eventStartsAt?: Timestamp          // required for events
featured?: boolean                 // exists; unused in ranking
likeCount: number
saveCount: number
createdAt, updatedAt, publishedAt?
```

`PostMediaItem`:

```
url: string              // e.g. posts/{postId}/0.webp
type: 'image' | 'video'
thumbnailUrl?: string    // video poster path
```

### `stories/{storyId}`

```
authorId, authorType: 'wellnessxplora' | 'vendor'   // no 'user'
authorName, authorPhotoURL?, vendorId?
caption: string                    // ≤ 500
media: PostMediaItem[]
mediaType: 'image' | 'video' | 'none'
linkedEntities: []
status: 'published' | 'removed'
visibility: 'public'
createdAt, updatedAt
expiresAt: Timestamp               // AUTHORITATIVE public liveness
sourcePostId?: string              // when shared from a post
sourcePostContentType?: 'post' | 'event'
sourceMediaCount?: number          // >1 ⇒ album badge
```

### Constants

| Constant | Value |
|----------|--------|
| Story TTL | **24 hours** (`expiresAt = now + 24h`) |
| Story media cleanup grace | **72h** after expiry (scripts only; public UI uses `expiresAt` only) |
| Post caption UX max | **~800** (rules allow 4000) |
| Story caption max | **500** |
| Feed page size | **~50** |
| Follow `in` chunk | **≤10** vendor IDs |

### Engagement collections

| Collection | Doc ID | Fields |
|------------|--------|--------|
| `post_likes` | `{userId}_{postId}` | userId, postId, createdAt |
| `post_saves` | `{userId}_{postId}` | userId, postId, createdAt |
| `vendor_follows` | `{userId}_{vendorId}` | userId, vendorId, createdAt |

On like/save: also increment/decrement `posts.likeCount` / `posts.saveCount`.

### Like ≠ Save

- **Like** = social signal on posts  
- **Save** = personal keep (posts + marketplace bookmarks elsewhere)  
- Marketplace listings: Save only, no likes  

---

## 7. Feed architecture

### Modes

- **For you** (default):  
  `posts` where `status == 'published'` AND `visibility == 'public'`,  
  `orderBy publishedAt desc`, cursor pagination (`startAfter`).
- **Following** (implement data layer; UI optional):  
  Load followed vendor IDs → query `vendorId in [...]` in chunks → merge/dedupe → sort by `publishedAt` → page.

Web currently **locks UI to For you** (Following tabs hidden until denser). Mirror that unless product asks to enable Following.

### Content filters (required)

Icon tabs on Discover (not loud pill clusters):

1. **Photos & video** (`visual`) — default  
2. **Text**  
3. **Events**

Client categorization:

- **events** = `contentType === 'event'` AND still upcoming (through end of event calendar day), sort ascending by `eventStartsAt`
- **visual** = non-event posts with image or video  
- **text** = non-event posts with no visual media  

### Layout rules

| Filter | Layout |
|--------|--------|
| visual | Vertical scroll of post cards (1-col phone; multi-col tablet optional) |
| text | Same list, caption-first |
| events | Horizontal carousel (“Upcoming Events”) |

**Chronological only — do not invent ranking.**

---

## 8. Post types & create behavior

| UI format | Stored shape |
|-----------|--------------|
| Image | `contentType: 'post'`, `media` images |
| Video | `contentType: 'post'`, `media` includes video (+ poster) |
| Text | `contentType: 'post'`, `media: []`, `mediaType: 'none'`, caption required |
| Event | `contentType: 'event'`, `eventStartsAt` required; caption **or** image |

### Critical create pipeline (Storage rules depend on this)

1. **Create Firestore post doc first** (may have empty `media`) → get `postId`  
2. Upload files to `posts/{postId}/{index}.ext` (+ `{index}_poster` for video)  
3. **Update** post with `media` (Storage paths) and derived `mediaType`

Same for Stories: create doc → upload to `stories/{id}/…` → update media.

### Display behaviors

- **Multi-image:** in-card carousel; track current index for Add-to-story  
- **Video:** muted inline preview; tap → fullscreen with sound; advance on end where applicable  
- **Text:** caption-first; engagement under body  
- **Event:** Event label + date; leave Upcoming when past end-of-day  

### Video limits (enforce before upload)

| Limit | Value |
|-------|--------|
| Duration | ≤ **30 seconds** |
| After prepare | ≤ **20 MB** |
| Long edge | ~**1280** (~720p) |
| Accept | mp4 / mov / webm / m4v |
| Source before compress | can be larger (~100 MB), then prepare |

### Storage paths (exact)

```
posts/{postId}/{n}.jpg|webp
posts/{postId}/{n}.mp4|webm|mov|m4v
posts/{postId}/{n}_poster.jpg|webp

stories/{storyId}/{n}.jpg|webp
stories/{storyId}/{n}.mp4|webm|mov|m4v
stories/{storyId}/{n}_poster.jpg|webp
```

Store **paths** in Firestore; resolve to download URLs in the client.

---

## 9. Stories (full feature set)

### Rail

- Horizontal author rings above the feed  
- Group by `authorId`  
- Order: **WellnessXplora first**, then by most recent story  
- Cover = video **poster** or first image — **never** video URL as rail cover (no video preload in rail)  
- “Your story” create affordance for eligible authors  

### Viewer

- Fullscreen dark overlay  
- Progress segments per story in the author group  
- Tap left / right thirds for prev / next; advance on video ended  
- Caption when present  
- **Album badge** when `sourceMediaCount > 1` — top-right **indicator only, not tappable**  
- If `sourcePostId` set: **See post** / **See event** → Post Detail  

### Create Story

- Image / Video / Text  
- Default `expiresAt = now + 24h`  
- Product linking deferred (vendor self-link only if needed)

### Add post → Story

- On **own** posts only  
- Reuses **post Storage paths** (no re-upload)  
- Multi-image: share the **currently viewed** slide only  
- Set `sourcePostId`, `sourcePostContentType`, `sourceMediaCount`  
- Event captions may prefix `Event · `  
- Cleanup must **never** delete `posts/` objects when story came from a post  

---

## 10. Engagement UX

On each post card:

- **Like** (heart) — auth required  
- **Save** (bookmark) — auth required  
- **Share** — link to post detail (`/post/{id}` or app deep link); system share sheet is fine  
- **Follow** — on others’ vendor posts (cannot follow self)  
- **Add to story** — own posts only  

Placement:

- Under media: like + share (+ add-to-story) one side; save the other  
- Text posts: inline row under caption  

---

## 11. Auth / guest behavior

- Web Discover currently **requires sign-in** for the feed UI (guest sees CTA), while Firestore rules allow public read of published posts / live stories.  
- On mobile: prefer **guest browse of public feed + Stories**, with auth prompts on like / save / follow / create — **unless** the mobile app already requires login for main tabs; then stay consistent with that app.

Password accounts must be email-verified for writes (web: `isSignedInVerified`).

---

## 12. Layout & visual language (mobile)

Match **existing WellnessXplora**, do not invent a new “AI social” look.

### Color / atmosphere

- Soft green-tinted background (sage / wellness green)  
- Sage primary; warm secondary accents; white cards; subtle borders  
- Actions / chips / story rings: **emerald / brand green**  
- Story rings: soft emerald → lime → amber feel  

**Avoid:** purple-on-white / indigo AI gradients; generic cream + terracotta “AI landing”; newspaper dense columns; heavy glow; emoji decoration; oversized pill clusters.

### Typography

- Readable UI sans for body  
- **Serif / display** for the Discover title (“Discover”) — brand-first  

### Discover first viewport (one composition)

1. Header: **Discover** title + create **+** (if vendor / admin)  
2. Short subcopy: wellness updates from the community  
3. Content-type filter (visual / text / events)  
4. **Stories rail**  
5. Feed  

One job per section. Cards are interaction containers (posts), not decorative chrome.

### Card anatomy

- Rounded card, light border, soft press elevation  
- Header: avatar (brand mark for WellnessXplora) · name · verified · meta (Event · category · relative time) · Follow  
- Media (square-ish images; video preview)  
- Engagement bar  
- Caption (clamp + expand)  
- Optional linked-entity chips — reserve space so layout doesn’t jump  

---

## 13. Firebase rules & indexes (must respect)

Do not invent write paths that bypass rules.

**Posts**

- Public list/get when published + public  
- Create only vendor-self or admin-wellnessxplora  
- Engagement updates may only touch `likeCount` / `saveCount` for signed-in users  

**Stories**

- Public when `published` + `expiresAt > now`  
- Create same author gates; caption ≤ 500; `expiresAt` required  

**Storage**

- Create post/story doc **before** upload  
- `vendorId` on doc must match auth (or admin)  
- Video ≤ 20 MB; public read OK  

**Indexes (already on web)**

- `posts`: status + visibility + publishedAt  
- `posts`: status + visibility + vendorId + publishedAt  
- `stories`: status + expiresAt  
- `post_saves`: userId + createdAt  

---

## 14. Implementation plan (phased)

### Phase A — Foundations

1. Wire Firebase Auth into Discover tab  
2. Post URL resolver + media path helpers  
3. Fetch For-you feed + Load more  
4. Render cards for image / text / video (read-only)  
5. Post detail screen + share deep link  

### Phase B — Engagement

6. Like / unlike (optimistic UI)  
7. Save / unsave; surface in Saved tab  
8. Follow vendor on others’ vendor posts  
9. Share sheet  

### Phase C — Create posts

10. Vendor gate on create button  
11. Composer: Image (multi), Video (prepare + limits), Text, Event  
12. Enforce create → upload → patch  
13. Linked-entity tagging if mobile already has vendor/listing pickers (can defer)  

### Phase D — Stories

14. Active stories query + group-by-author rail  
15. Fullscreen viewer (segments, video ended advance)  
16. Create story (image / video / text)  
17. Add-to-story from own posts (current image index + `sourcePost*` fields)  
18. See post / See event + non-interactive album badge  

### Phase E — Filters & events polish

19. Content-type filters  
20. Upcoming events carousel  
21. Optional: Following mode UI when ready  

### Phase F — Parity & hardening

22. Guest vs signed-in policy implemented consistently  
23. Error states for missing indexes / permission denied  
24. Confirm Storage cleanup never deletes `posts/` for from-post stories  

---

## 15. Acceptance criteria

- [ ] Discover shows Stories rail + filtered feed from **same Firestore data** as web  
- [ ] Image, multi-image, video, text, and event posts render correctly  
- [ ] Vendors can create all four formats; members cannot create  
- [ ] Video ≤ 30s / ≤ 20MB after prepare  
- [ ] Like / Save / Follow / Share use correct collections and counters  
- [ ] Stories expire after 24h (`expiresAt`) and leave public rail/viewer  
- [ ] Add-to-story uses current carousel image; album badge is indicator-only  
- [ ] See post opens Post Detail for stories created from posts  
- [ ] Visual language: soft green / sage / Discover serif title — not purple AI default  
- [ ] Explore remains a separate marketplace surface  

---

## 16. Explicit non-goals

- Do not rebuild Explore marketplace, checkout, or enquiry cart  
- Do not build member-authored public posts (rules block)  
- Do not add algorithmic ranking or infinite TikTok-style For You  
- Do not treat Stories as permanent posts  
- Do not re-upload post media when sharing to Story  

---

## 17. Web source files (inspect when unsure)

**UI**

- `components/home-feed-client.tsx`
- `components/feed-post-card.tsx`
- `components/feed-horizontal-post-card.tsx`
- `components/feed-create-composer.tsx`
- `components/stories-rail.tsx`
- `components/story-viewer.tsx`
- `components/story-create-composer.tsx`
- `components/post-engagement-bar.tsx`
- `components/post-add-to-story-button.tsx`
- `components/feed-reel-preview.tsx`
- `components/feed-video-player-overlay.tsx`

**Domain**

- `lib/feed-posts.ts`
- `lib/stories.ts`
- `lib/feed-post-layout.ts`
- `lib/firestore-schema.ts`
- `lib/post-video-limits.ts`
- `lib/video-prepare.ts`
- `lib/post-engagement.ts`
- `lib/storage-upload.ts`
- `lib/storage-url.ts`

**Rules / indexes / vision**

- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `docs/WELLNESSXPLORA_REBUILD_GUIDE.md` (vision / account model; **prefer code if guide is stale**)

**Routes**

- `app/home/page.tsx`
- `app/post/[id]/page.tsx`

---

## 18. Working style for the mobile agent

- Match existing mobile navigation, theming, and component patterns.  
- Prefer incremental phases that ship usable read paths before create.  
- Do not invent new collection names or field names.  
- After each phase, verify against the live Firebase data used by the web Discover feed.  
- Update this doc’s **Last updated** date if you discover intentional product deltas that must stay different on mobile.

---

## Suggested kickoff message to the mobile agent

> Follow `docs/DISCOVER_MOBILE_RN_HANDOFF.md` (or the copy I attached). Build Discover / community on React Native against the same Firebase backend as the web `community-expansion` branch. Start with Phase A (read-only feed + post detail), then engagement, then create, then Stories. Do not invent schema or a purple AI visual language. Ask before diverging from this doc.
