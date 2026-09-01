import { ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

export async function uploadImageFromUri(objectPath: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const path = `${objectPath}.${ext}`;
  const storageRef = ref(storage, path);
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  await uploadBytes(storageRef, blob, { contentType });
  return path;
}

export function userAvatarPath(uid: string) {
  return `users/${uid}/avatar`;
}

export function vendorLogoPath(vendorId: string) {
  return `vendors/${vendorId}/logo`;
}

export function vendorCoverPath(vendorId: string) {
  return `vendors/${vendorId}/cover`;
}
