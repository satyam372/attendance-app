import { cropRect, MAX_UPLOAD_BYTES, PHOTO_SIZE } from "./domain/photo.js";

// Browser-only image helpers for the profile photo (canvas, createImageBitmap).

/** Decodes a chosen file. Browsers apply the phone's EXIF rotation, so portraits stay upright. */
export async function loadImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that photo. Try a JPG or PNG.");
  }
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * The cropped square as a PHOTO_SIZE × PHOTO_SIZE WebP (JPEG where the browser cannot make WebP),
 * lowering the quality until it fits the backend's MAX_UPLOAD_BYTES.
 */
export async function renderPhoto(image, { zoom, offsetX, offsetY }) {
  const { sx, sy, size } = cropRect({ width: image.width, height: image.height, zoom, offsetX, offsetY });
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext("2d");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sx, sy, size, size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);

  for (const quality of [0.86, 0.75, 0.6]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    // Browsers without a WebP encoder silently return PNG; use JPEG there instead
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  throw new Error("Couldn't make that photo small enough. Try another one.");
}
