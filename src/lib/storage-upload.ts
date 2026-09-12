import { ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';
import { validatePostVideoSource } from '@/lib/post-video-limits';

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

export function postMediaPath(postId: string, index: number) {
  return `posts/${postId}/${index}`;
}

export function storyMediaPath(storyId: string, index: number) {
  return `stories/${storyId}/${index}`;
}

export async function uploadPostImageFromUri(
  postId: string,
  uri: string,
  index = 0,
): Promise<string> {
  return uploadImageFromUri(postMediaPath(postId, index), uri);
}

export async function uploadStoryImageFromUri(
  storyId: string,
  uri: string,
  index = 0,
): Promise<string> {
  return uploadImageFromUri(storyMediaPath(storyId, index), uri);
}

type VideoUploadOptions = {
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  durationSec?: number | null;
  posterUri?: string | null;
};

async function uploadScopedVideoFromUri(
  pathWithoutExt: string,
  uri: string,
  options?: VideoUploadOptions,
): Promise<{ videoPath: string; thumbnailPath?: string }> {
  const err = validatePostVideoSource({
    mimeType: options?.mimeType,
    fileName: options?.fileName,
    fileSize: options?.fileSize,
    durationSec: options?.durationSec,
  });
  if (err) throw new Error(err);

  const blob = await uriToBlob(uri);
  if (blob.size > 20 * 1024 * 1024) {
    throw new Error('Video must be 20 MB or smaller after picking. Try a shorter clip.');
  }

  const lower = (options?.fileName ?? uri).toLowerCase();
  const mime = (options?.mimeType ?? blob.type ?? '').toLowerCase();
  const ext = lower.endsWith('.webm') || mime.includes('webm')
    ? 'webm'
    : lower.endsWith('.mov') || mime.includes('quicktime')
      ? 'mov'
      : lower.endsWith('.m4v')
        ? 'm4v'
        : 'mp4';
  const contentType =
    mime ||
    (ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4');
  const videoPath = `${pathWithoutExt}.${ext}`;
  await uploadBytes(ref(storage, videoPath), blob, { contentType });

  let thumbnailPath: string | undefined;
  if (options?.posterUri) {
    thumbnailPath = await uploadImageFromUri(`${pathWithoutExt}_poster`, options.posterUri);
  }

  return { videoPath, thumbnailPath };
}

export async function uploadPostVideoFromUri(
  postId: string,
  uri: string,
  index = 0,
  options?: VideoUploadOptions,
): Promise<{ videoPath: string; thumbnailPath?: string }> {
  return uploadScopedVideoFromUri(postMediaPath(postId, index), uri, options);
}

export async function uploadStoryVideoFromUri(
  storyId: string,
  uri: string,
  index = 0,
  options?: VideoUploadOptions,
): Promise<{ videoPath: string; thumbnailPath?: string }> {
  return uploadScopedVideoFromUri(storyMediaPath(storyId, index), uri, options);
}
