/**
 * Firestore often stores Storage object paths (e.g. listings/abc/0.webp),
 * not full https URLs. Convert those paths into public ?alt=media URLs.
 */

const STORAGE_HOST = 'firebasestorage.googleapis.com';

function storageBucket(): string | null {
  return process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || null;
}

function isStorageObjectPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('://')) return false;
  return (
    trimmed.startsWith('users/') ||
    trimmed.startsWith('vendors/') ||
    trimmed.startsWith('listings/') ||
    trimmed.startsWith('posts/') ||
    trimmed.startsWith('stories/') ||
    trimmed.startsWith('verification/')
  );
}

function firebaseStorageObjectPathFromUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (trimmed.startsWith('gs://')) {
      const withoutScheme = trimmed.slice('gs://'.length);
      const slash = withoutScheme.indexOf('/');
      return slash >= 0 ? withoutScheme.slice(slash + 1) : null;
    }

    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes(STORAGE_HOST)) return null;

    const marker = '/o/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;

    const encoded = parsed.pathname.slice(idx + marker.length);
    if (!encoded) return null;
    return decodeURIComponent(encoded.split('?')[0] ?? encoded);
  } catch {
    return null;
  }
}

function normalizeStoragePath(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (isStorageObjectPath(trimmed)) return trimmed;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('gs://')
  ) {
    return firebaseStorageObjectPathFromUrl(trimmed);
  }
  return null;
}

function storagePublicMediaUrl(objectPath: string): string | null {
  const bucket = storageBucket();
  if (!bucket) return null;
  const path = objectPath.replace(/^\//, '');
  if (!path) return null;
  return `https://${STORAGE_HOST}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

/** Turn a Firestore image field into something <Image> can load. */
export function resolveStorageImageUrl(raw: string | undefined | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) return '';

  const path = normalizeStoragePath(trimmed);
  if (path) {
    return storagePublicMediaUrl(path) ?? trimmed;
  }

  return trimmed;
}
