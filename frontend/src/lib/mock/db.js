import { Role } from "../domain/enums.js";

// In-browser stand-in for the database while the backend is being built.
// Shapes follow docs/schema.md and docs/api-contract.md. Persisted in localStorage
// so state survives reloads; bump STORAGE_KEY when the seed shape changes.
// IDs are UUID strings, like the backend (uuid4).

const STORAGE_KEY = "speedin-mock-db-v2";

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
    created_at: "2026-10-01T04:30:00Z",
    password: DEMO_PASSWORD,
  });

  return {
    employees: [
      employee(1, "HR Admin", "hr@speedinnovations.in", Role.HR),
      employee(2, "Ankur Yadav", "ankur@speedinnovations.in"),
      employee(3, "Sandip Sarode", "sandip@speedinnovations.in"),
      employee(4, "Satyam Pokharna", "satyam@speedinnovations.in"),
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
      { id: uuid(111), name: "Christmas", holiday_date: "2026-12-25", is_optional: false },
    ],
    attendance: [],
    requests: [],
  };
}

let db = null;

export function getDb() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    db = raw ? JSON.parse(raw) : seed();
  } catch {
    db = seed();
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
  db = seed();
  saveDb();
}

/** Simulated network latency so loading states are visible in mock mode. */
export function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strips server-only fields, like the API would. */
export function publicEmployee({ password, ...employee }) {
  return employee;
}
