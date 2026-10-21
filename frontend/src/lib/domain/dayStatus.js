import { Punctuality } from "./rules.js";

// Maps one GET /attendance/history day (AttendanceDay) to what the attendance screens show:
// a category (drives the colour), a label and a short note. Categories follow the
// Attendance artboard legend: present, late, absent, leave, holiday, plus pending and today.

export const Category = Object.freeze({
  PRESENT: "present",
  LATE: "late",
  ABSENT: "absent",
  LEAVE: "leave",
  HOLIDAY: "holiday",
  PENDING: "pending",
  TODAY: "today",
  NONE: "none", // weekends, future days, days before joining
});

const MODE_LABEL = { OFFICE: "Office", WFH: "Work from home", HYBRID: "Half WFH" };

/** { category, label, mode } for an AttendanceDay, or NONE when there is no entry. */
export function describeDay(day) {
  if (!day) return { category: Category.NONE, label: "No record", mode: null };
  const mode = MODE_LABEL[day.status] ?? null;
  switch (day.status) {
    case "OFFICE":
    case "WFH":
    case "HYBRID":
      return day.punctuality === Punctuality.LATE
        ? { category: Category.LATE, label: "Late", mode }
        : { category: Category.PRESENT, label: "Present", mode };
    case "HALF_DAY_LEAVE":
      return { category: Category.LEAVE, label: "Half-day leave", mode: day.in_time ? "Worked the other half" : null };
    case "LEAVE":
      return { category: Category.LEAVE, label: "On leave", mode: null };
    case "HOLIDAY":
      return { category: Category.HOLIDAY, label: day.holiday_name ?? "Holiday", mode: null };
    case "AWAITING_APPROVAL":
      return { category: Category.PENDING, label: "Awaiting approval", mode: null };
    case "REJECTED":
      return { category: Category.ABSENT, label: "Request rejected", mode: null };
    case "ABSENT":
      return { category: Category.ABSENT, label: "Absent", mode: null };
    case "NOT_CHECKED_IN":
      return { category: Category.TODAY, label: "Not checked in yet", mode: null };
    case "WEEKEND":
      return { category: Category.NONE, label: "Weekend", mode: null };
    default:
      return { category: Category.NONE, label: day.status, mode: null };
  }
}

/** Month totals for the summary cards. Half-day leave counts 0.5. */
export function summarizeMonth(days) {
  const totals = { present: 0, late: 0, absent: 0, leave: 0, workedMinutes: 0 };
  for (const day of days) {
    if (day.in_time) totals.present += 1;
    if (day.punctuality === Punctuality.LATE) totals.late += 1;
    if (day.status === "ABSENT" || day.status === "REJECTED") totals.absent += 1;
    if (day.status === "LEAVE") totals.leave += 1;
    if (day.status === "HALF_DAY_LEAVE") totals.leave += 0.5;
    totals.workedMinutes += day.worked_minutes ?? 0;
  }
  return totals;
}
