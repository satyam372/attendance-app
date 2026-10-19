import { ApiError } from "../api.js";
import { LeaveCategory } from "../domain/enums.js";
import { validateRequest } from "../domain/requests.js";
import { workingDaysInRange } from "../domain/rules.js";
import { currentEmployee } from "./auth.js";
import { delay, getDb, saveDb } from "./db.js";
import { uuid } from "./uuid.js";

// Mock of /api/holidays (GET) and /api/requests (POST). Mirrors backend routes/requests.py
// and services/request.create_request: same checks, status codes and messages.

export async function getHolidays() {
  await delay(200);
  currentEmployee(); // login required, like the backend
  return [...getDb().holidays].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
}

export async function createRequest(body) {
  await delay(450);
  const db = getDb();
  const employee = currentEmployee();

  // Pydantic combination rules → 422 (the frontend form normally prevents these)
  const fieldErrors = validateRequest({ ...body, from_date: body.from_date, to_date: body.to_date });
  delete fieldErrors.from; // the working-day check below has its own message, like the backend
  const firstError = Object.values(fieldErrors)[0];
  if (firstError) throw new ApiError(422, firstError);

  const closed = new Set(db.holidays.filter((h) => !h.is_optional).map((h) => h.holiday_date));
  if (workingDaysInRange(body.from_date, body.to_date, closed).length === 0) {
    throw new ApiError(422, "The selected dates are all weekends or holidays.");
  }

  if (body.holiday_id) {
    const holiday = db.holidays.find((h) => h.id === body.holiday_id);
    if (!holiday || !holiday.is_optional || holiday.holiday_date !== body.from_date || body.leave_category !== LeaveCategory.OPTIONAL_HOLIDAY) {
      throw new ApiError(422, "Choose an optional holiday on the selected date.");
    }
  }

  const overlap = db.requests.some(
    (r) =>
      r.employee_id === employee.id &&
      (r.status === "PENDING" || r.status === "APPROVED") &&
      r.from_date <= body.to_date &&
      r.to_date >= body.from_date,
  );
  if (overlap) throw new ApiError(409, "You already have a request for some of these dates.");

  const request = {
    id: uuid(),
    employee_id: employee.id,
    request_type: body.request_type,
    from_date: body.from_date,
    to_date: body.to_date,
    leave_half: body.leave_half ?? null,
    leave_category: body.leave_category ?? null,
    holiday_id: body.holiday_id ?? null,
    reason: body.reason ?? null,
    status: "PENDING",
    decided_by_id: null,
    decided_at: null,
    created_at: new Date().toISOString(),
  };
  db.requests.push(request);
  saveDb();
  return request;
}

/** PENDING or REJECTED per day for one employee (PENDING wins), like backend _open_request_status_by_day. */
export function openRequestStatusByDay(employeeId, first, last) {
  const byDay = new Map();
  for (const request of getDb().requests) {
    if (request.employee_id !== employeeId || !["PENDING", "REJECTED"].includes(request.status)) continue;
    if (request.from_date > last || request.to_date < first) continue;
    for (let day = request.from_date; day <= request.to_date; day = nextDay(day)) {
      if (day >= first && day <= last && byDay.get(day) !== "PENDING") byDay.set(day, request.status);
    }
  }
  return byDay;
}

function nextDay(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
