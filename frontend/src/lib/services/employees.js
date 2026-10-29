import { apiFetch, USE_MOCK_API } from "../api.js";
import * as mock from "../mock/employees.js";

// HR people and holiday management (backend routes/employees.py and routes/holidays.py).

/** GET /employees (HR) → EmployeePublic[]: id, name, email, role, reports_to_id, is_active, must_change_password, created_at. */
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

/** PATCH /holidays/{id} (HR) with { is_active } → HolidayPublic. false removes it (soft delete), true restores it. 404 if unknown. */
export function setHolidayActive(id, isActive) {
  if (USE_MOCK_API) return mock.setHolidayActive(id, isActive);
  return apiFetch(`/holidays/${id}`, { method: "PATCH", body: { is_active: isActive } });
}

/** PATCH /employees/{id} (HR) with { is_active } → EmployeePublic. 409 when deactivating yourself, 404 if unknown. */
export function setEmployeeActive(id, isActive) {
  if (USE_MOCK_API) return mock.setEmployeeActive(id, isActive);
  return apiFetch(`/employees/${id}`, { method: "PATCH", body: { is_active: isActive } });
}
