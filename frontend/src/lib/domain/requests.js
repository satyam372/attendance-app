import { LeaveCategory, LeaveHalf, RequestType } from "./enums.js";
import { workingDaysInRange } from "./rules.js";

// Building and checking a leave/WFH request before POST /api/requests.
// The checks mirror backend RequestBase.check_combination and services/request.create_request,
// so most mistakes are caught before sending; the backend stays the source of truth.

export const RequestKind = Object.freeze({ LEAVE: "LEAVE", WFH: "WFH" });

export const Duration = Object.freeze({
  FULL: "FULL", // one or more full days
  HALF: "HALF", // half day (leave: other half in office; WFH: other half in office)
  HALF_WFH: "HALF_WFH", // leave only: half leave + half WFH
});

export const CATEGORY_LABELS = Object.freeze({
  [LeaveCategory.CASUAL]: "Casual leave",
  [LeaveCategory.SICK]: "Sick leave",
  [LeaveCategory.EARNED]: "Earned leave",
  [LeaveCategory.OPTIONAL_HOLIDAY]: "Optional holiday",
});

export const HALF_LABELS = Object.freeze({
  [LeaveHalf.FIRST_HALF]: "First half",
  [LeaveHalf.SECOND_HALF]: "Second half",
});

export const REQUEST_TYPE_LABELS = Object.freeze({
  [RequestType.FULL_LEAVE]: "Full day leave",
  [RequestType.HALF_DAY_LEAVE]: "Half day leave",
  [RequestType.HALF_LEAVE_HALF_WFH]: "Half day leave + half WFH",
  [RequestType.HALF_WFH]: "Half day WFH",
  [RequestType.FULL_WFH]: "Full day WFH",
});

/** The RequestType for a form choice. */
export function requestTypeFor(kind, duration) {
  if (kind === RequestKind.WFH) return duration === Duration.HALF ? RequestType.HALF_WFH : RequestType.FULL_WFH;
  if (duration === Duration.HALF) return RequestType.HALF_DAY_LEAVE;
  if (duration === Duration.HALF_WFH) return RequestType.HALF_LEAVE_HALF_WFH;
  return RequestType.FULL_LEAVE;
}

const isHalfDayType = (type) => [RequestType.HALF_DAY_LEAVE, RequestType.HALF_LEAVE_HALF_WFH].includes(type);
const isLeaveType = (type) => [RequestType.FULL_LEAVE, RequestType.HALF_DAY_LEAVE, RequestType.HALF_LEAVE_HALF_WFH].includes(type);

/**
 * Builds the POST /api/requests body from the form state.
 * form: { kind, duration, category, fromDate, toDate, leaveHalf, holidayId, reason }
 */
export function buildRequest(form, holidays = []) {
  const optionalHoliday = form.kind === RequestKind.LEAVE && form.category === LeaveCategory.OPTIONAL_HOLIDAY;
  const type = optionalHoliday ? RequestType.FULL_LEAVE : requestTypeFor(form.kind, form.duration);
  const holiday = optionalHoliday ? holidays.find((h) => h.id === form.holidayId) : null;
  const single = optionalHoliday || isHalfDayType(type) || type === RequestType.HALF_WFH;
  const fromDate = optionalHoliday ? (holiday?.holiday_date ?? "") : form.fromDate;
  const reason = form.reason?.trim();

  return {
    request_type: type,
    from_date: fromDate,
    to_date: single ? fromDate : form.toDate,
    leave_half: isHalfDayType(type) ? form.leaveHalf : null,
    leave_category: isLeaveType(type) ? form.category : null,
    holiday_id: optionalHoliday ? (holiday?.id ?? null) : null,
    reason: reason ? reason : null,
  };
}

/**
 * Field errors for a request body ({} when valid). `closedHolidays` is a Set of "YYYY-MM-DD"
 * dates of non-optional holidays (they are not working days).
 */
export function validateRequest(body, { closedHolidays = new Set() } = {}) {
  const errors = {};
  if (body.leave_category === LeaveCategory.OPTIONAL_HOLIDAY) {
    if (!body.holiday_id) errors.holiday = "Choose an optional holiday.";
    return errors;
  }
  if (!body.from_date) errors.from = "Choose a date.";
  if (!body.to_date) errors.to = "Choose an end date.";
  if (body.from_date && body.to_date && body.to_date < body.from_date) errors.to = "The end date must be on or after the start date.";
  if (isHalfDayType(body.request_type) && !body.leave_half) errors.half = "Choose which half you are on leave.";
  if (isLeaveType(body.request_type) && !body.leave_category) errors.category = "Choose a leave type.";
  if (body.reason && body.reason.length > 500) errors.reason = "Keep the reason under 500 characters.";
  if (!errors.from && !errors.to && workingDaysInRange(body.from_date, body.to_date, closedHolidays).length === 0) {
    errors.from = "These dates are all weekends or holidays.";
  }
  return errors;
}

/** Days the request counts for: working days in the range, half-day types count 0.5. */
export function requestDays(body, closedHolidays = new Set()) {
  if (!body.from_date || !body.to_date || body.to_date < body.from_date) return 0;
  const days = workingDaysInRange(body.from_date, body.to_date, closedHolidays).length;
  return isHalfDayType(body.request_type) || body.request_type === RequestType.HALF_WFH ? days * 0.5 : days;
}
