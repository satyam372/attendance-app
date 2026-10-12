import { ApiError } from "../api.js";
import { delay, getDb, publicEmployee } from "./db.js";

// Mock of /api/auth/*. The real backend keeps the session in an httpOnly cookie;
// here the signed-in employee id is kept in localStorage.

const SESSION_KEY = "speedin-mock-session";

function readSession() {
  try {
    return Number(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function writeSession(id) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, String(id));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore: the session then lasts until reload.
  }
}

export async function login(email, password) {
  await delay(600);
  const user = getDb().employees.find((e) => e.email === email.trim().toLowerCase());
  if (!user || user.password !== password) throw new ApiError(401, "Email or password is incorrect.");
  if (!user.is_active) throw new ApiError(403, "This account is inactive. Contact HR.");
  writeSession(user.id);
  return { user: publicEmployee(user) };
}

export async function logout() {
  await delay(150);
  writeSession(null);
  return null;
}

export async function me() {
  await delay(200);
  const user = getDb().employees.find((e) => e.id === readSession() && e.is_active);
  if (!user) throw new ApiError(401, "Not signed in.");
  return publicEmployee(user);
}
