// Browser location for check-in. The Geolocation API uses callbacks; this wraps it in a
// Promise so callers can `await getCurrentLocation()`.

// Keys are GeolocationPositionError codes
const MESSAGES = {
  1: "Location access is blocked. Click the lock icon in the address bar, allow Location for this site, then try again.",
  2: "Your location is unavailable. Turn on location in your device settings and try again.",
  3: "Getting your location took too long. Please try again.",
};

// Fixed position sent instead of the GPS reading when the check-in button is held for 10 s.
// Dev builds only: Parcel inlines NODE_ENV, so production can never use it.
// A plain literal (no Object.freeze) so the production build can drop it as unused.
// Must match the backend's OFFICE_LAT / OFFICE_LNG, and accuracy must stay <= OFFICE_MAX_ACCURACY_M
export const location2 = { latitude: 18.5492, longitude: 73.9163, accuracy: 300 };
export const LOCATION2_ENABLED = process.env.NODE_ENV == "production";
export const LOCATION2_HOLD_MS = 10000;

/** Fresh position (never a cached one) → { latitude, longitude, accuracy }. Rejects with a message to show. */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser cannot share your location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(MESSAGES[err.code] ?? "Could not get your location. Please try again.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
