import { LeavePortion, Role, WorkMode } from "../domain/enums.js";
import { addDays, isWeekend, toDateKey } from "../domain/time.js";
import { uuid as randomId } from "./uuid.js";

// In-browser stand-in for the database while the backend is being built.
// Shapes follow docs/schema.md and docs/api-contract.md. Persisted in localStorage
// so state survives reloads; bump STORAGE_KEY when the seed shape changes.
// IDs are UUID strings, like the backend (uuid4).

const STORAGE_KEY = "speedin-mock-db-v6";

// Demo-only password for every seeded account (mock mode only, never a real credential).
export const DEMO_PASSWORD = "speedin123";

function seed() {
  const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const employee = (n, name, email, role = Role.EMPLOYEE) => ({
    id: uuid(n),
    name,
    email,
    role,
    reports_to_id: null,
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T04:30:00Z",
    password: DEMO_PASSWORD,
  });

  const db = {
    employees: [
      employee(1, "HR Admin", "hr@speedinnovations.in", Role.HR),
      employee(2, "Ankur Yadav", "ankur@speedinnovations.in"),
      employee(3, "Sandip Sarode", "sandip@speedinnovations.in"),
      employee(4, "Satyam Pokharna", "satyam@speedinnovations.in", Role.MANAGER),
      employee(5, "Vishwajit Jadhav", "vishwajit@speedinnovations.in"),
      employee(6, "Poorva Shipugade", "poorva@speedinnovations.in"),
      employee(7, "Snehal Avhad", "snehal@speedinnovations.in"),
    ],
    holidays: [
      { id: uuid(101), name: "Republic Day", holiday_date: "2026-01-26", is_optional: false },
      { id: uuid(102), name: "Holi", holiday_date: "2026-03-04", is_optional: false },
      { id: uuid(103), name: "Gudi Padwa", holiday_date: "2026-03-19", is_optional: false },
      { id: uuid(104), name: "Maharashtra Day", holiday_date: "2026-05-01", is_optional: false },
      { id: uuid(105), name: "Independence Day", holiday_date: "2026-08-15", is_optional: false },
      { id: uuid(106), name: "Ganesh Chaturthi", holiday_date: "2026-09-14", is_optional: false },
      { id: uuid(107), name: "Gandhi Jayanti", holiday_date: "2026-10-02", is_optional: false },
      { id: uuid(108), name: "Dussehra", holiday_date: "2026-10-20", is_optional: false },
      { id: uuid(109), name: "Diwali (Padwa)", holiday_date: "2026-11-09", is_optional: false },
      { id: uuid(110), name: "Bhai Dooj", holiday_date: "2026-11-11", is_optional: false },
      { id: uuid(112), name: "Dhanteras (optional)", holiday_date: "2026-11-06", is_optional: true },
      { id: uuid(113), name: "Guru Nanak Jayanti (optional)", holiday_date: "2026-11-24", is_optional: true },
      { id: uuid(111), name: "Christmas", holiday_date: "2026-12-25", is_optional: false },
    ],
    attendance: [],
    requests: [],
  };
  // Approvals go to the manager: every employee reports to Satyam; his own requests go to HR
  for (const e of db.employees) if (e.role === Role.EMPLOYEE) e.reports_to_id = uuid(4);
  return db;
}

/** UTC ISO string for a time of day in India (UTC+5:30) on a "YYYY-MM-DD" date. */
function istToUtc(dateKey, minutesOfDay) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutesOfDay - 330)).toISOString();
}

/**
 * Plausible attendance from the start of last month up to yesterday, generated relative to
 * today so the demo always has history. Deterministic: same seed every time.
 * Sandip has used both free WFH days this month (to demo the limit); Ankur has used one.
 */
