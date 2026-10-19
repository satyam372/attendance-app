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
