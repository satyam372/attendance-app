// Browser location for check-in. The Geolocation API uses callbacks; this wraps it in a
// Promise so callers can `await getCurrentLocation()`.

// Keys are GeolocationPositionError codes
const MESSAGES = {
  1: "Location access is blocked. Click the lock icon in the address bar, allow Location for this site, then try again.",
  2: "Your location is unavailable. Turn on location in your device settings and try again.",
  3: "Getting your location took too long. Please try again.",
};

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
