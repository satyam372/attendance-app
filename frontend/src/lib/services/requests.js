import { apiFetch, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/requests.js";

// Leave/WFH requests and holidays (backend routes/requests.py and routes/holidays.py).

/** GET /holidays → HolidayPublic[] (earliest first). Any signed-in employee. */
export function getHolidays() {
  if (USE_MOCK_API) return mock.getHolidays();
  return apiFetch("/holidays");
}

/** POST /requests → 201 RequestPublic (status PENDING). 422/409 with a message when not allowed. */
export function createRequest(body) {
  if (USE_MOCK_API) return mock.createRequest(body);
  return apiFetch("/requests", { method: "POST", body });
}

/** GET /requests?status=PENDING&status=… (HR) → RequestWithEmployee[], newest first. */
export function listRequests(statuses = []) {
  if (USE_MOCK_API) return mock.listRequests(statuses);
  const query = statuses.map((s) => `status=${encodeURIComponent(s)}`).join("&");
  return apiFetch(`/requests${query ? `?${query}` : ""}`);
}

/** POST /requests/{id}/decision (HR) with { status: "APPROVED" | "REJECTED" } → RequestPublic. */
export function decideRequest(id, status) {
  if (USE_MOCK_API) return mock.decideRequest(id, status);
  return apiFetch(`/requests/${id}/decision`, { method: "POST", body: { status } });
}
