// Thin fetch wrapper for the backend. The auth JWT lives in an httpOnly cookie,
// so every request sends credentials; the frontend never sees the token.

const API_URL = (process.env.API_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message, detail = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// FastAPI errors look like {"detail": "text"} or, for validation errors,
// {"detail": [{"loc": [...], "msg": "..."}]}.
function messageFrom(detail, status) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "The request could not be completed.";
}

/** Full URL of an API path, for <img src> and links (the session cookie goes along on the same origin). */
export function apiUrl(path) {
  return `${API_URL}${path}`;
}

// `body`: a plain value is sent as JSON; a Blob (e.g. a photo) is sent as-is with its own type.
export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": isBlob ? body.type : "application/json" },
      body: body === undefined ? undefined : isBlob ? body : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, messageFrom(data?.detail, response.status), data?.detail);
  return data;
}

export const USE_MOCK_API = process.env.USE_MOCK_API === "true";
