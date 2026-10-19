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
