import { apiFetch, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/auth.js";

// Auth endpoints (docs/api-contract.md). Pages call these, never fetch directly,
// so switching between the mock and the real backend is only USE_MOCK_API.

export function login(email, password) {
  if (USE_MOCK_API) return mock.login(email, password);
  return apiFetch("/auth/login", { method: "POST", body: { email: email.trim().toLowerCase(), password } });
}

export function logout() {
  if (USE_MOCK_API) return mock.logout();
  return apiFetch("/auth/logout", { method: "POST" });
}

export function me() {
  if (USE_MOCK_API) return mock.me();
  return apiFetch("/auth/me");
}

/** The signed-in user's own password; returns the updated Employee (must_change_password false). */
export function changePassword(currentPassword, newPassword) {
  if (USE_MOCK_API) return mock.changePassword(currentPassword, newPassword);
  return apiFetch("/auth/change-password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}
