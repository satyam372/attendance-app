import { apiFetch, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/employees.js";

// HR people and holiday management (backend routes/employees.py and routes/holidays.py).

/** GET /employees (HR) → EmployeeBase[]: name, email, role, reports_to_id, is_active. No ids yet. */
export function listEmployees() {
  if (USE_MOCK_API) return mock.listEmployees();
  return apiFetch("/employees");
}

/** POST /employees (HR) with { name, email, role, password } → 201 EmployeePublic. 409 if the email exists. */
export function createEmployee(body) {
  if (USE_MOCK_API) return mock.createEmployee(body);
  return apiFetch("/employees", { method: "POST", body });
}

/** POST /holidays (HR) with { name, holiday_date, is_optional } → 201 HolidayPublic. 409 if the date has one. */
export function createHoliday(body) {
  if (USE_MOCK_API) return mock.createHoliday(body);
  return apiFetch("/holidays", { method: "POST", body });
}
