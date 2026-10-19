import { ApiError } from "../api.js";
import { delay, getDb, publicEmployee } from "./db.js";

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
