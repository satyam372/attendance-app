import { apiFetch, apiUrl, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/profile.js";

// Profile photo (agreed endpoints, backend in progress). The image is already cropped and resized.

/** PUT /me/photo with the image as the body → EmployeePublic with a new photo_updated_at. */
export function uploadPhoto(blob) {
  if (USE_MOCK_API) return mock.uploadPhoto(blob);
  return apiFetch("/me/photo", { method: "PUT", body: blob });
}

/** DELETE /me/photo → 204. */
export function removePhoto() {
  if (USE_MOCK_API) return mock.removePhoto();
  return apiFetch("/me/photo", { method: "DELETE" });
}

/**
 * URL of someone's photo, or null when they have none. `photo_updated_at` is in the URL so a new
 * photo is fetched at once while an unchanged one comes from the browser cache.
 */
export function photoUrl(person) {
  if (!person?.photo_updated_at) return null;
  if (USE_MOCK_API) return mock.photoUrl(person.id);
  return apiUrl(`/employees/${person.id}/photo?v=${encodeURIComponent(person.photo_updated_at)}`);
}
