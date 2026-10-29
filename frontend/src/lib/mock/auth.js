import { ApiError } from "../api.js";
import { delay, getDb, publicEmployee, saveDb } from "./db.js";

// Mock of /api/auth/*. The real backend keeps the session in an httpOnly cookie;
// here the signed-in employee id is kept in localStorage.

const SESSION_KEY = "speedin-mock-session";

function readSession() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(id) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore: the session then lasts until reload.
  }
}

export async function login(email, password) {
  await delay(600);
  const user = getDb().employees.find((e) => e.email === email.trim().toLowerCase());
  // Same status codes and messages as backend/app/api/routes/auth.py
  if (!user || user.password !== password) throw new ApiError(401, "Invalid email or password");
  if (!user.is_active) throw new ApiError(403, "Your account is deactivated. Contact HR.");
  writeSession(user.id);
  return publicEmployee(user);
}

export async function logout() {
  await delay(150);
  writeSession(null);
  return null;
}

/** The signed-in employee (full record), or a 401 like the backend's CurrentUserDep. */
export function currentEmployee() {
  const user = getDb().employees.find((e) => e.id === readSession() && e.is_active);
  if (!user) throw new ApiError(401, "Not signed in.");
  return user;
}

export async function me() {
  await delay(200);
  return publicEmployee(currentEmployee());
}

/** POST /auth/change-password: same checks and messages as backend services/auth.change_password. */
export async function changePassword(currentPassword, newPassword) {
  await delay(500);
  const user = currentEmployee();
  if (!newPassword || newPassword.length < 8) throw new ApiError(422, "String should have at least 8 characters");
  if (new TextEncoder().encode(newPassword).length > 72) throw new ApiError(422, "Password must be at most 72 bytes");
  if (user.password !== currentPassword) throw new ApiError(400, "Current password is incorrect");
  if (newPassword === currentPassword) throw new ApiError(400, "Choose a password different from the current one");
  user.password = newPassword;
  user.must_change_password = false;
  saveDb();
  return publicEmployee(user);
}
