import { ApiError } from "../api.js";
import { approverName, decisionRight } from "../domain/approvals.js";
import { LeaveCategory, LeavePortion, Role, WorkMode } from "../domain/enums.js";
import { validateRequest } from "../domain/requests.js";
import { workingDaysInRange } from "../domain/rules.js";
import { currentEmployee } from "./auth.js";
import { activeHolidays, delay, getDb, saveDb } from "./db.js";
import { uuid } from "./uuid.js";

// Mock of /api/holidays (GET) and /api/requests (POST, GET, decision). Mirrors backend
// routes/requests.py and services/request.py: same checks, status codes and messages.

export async function getHolidays() {
  await delay(200);
  currentEmployee(); // login required, like the backend
  return activeHolidays(getDb()).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
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

  const closed = new Set(activeHolidays(db).filter((h) => !h.is_optional).map((h) => h.holiday_date));
  if (workingDaysInRange(body.from_date, body.to_date, closed).length === 0) {
    throw new ApiError(422, "The selected dates are all weekends or holidays.");
  }

  if (body.holiday_id) {
    const holiday = activeHolidays(db).find((h) => h.id === body.holiday_id); // a removed holiday cannot be requested
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
  return withNames(db, request);
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

function requireDecider() {
  const user = currentEmployee();
  if (user.role !== Role.HR && user.role !== Role.MANAGER) throw new ApiError(403, "You do not have permission to do this");
  return user;
}

/** RequestPublic plus who approves it and who decided it, by name (agreed new fields). */
function withNames(db, request) {
  const byId = new Map(db.employees.map((e) => [e.id, e]));
  const requester = byId.get(request.employee_id);
  return {
    ...request,
    approver_name: requester ? approverName(requester, byId) : null,
    decided_by_name: request.decided_by_id ? (byId.get(request.decided_by_id)?.name ?? null) : null,
  };
}

/**
 * GET /requests?status=… (HR or manager): RequestWithEmployee[], newest first. No statuses = all.
 * HR sees every request; a manager sees only the requests they decide (their direct reports).
 */
export async function listRequests(statuses = []) {
  await delay(300);
  const user = requireDecider();
  const db = getDb();
  const byId = new Map(db.employees.map((e) => [e.id, e]));
  return db.requests
    .filter((r) => user.role === Role.HR || decisionRight(user, byId.get(r.employee_id)) === "decide")
    .filter((r) => statuses.length === 0 || statuses.includes(r.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({ ...withNames(db, r), employee_name: byId.get(r.employee_id)?.name ?? "Unknown" }));
}

const ATTENDANCE_VALUES = {
  FULL_LEAVE: { leave_portion: LeavePortion.FULL, leave_half: null, work_mode: null },
  HALF_DAY_LEAVE: { leave_portion: LeavePortion.HALF },
  HALF_LEAVE_HALF_WFH: { leave_portion: LeavePortion.HALF, work_mode: WorkMode.WFH },
  HALF_WFH: { leave_portion: LeavePortion.NONE, leave_half: null, work_mode: WorkMode.HYBRID },
  FULL_WFH: { leave_portion: LeavePortion.NONE, leave_half: null, work_mode: WorkMode.WFH },
};

/** Writes the approved request into attendance, like backend _apply_to_attendance. */
function applyToAttendance(db, request) {
  const closed = new Set(activeHolidays(db).filter((h) => !h.is_optional).map((h) => h.holiday_date));
  const days = workingDaysInRange(request.from_date, request.to_date, closed);
  const rowFor = (day) => db.attendance.find((r) => r.employee_id === request.employee_id && r.work_date === day);
  // Check every day before writing any, so a conflict leaves nothing half-applied
  if (request.request_type === "FULL_LEAVE" && days.some((day) => rowFor(day)?.in_time)) {
    throw new ApiError(409, "The employee already checked in on one of these days, so full-day leave cannot be approved.");
  }
  const values = { ...ATTENDANCE_VALUES[request.request_type] };
  if (request.leave_half) values.leave_half = request.leave_half;
  for (const day of days) {
    let row = rowFor(day);
    if (!row) {
      row = { id: uuid(), employee_id: request.employee_id, work_date: day, work_mode: null, leave_portion: LeavePortion.NONE,
        leave_half: null, in_time: null, out_time: null, updated_by_id: null };
      db.attendance.push(row);
    }
    Object.assign(row, values);
    // Half-day leave keeps the mode chosen at check-in; default to OFFICE
    if (row.leave_portion === LeavePortion.HALF && !row.work_mode) row.work_mode = WorkMode.OFFICE;
    row.request_id = request.id;
  }
}

/** POST /requests/{id}/decision (HR) with APPROVED or REJECTED → RequestPublic. */
export async function decideRequest(id, status) {
  await delay(450);
  const decider = requireDecider();
  if (status !== "APPROVED" && status !== "REJECTED") throw new ApiError(422, "Input should be 'APPROVED' or 'REJECTED'");
  const db = getDb();
  const request = db.requests.find((r) => r.id === id);
  if (!request) throw new ApiError(404, "Request not found.");
  // Manager for their reports, HR for managers/HR (or as an override); never your own request
  const requester = db.employees.find((e) => e.id === request.employee_id);
  if (!decisionRight(decider, requester)) throw new ApiError(403, "You can't decide this request.");
  if (request.status !== "PENDING") throw new ApiError(409, "This request has already been decided.");
  if (status === "APPROVED") applyToAttendance(db, request);
  request.status = status;
  request.decided_by_id = decider.id;
  request.decided_at = new Date().toISOString();
  saveDb();
  return withNames(db, request);
}

/** GET /requests/me: own requests only (the id comes from the session), newest first. */
export async function getMyRequests() {
  await delay(250);
  const employee = currentEmployee();
  const db = getDb();
  return db.requests
    .filter((r) => r.employee_id === employee.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => withNames(db, r));
}
