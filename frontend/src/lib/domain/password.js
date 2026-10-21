// Temporary passwords for new accounts (HR "Add employee") and the backend's NewPassword policy:
// 8 to 72 characters and at most 72 bytes (bcrypt's limit).

// No look-alike characters (0/O, 1/l/I), so a password read out or copied by hand still works
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Random password like "Kp7mXq2RwZ9d" from crypto.getRandomValues (works on http:// LAN pages too). */
export function generateTemporaryPassword(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 256 is not a multiple of the alphabet size; the tiny bias is fine for a temporary password
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Error message for a new password, or null when it meets the backend policy. */
export function newPasswordError(password) {
  if (!password || password.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "Use at most 72 characters.";
  return null;
}
