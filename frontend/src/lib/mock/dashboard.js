import { ApiError } from "../api.js";
import { LeavePortion, Role } from "../domain/enums.js";
import { Punctuality, punctuality } from "../domain/rules.js";
import { isWeekend, toDateKey } from "../domain/time.js";
import { currentEmployee } from "./auth.js";
import { activeHolidays, delay, getDb } from "./db.js";

// Mock of /api/dashboard/* (HR only). Mirrors backend services/dashboard.py: every active
// employee who had joined by the day gets exactly one status; the summary counts those same
// statuses, so the cards and the team list always agree.

function requireHr() {
  const user = currentEmployee();
  if (user.role !== Role.HR) throw new ApiError(403, "You do not have permission to do this");
}

function targetDay(day) {
  const today = toDateKey();
  const target = day || today;
  if (target > today) throw new ApiError(422, "day cannot be in the future");
  return target;
}

function isWorkingDay(db, day) {
  return !isWeekend(day) && !activeHolidays(db).some((h) => h.holiday_date === day && !h.is_optional);
}

function statusOf(row, workingDay, day, today) {
  if (row) {
    if (row.leave_portion === LeavePortion.FULL) return "LEAVE";
    if (row.leave_portion === LeavePortion.HALF) return "HALF_DAY_LEAVE";
    // Counted as working only once checked in; an approved WFH without a check-in is not
    if (row.in_time && row.work_mode) return row.work_mode;
  }
  if (!workingDay) return isWeekend(day) ? "WEEKEND" : "HOLIDAY";
  return day === today ? "NOT_CHECKED_IN" : "ABSENT";
}

function teamDay(day) {
  const db = getDb();
  const today = toDateKey();
  const workingDay = isWorkingDay(db, day);
  return db.employees
    .filter((e) => e.is_active && toDateKey(e.created_at) <= day)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((employee) => {
      const row = db.attendance.find((r) => r.employee_id === employee.id && r.work_date === day);
      return {
        employee_id: employee.id,
        name: employee.name,
        status: statusOf(row, workingDay, day, today),
        work_mode: row?.work_mode ?? null,
        leave_half: row?.leave_half ?? null,
        in_time: row?.in_time ?? null,
        out_time: row?.out_time ?? null,
        punctuality: punctuality(row?.in_time ?? null, row?.leave_portion ?? LeavePortion.NONE, { workingDay }),
        attendance_id: row?.id ?? null,
      };
    });
}

export async function getTeamDay(day) {
  await delay(300);
  requireHr();
  return teamDay(targetDay(day));
}

const BUCKETS = { OFFICE: "in_office", WFH: "wfh", HYBRID: "hybrid", LEAVE: "on_leave", HALF_DAY_LEAVE: "half_day_leave" };

export async function getDaySummary(day) {
  await delay(250);
  requireHr();
  const target = targetDay(day);
  const members = teamDay(target);
  const counts = { in_office: 0, wfh: 0, hybrid: 0, on_leave: 0, half_day_leave: 0 };
  for (const member of members) if (BUCKETS[member.status]) counts[BUCKETS[member.status]] += 1;
  const bucketed = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    work_date: target,
    is_working_day: isWorkingDay(getDb(), target),
    team_size: members.length,
    ...counts,
    not_checked_in: members.length - bucketed,
    late: members.filter((m) => m.punctuality === Punctuality.LATE).length,
  };
}
