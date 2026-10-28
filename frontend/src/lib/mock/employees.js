import { ApiError } from "../api.js";
import { Role } from "../domain/enums.js";
import { currentEmployee } from "./auth.js";
import { delay, getDb, publicEmployee, saveDb } from "./db.js";
import { uuid } from "./uuid.js";

// Mock of /api/employees (HR only) and POST /api/holidays (HR only). Mirrors backend
// routes/employees.py, services/employee.py and routes/holidays.py.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireHr() {
  const user = currentEmployee();
  if (user.role !== Role.HR) throw new ApiError(403, "You do not have permission to do this");
}

/** GET /employees → EmployeePublic[] (with id, no password), sorted by name. */
export async function listEmployees() {
  await delay(300);
  requireHr();
  return [...getDb().employees].sort((a, b) => a.name.localeCompare(b.name)).map(publicEmployee);
}

/** POST /employees with EmployeeCreate → 201 EmployeePublic (must_change_password true). */
export async function createEmployee(body) {
  await delay(450);
  requireHr();
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!name || name.length > 100) throw new ApiError(422, "String should have at least 1 character");
  if (!EMAIL_PATTERN.test(email)) throw new ApiError(422, "value is not a valid email address");
  if (!body.password || body.password.length < 8) throw new ApiError(422, "String should have at least 8 characters");
  if (new TextEncoder().encode(body.password).length > 72) throw new ApiError(422, "Password must be at most 72 bytes");
  const db = getDb();
  if (db.employees.some((e) => e.email === email)) throw new ApiError(409, "An employee with this email already exists");

  const employee = {
    id: uuid(),
    name,
    email,
    role: body.role ?? Role.EMPLOYEE,
    reports_to_id: null,
    is_active: body.is_active ?? true,
    must_change_password: true,
    created_at: new Date().toISOString(),
    password: body.password, // mock only: lets the new account sign in with the temporary password
  };
  db.employees.push(employee);
  saveDb();
  return publicEmployee(employee);
}

/** POST /holidays with HolidayCreate → 201 HolidayPublic. */
export async function createHoliday(body) {
  await delay(400);
  requireHr();
  const name = body.name?.trim() ?? "";
  if (!name || name.length > 100) throw new ApiError(422, "String should have at least 1 character");
  const db = getDb();
  if (db.holidays.some((h) => h.holiday_date === body.holiday_date)) throw new ApiError(409, "A holiday already exists on this date");
  const holiday = { id: uuid(), name, holiday_date: body.holiday_date, is_optional: Boolean(body.is_optional) };
  db.holidays.push(holiday);
  saveDb();
  return holiday;
}
