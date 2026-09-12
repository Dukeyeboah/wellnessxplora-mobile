/** Limits for Discover post / story video uploads (match web). */

export const MAX_POST_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_POST_VIDEO_SOURCE_BYTES = 100 * 1024 * 1024;
export const MAX_POST_VIDEO_DURATION_SEC = 30;
export const MAX_POST_VIDEO_LABEL = '20 MB';
export const MAX_POST_VIDEO_DURATION_LABEL = '30 seconds';

export function formatVideoUploadSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validatePostVideoSource(options: {
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  durationSec?: number | null;
}): string | null {
  const type = (options.mimeType ?? '').toLowerCase();
  const name = options.fileName ?? '';
  const allowed =
    type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name) || type === '';
  if (!allowed) {
    return 'Please choose a short video (MP4, WebM, or MOV).';
  }
  if (options.fileSize != null && options.fileSize > MAX_POST_VIDEO_SOURCE_BYTES) {
    return `Video is too large to process (max ${formatVideoUploadSize(MAX_POST_VIDEO_SOURCE_BYTES)} before optimizing).`;
  }
  if (options.durationSec != null) {
    const durationErr = validatePostVideoDuration(options.durationSec);
    if (durationErr) return durationErr;
  }
  if (options.fileSize != null && options.fileSize > MAX_POST_VIDEO_BYTES) {
    return `Video must be ${MAX_POST_VIDEO_LABEL} or smaller (yours is ${formatVideoUploadSize(options.fileSize)}). Try a shorter clip.`;
  }
  return null;
}

export function validatePostVideoDuration(durationSec: number): string | null {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return 'Could not read video length. Try another file (MP4 works best).';
  }
  if (durationSec > MAX_POST_VIDEO_DURATION_SEC + 0.35) {
    return `Videos can be up to ${MAX_POST_VIDEO_DURATION_LABEL} (yours is about ${Math.ceil(durationSec)}s).`;
  }
  return null;
}
