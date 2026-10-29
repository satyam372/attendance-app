// Profile photo rules shared by the photo editor, the API layer and the mock. The browser crops
// and resizes before uploading, so the backend only stores a small square image.

export const PHOTO_SIZE = 256; // px, square; shown as a circle
export const MAX_INPUT_BYTES = 10 * 1024 * 1024; // what we accept from the camera or gallery
export const MAX_UPLOAD_BYTES = 200 * 1024; // what the backend accepts (PUT /api/me/photo)
export const MAX_ZOOM = 3;

// SVG is never accepted: it can carry scripts. GIF would lose its animation anyway.
const ACCEPTED = /^image\/(jpeg|png|webp|heic|heif|avif)$/;

/** Error message for a chosen file ({ type, size }), or null when it can be used. */
export function photoFileError(file) {
  if (!file) return "Choose a photo.";
  if (!ACCEPTED.test(file.type)) return "Choose a JPG, PNG or WebP photo.";
  if (file.size > MAX_INPUT_BYTES) return "That photo is over 10 MB. Choose a smaller one.";
  return null;
}

/**
 * The square part of an image to keep. `zoom` 1 = the largest square that fits; higher zooms in.
 * `offsetX` / `offsetY` move the square from the centre, in source pixels, and are clamped so the
 * square never leaves the image. Returns { sx, sy, size } in source pixels.
 */
export function cropRect({ width, height, zoom = 1, offsetX = 0, offsetY = 0 }) {
  const z = Math.min(Math.max(zoom, 1), MAX_ZOOM);
  const size = Math.min(width, height) / z;
  const clamp = (value, max) => Math.min(Math.max(value, 0), max);
  return {
    sx: clamp((width - size) / 2 + offsetX, width - size),
    sy: clamp((height - size) / 2 + offsetY, height - size),
    size,
  };
}

/** Largest offsets that keep the square inside the image, for clamping drags. */
export function maxOffsets({ width, height, zoom = 1 }) {
  const size = Math.min(width, height) / Math.min(Math.max(zoom, 1), MAX_ZOOM);
  return { x: (width - size) / 2, y: (height - size) / 2 };
}
