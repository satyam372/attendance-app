import { BUSINESS_RULES } from "./config.js";
import { LeaveHalf, LeavePortion, RequestType, WorkMode } from "./enums.js";
import { addDays, isWeekend, minutesInOfficeTz, parseHm } from "./time.js";

// Business rules from CLAUDE.md and docs/schema.md. The backend is the source of
// truth; the frontend uses these to display state and to validate before sending.

/** Latest on-time check-in, in minutes since midnight: office start + grace (11:00). */
export function lateThresholdMinutes(rules = BUSINESS_RULES) {
  return parseHm(rules.officeStart) + rules.lateBufferMin;
}

/**
 * Late = check-in after office start + grace. 11:00 exactly is on time.
 * Never late on a leave day: on a half-day leave the employee checks in for the working half.
 */
export function isLate(attendance, rules = BUSINESS_RULES) {
  if (!attendance?.in_time) return false;
  if (attendance.leave_portion && attendance.leave_portion !== LeavePortion.NONE) return false;
  return minutesInOfficeTz(attendance.in_time) > lateThresholdMinutes(rules);
}

/** "none" | "ontime" (by office start) | "grace" (within the buffer) | "late". */
export function inTimeBucket(inTime, rules = BUSINESS_RULES) {
  if (!inTime) return "none";
  const minutes = minutesInOfficeTz(inTime);
  if (minutes <= parseHm(rules.officeStart)) return "ontime";
  if (minutes <= lateThresholdMinutes(rules)) return "grace";
  return "late";
}

/**
 * How much of one attendance day counts towards the monthly free WFH limit
 * (schema.md, "How a request maps to attendance").
 */
export function wfhWeight(attendance) {
  if (!attendance) return 0;
  const { work_mode: mode, leave_portion: leave = LeavePortion.NONE } = attendance;
  if (leave === LeavePortion.FULL) return 0;
  if (leave === LeavePortion.HALF) return mode === WorkMode.WFH ? 0.5 : 0;
  if (mode === WorkMode.WFH) return 1;
  if (mode === WorkMode.HYBRID) return 0.5;
  return 0;
}

/** Total WFH days used in a list of attendance rows (half days count 0.5). */
export function wfhDaysUsed(attendanceRows) {
  return attendanceRows.reduce((sum, row) => sum + wfhWeight(row), 0);
}

/** Weekends and corporate holidays are not working days. */
export function isWorkingDay(dateKey, holidayDates = new Set()) {
  return !isWeekend(dateKey) && !holidayDates.has(dateKey);
}

/** Working days from..to inclusive ("YYYY-MM-DD"), skipping weekends and holidays. */
export function workingDaysInRange(from, to, holidayDates = new Set()) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (isWorkingDay(day, holidayDates)) days.push(day);
  }
  return days;
}

const REQUEST_TO_ATTENDANCE = Object.freeze({
  [RequestType.FULL_WFH]: { work_mode: WorkMode.WFH, leave_portion: LeavePortion.NONE },
  [RequestType.HALF_WFH]: { work_mode: WorkMode.HYBRID, leave_portion: LeavePortion.NONE },
  [RequestType.HALF_DAY_LEAVE]: { work_mode: WorkMode.OFFICE, leave_portion: LeavePortion.HALF },
  [RequestType.HALF_LEAVE_HALF_WFH]: { work_mode: WorkMode.WFH, leave_portion: LeavePortion.HALF },
  [RequestType.FULL_LEAVE]: { work_mode: null, leave_portion: LeavePortion.FULL },
});

/** The attendance fields an approved request sets for each of its days. */
export function attendanceForRequest(requestType, leaveHalf = null) {
  const base = REQUEST_TO_ATTENDANCE[requestType];
  if (!base) throw new Error(`Unknown request type: ${requestType}`);
  const half = base.leave_portion === LeavePortion.HALF;
  if (half && !Object.values(LeaveHalf).includes(leaveHalf)) {
    throw new Error(`${requestType} needs leave_half (FIRST_HALF or SECOND_HALF)`);
  }
  return { ...base, leave_half: half ? leaveHalf : null };
}

export function involvesWfh(requestType) {
  return [RequestType.FULL_WFH, RequestType.HALF_WFH, RequestType.HALF_LEAVE_HALF_WFH].includes(requestType);
}

export function involvesLeave(requestType) {
  return [RequestType.FULL_LEAVE, RequestType.HALF_DAY_LEAVE, RequestType.HALF_LEAVE_HALF_WFH].includes(requestType);
}
