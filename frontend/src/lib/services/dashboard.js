import { apiFetch, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/dashboard.js";

// HR dashboard (backend routes/dashboard.py). HR only; `day` is "YYYY-MM-DD", omitted = today
// in Pune (the server decides "today", never the browser clock). Future days are rejected (422).

const dayQuery = (day) => (day ? `?day=${day}` : "");

/** GET /dashboard/today → DaySummary (counts for the cards). */
export function getDaySummary(day) {
  if (USE_MOCK_API) return mock.getDaySummary(day);
  return apiFetch(`/dashboard/today${dayQuery(day)}`);
}

/** GET /dashboard/today/team → TeamMemberDay[] (one per active employee, sorted by name). */
export function getTeamDay(day) {
  if (USE_MOCK_API) return mock.getTeamDay(day);
  return apiFetch(`/dashboard/today/team${dayQuery(day)}`);
}
