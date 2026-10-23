import { apiFetch, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/attendance.js";

// Attendance endpoints (backend/app/api/routes/attendance.py).

/** GET /attendance/today → { work_date, attendance | null, wfh_used, wfh_free, is_working_day } */
export function getToday() {
  if (USE_MOCK_API) return mock.getToday();
  return apiFetch("/attendance/today");
}

/** POST /attendance/check-in with work_mode OFFICE or WFH → AttendancePublic. 409 with a message when not allowed. */
export function checkIn(workMode, location) {
  if (USE_MOCK_API) return mock.checkIn({ work_mode: workMode, location });
  return apiFetch("/attendance/check-in", { method: "POST", body: { work_mode: workMode, location } });
}

/** POST /attendance/check-out → AttendancePublic. */
export function checkOut() {
  if (USE_MOCK_API) return mock.checkOut();
  return apiFetch("/attendance/check-out", { method: "POST" });
}

/** GET /attendance/history?year&month → AttendanceDay[] (newest first, up to today). */
export function getHistory({ year, month }) {
  if (USE_MOCK_API) return mock.getHistory({ year, month });
  return apiFetch(`/attendance/history?year=${year}&month=${month}`);
}
