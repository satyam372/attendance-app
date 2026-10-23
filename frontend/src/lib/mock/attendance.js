import { ApiError } from "../api.js";
import { BUSINESS_RULES } from "../domain/config.js";
import { LeavePortion, WorkMode } from "../domain/enums.js";
import { Punctuality, punctuality } from "../domain/rules.js";
import { addDays, isWeekend, minutesBetween, minutesInOfficeTz, monthOf, parseHm, toDateKey } from "../domain/time.js";
import { currentEmployee } from "./auth.js";
import { delay, getDb, saveDb } from "./db.js";
import { openRequestStatusByDay } from "./requests.js";
import { uuid } from "./uuid.js";

// Mock of /api/attendance/*. Mirrors backend/app/services/attendance.py and
// routes/attendance.py: same rules, response shapes, status codes and messages.

const conflict = (detail) => new ApiError(409, detail);
const MESSAGES = {
  alreadyCheckedIn: "You have already checked in today.",
  alreadyCheckedOut: "You have already checked out.",
  onLeave: "You are on leave today.",
  wfhLimit: "You have used your free WFH days this month. Raise a WFH request instead.",
  notCheckedIn: "You have not checked in yet.",
};

function closedHolidays(db) {
  return new Map(db.holidays.filter((h) => !h.is_optional).map((h) => [h.holiday_date, h]));
}

function isWorkingDay(db, day) {
  return !isWeekend(day) && !closedHolidays(db).has(day);
}

function dayRow(db, employeeId, day) {
  return db.attendance.find((row) => row.employee_id === employeeId && row.work_date === day);
}

/** Full WFH = 1, HYBRID or half leave + WFH = 0.5; weekends and holidays never count. */
function countWfhUsed(db, employeeId, year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return db.attendance
    .filter((row) => row.employee_id === employeeId && row.work_date.startsWith(prefix))
    .filter((row) => row.work_mode === WorkMode.WFH || row.work_mode === WorkMode.HYBRID)
    .filter((row) => isWorkingDay(db, row.work_date))
    .reduce((sum, row) => sum + (row.work_mode === WorkMode.HYBRID || row.leave_portion === LeavePortion.HALF ? 0.5 : 1), 0);
}

function toPublic(db, row) {
  const { request_id, updated_by_id, ...fields } = row;
  const p = punctuality(row.in_time, row.leave_portion, { workingDay: isWorkingDay(db, row.work_date) });
  return { ...fields, is_late: row.in_time ? p === Punctuality.LATE : null };
}

export async function getToday() {
  await delay(250);
  const db = getDb();
  const employee = currentEmployee();
  const today = toDateKey();
  const row = dayRow(db, employee.id, today);
  const { year, month } = monthOf(today);
  return {
    work_date: today,
    attendance: row ? toPublic(db, row) : null,
    wfh_used: countWfhUsed(db, employee.id, year, month),
    wfh_free: BUSINESS_RULES.wfhFreeDaysPerMonth,
    is_working_day: isWorkingDay(db, today),
  };
}

// The mock needs a location like the backend does, but does not check the office distance
export async function checkIn({ work_mode, location }) {
  await delay(450);
  if (work_mode !== WorkMode.OFFICE && work_mode !== WorkMode.WFH) {
    throw new ApiError(422, "Choose OFFICE or WFH");
  }
  if (!location) {
    throw new ApiError(422, "Field required");
  }
  const db = getDb();
  const employee = currentEmployee();
  const now = new Date().toISOString();
  const today = toDateKey(now);
  let row = dayRow(db, employee.id, today);

  if (row?.in_time) throw conflict(MESSAGES.alreadyCheckedIn);
  if (row?.leave_portion === LeavePortion.FULL) throw conflict(MESSAGES.onLeave);

  let mode = work_mode;
  // An approved request or an HR correction already decided today's mode
  if (row?.work_mode && (row.request_id || row.updated_by_id)) {
    mode = row.work_mode;
  } else if (mode === WorkMode.WFH && isWorkingDay(db, today)) {
    const { year, month } = monthOf(today);
    if (countWfhUsed(db, employee.id, year, month) >= BUSINESS_RULES.wfhFreeDaysPerMonth) {
      throw conflict(MESSAGES.wfhLimit);
    }
  }

  if (!row) {
    row = {
      id: uuid(),
      employee_id: employee.id,
      work_date: today,
      leave_portion: LeavePortion.NONE,
      leave_half: null,
      out_time: null,
      request_id: null,
      updated_by_id: null,
    };
    db.attendance.push(row);
  }
  row.work_mode = mode;
  row.in_time = now;
  saveDb();
  return toPublic(db, row);
}

export async function checkOut() {
  await delay(450);
  const db = getDb();
  const employee = currentEmployee();
  const now = new Date().toISOString();
  const today = toDateKey(now);
  let row = dayRow(db, employee.id, today);

  // Before office opens, a check-out closes yesterday's open late-night check-in
  const earlyMorning = minutesInOfficeTz(now) < parseHm(BUSINESS_RULES.officeStart);
  if ((!row || !row.in_time) && earlyMorning) {
    const yesterday = dayRow(db, employee.id, addDays(today, -1));
    if (yesterday?.in_time && !yesterday.out_time) row = yesterday;
  }

  if (!row || !row.in_time) throw conflict(MESSAGES.notCheckedIn);
  if (row.out_time) throw conflict(MESSAGES.alreadyCheckedOut);
  row.out_time = now;
  saveDb();
  return toPublic(db, row);
}

/** One entry per day of the month up to today, newest first (backend get_month_history). */
export async function getHistory({ year, month } = {}) {
  await delay(300);
  const db = getDb();
  const employee = currentEmployee();
  const today = toDateKey();
  const target = year && month ? { year, month } : monthOf(today);
  const start = `${target.year}-${String(target.month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(target.year, target.month, 0)).toISOString().slice(0, 10);
  const joined = toDateKey(employee.created_at);
  const first = start > joined ? start : joined;
  const last = end < today ? end : today;
  if (first > last) return [];

  const holidays = new Map(db.holidays.map((h) => [h.holiday_date, h]));
  const requestStatus = openRequestStatusByDay(employee.id, first, last);
  const days = [];
  for (let day = last; day >= first; day = addDays(day, -1)) {
    const row = dayRow(db, employee.id, day);
    const holiday = holidays.get(day);
    const closedHoliday = holiday && !holiday.is_optional ? holiday : null;
    if (!row && isWeekend(day)) continue;

    const workingDay = !isWeekend(day) && !closedHoliday;
    let status;
    if (row?.leave_portion === LeavePortion.FULL) status = "LEAVE";
    else if (row?.leave_portion === LeavePortion.HALF) status = "HALF_DAY_LEAVE";
    else if (row?.work_mode) status = row.work_mode;
    else if (closedHoliday) status = "HOLIDAY";
    else if (workingDay && requestStatus.get(day) === "PENDING") status = "AWAITING_APPROVAL";
    else if (workingDay && requestStatus.get(day) === "REJECTED") status = "REJECTED";
    else status = day === today ? "NOT_CHECKED_IN" : "ABSENT";

    const inTime = row?.in_time ?? null;
    const outTime = row?.out_time ?? null;
    days.push({
      work_date: day,
      status,
      holiday_name: holiday?.name ?? null,
      in_time: inTime,
      out_time: outTime,
      worked_minutes: inTime && outTime ? minutesBetween(inTime, outTime) : null,
      punctuality: punctuality(inTime, row?.leave_portion ?? LeavePortion.NONE, { workingDay }),
    });
  }
  return days;
}
