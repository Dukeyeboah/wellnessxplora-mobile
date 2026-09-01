# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

This project targets Expo SDK 54 so it works with the App Store version of Expo Go. When Expo Go on the App Store supports a newer SDK, we can upgrade with:

```sh
npx expo install expo@^57.0.0 --fix
```

## Account-area screens (logged-in)

New account pages should use `AccountScrollScreen` from `@/components/account-scroll-screen` so they match Explore:

- Collapsible `AppHeader` (hides on scroll down, returns at top)
- Optional `sticky` slot for filters/search below the header
- `useScrollChrome()` on the main `ScrollView` (tab bar hides while scrolling)

Examples: `favorites.tsx`, `dashboard.tsx`, `profile-edit.tsx`.
