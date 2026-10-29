import { ApiError } from "../api.js";
import { MAX_UPLOAD_BYTES } from "../domain/photo.js";
import { currentEmployee } from "./auth.js";
import { delay, getDb, publicEmployee, saveDb } from "./db.js";

// Mock of the profile photo endpoints. Photos are kept as data URLs next to the mock database.

const ALLOWED = ["image/webp", "image/jpeg", "image/png"];

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ApiError(0, "Couldn't read the photo."));
    reader.readAsDataURL(blob);
  });
}

export async function uploadPhoto(blob) {
  await delay(600);
  const employee = currentEmployee();
  if (!ALLOWED.includes(blob.type)) throw new ApiError(415, "Upload a JPEG, PNG or WebP image.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "The photo is too large.");
  const db = getDb();
  db.photos = { ...db.photos, [employee.id]: await readAsDataUrl(blob) };
  employee.photo_updated_at = new Date().toISOString();
  saveDb();
  return publicEmployee(employee);
}

export async function removePhoto() {
  await delay(300);
  const employee = currentEmployee();
  const db = getDb();
  if (db.photos) delete db.photos[employee.id];
  employee.photo_updated_at = null;
  saveDb();
  return null;
}

/** The stored data URL (the mock has no image server). */
export function photoUrl(id) {
  return getDb().photos?.[id] ?? null;
}
