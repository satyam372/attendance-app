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

/**
 * Parses an API date-time. The backend stores UTC; a value without a zone marker is
 * treated as UTC (like core/time.to_office_time), never as the browser's local time.
 */
export function parseApiDateTime(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

function toDate(value) {
  return value instanceof Date ? value : parseApiDateTime(value);
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

/** { time: "9:12", period: "AM" } in the office time zone, for the big clock. */
export function formatClock(value = new Date()) {
  const [time, period] = formatTime(value).split(" ");
  return { time, period };
}

/** "10:30" → "10:30 AM" (settings are plain "HH:MM" strings). */
export function formatHm(hm) {
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** 485 → "8h 05m"; null → "—". */
export function formatDuration(minutes) {
  if (minutes == null) return "—";
  const safe = Math.max(0, Math.floor(minutes));
  return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, "0")}m`;
}

/** Whole minutes between two date-times (API strings or Dates). */
export function minutesBetween(from, to) {
  return Math.floor((toDate(to) - toDate(from)) / 60000);
}

/** The seven "YYYY-MM-DD" keys of the Monday-to-Sunday week containing dateKey. */
export function weekOf(dateKey) {
  const monday = addDays(dateKey, -((weekdayOf(dateKey) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** { year, month } (month 1-12) of a "YYYY-MM-DD" key. */
export function monthOf(dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month };
}

/** "Mon", "Tue", ... for a "YYYY-MM-DD" key. */
export function shortWeekday(dateKey) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekdayOf(dateKey)];
}
