import { BUSINESS_RULES } from "./config.js";

// Date-times come from the API as UTC ISO strings; everything shown or evaluated
// for business rules uses the office time zone (Asia/Kolkata). Plain dates are
// "YYYY-MM-DD" keys, the same format the API uses for work_date and holiday_date.

const TZ = BUSINESS_RULES.timezone;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function zonedParts(value) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(toDate(value)).map((p) => [p.type, p.value]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

/** "10:30" → 630 */
export function parseHm(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight in the office time zone, for a Date or ISO string. */
export function minutesInOfficeTz(value) {
  const { hour, minute } = zonedParts(value);
  return hour * 60 + minute;
}

/** "YYYY-MM-DD" in the office time zone. */
export function toDateKey(value = new Date()) {
  const { year, month, day } = zonedParts(value);
  return `${year}-${month}-${day}`;
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" key, independent of the browser time zone. */
export function weekdayOf(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isWeekend(dateKey) {
  const day = weekdayOf(dateKey);
  return day === 0 || day === 6;
}

/** Adds whole days to a "YYYY-MM-DD" key. */
export function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "10:42 AM" in the office time zone. */
export function formatTime(value) {
  return toDate(value)
    .toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();
}

/** "Monday, 12 October 2026" in the office time zone. */
export function formatLongDate(value = new Date()) {
  return toDate(value).toLocaleDateString("en-IN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