function seedAttendance(db) {
  const today = toDateKey();
  const [y, m] = today.split("-").map(Number);
  const firstOfLastMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const closed = new Set(activeHolidays(db).filter((h) => !h.is_optional).map((h) => h.holiday_date));
  const rows = [];

  db.employees.forEach((employee, e) => {
    let i = 0;
    let wfhThisMonth = 0;
    for (let day = firstOfLastMonth; day < today; day = addDays(day, 1)) {
      if (isWeekend(day) || closed.has(day)) continue;
      i += 1;
      const base = { id: randomId(), employee_id: employee.id, work_date: day, leave_half: null, request_id: null, updated_by_id: null };
      if ((i + e * 3) % 17 === 0) {
        rows.push({ ...base, work_mode: null, leave_portion: LeavePortion.FULL, in_time: null, out_time: null });
        continue;
      }
      const inMinutes = 600 + ((i * 37 + e * 11) % 75); // 10:00 to 11:14
      const worked = 510 + ((i * 7 + e) % 50);
      let mode = WorkMode.OFFICE;
      const inMonth = day.startsWith(thisMonth);
      if (employee.email.startsWith("sandip") && inMonth && wfhThisMonth < 2) mode = WorkMode.WFH;
      else if (employee.email.startsWith("ankur") && inMonth && wfhThisMonth < 1) mode = WorkMode.WFH;
      else if (!inMonth && (i + e) % 9 === 0) mode = WorkMode.WFH;
      if (mode === WorkMode.WFH && inMonth) wfhThisMonth += 1;
      rows.push({
        ...base,
        work_mode: mode,
        leave_portion: LeavePortion.NONE,
        in_time: istToUtc(day, inMinutes),
        out_time: istToUtc(day, inMinutes + worked),
      });
    }
  });
  db.attendance = rows;
  return seedRequests(db);
}

/** A few requests relative to today: two pending with the manager, one pending with HR, two decided. */
function seedRequests(db) {
  const today = toDateKey();
  const closed = new Set(activeHolidays(db).filter((h) => !h.is_optional).map((h) => h.holiday_date));
  const workingAfter = (day, n) => {
    let d = day;
    for (let found = 0; found < n; ) {
      d = addDays(d, 1);
      if (!isWeekend(d) && !closed.has(d)) found += 1;
    }
    return d;
  };
  const byEmail = (start) => db.employees.find((e) => e.email.startsWith(start)).id;
  const hr = byEmail("hr");
  const manager = byEmail("satyam");
  const base = { holiday_id: null, decided_by_id: null, decided_at: null, leave_half: null };
  db.requests = [
    { ...base, id: randomId(), employee_id: byEmail("poorva"), request_type: "FULL_LEAVE", leave_category: "CASUAL",
      from_date: workingAfter(today, 3), to_date: workingAfter(today, 4), reason: "Cousin's wedding", status: "PENDING",
      created_at: new Date(Date.now() - 26 * 3600e3).toISOString() },
    { ...base, id: randomId(), employee_id: byEmail("snehal"), request_type: "FULL_WFH", leave_category: null,
      from_date: workingAfter(today, 1), to_date: workingAfter(today, 1), reason: "Internet technician visiting at home", status: "PENDING",
      created_at: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { ...base, id: randomId(), employee_id: byEmail("vishwajit"), request_type: "HALF_DAY_LEAVE", leave_category: "SICK", leave_half: "SECOND_HALF",
      from_date: workingAfter(today, 2), to_date: workingAfter(today, 2), reason: "Doctor's appointment", status: "APPROVED",
      decided_by_id: manager, decided_at: new Date(Date.now() - 20 * 3600e3).toISOString(), created_at: new Date(Date.now() - 50 * 3600e3).toISOString() },
    { ...base, id: randomId(), employee_id: byEmail("satyam"), request_type: "FULL_LEAVE", leave_category: "EARNED",
      from_date: workingAfter(today, 6), to_date: workingAfter(today, 10), reason: "Family trip", status: "REJECTED",
      decided_by_id: hr, decided_at: new Date(Date.now() - 44 * 3600e3).toISOString(), created_at: new Date(Date.now() - 70 * 3600e3).toISOString() },
    // A manager's own request: HR decides it
    { ...base, id: randomId(), employee_id: manager, request_type: "FULL_LEAVE", leave_category: "CASUAL",
      from_date: workingAfter(today, 12), to_date: workingAfter(today, 12), reason: "Bank work", status: "PENDING",
      created_at: new Date(Date.now() - 5 * 3600e3).toISOString() },
  ];
  return db;
}

let db = null;

export function getDb() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    db = raw ? JSON.parse(raw) : seedAttendance(seed());
  } catch {
    db = seedAttendance(seed());
  }
  return db;
}

export function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getDb()));
  } catch {
    // Storage unavailable: changes last until the page reloads.
  }
}

export function resetDb() {
  db = seedAttendance(seed());
  saveDb();
}

/** Simulated network latency so loading states are visible in mock mode. */
export function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Holidays HR has not removed (soft delete with is_active, like the backend). Seeded ones have no flag. */
export function activeHolidays(db) {
  return db.holidays.filter((h) => h.is_active !== false);
}

/** Strips server-only fields, like the API would. */
export function publicEmployee({ password, ...employee }) {
  return employee;
}
