import { Role } from "../domain/enums.js";

// In-browser stand-in for the database while the backend is being built.
// Shapes follow docs/schema.md and docs/api-contract.md. Persisted in localStorage
// so state survives reloads; bump STORAGE_KEY when the seed shape changes.

const STORAGE_KEY = "speedin-mock-db-v1";

// Demo-only password for every seeded account (mock mode only, never a real credential).
export const DEMO_PASSWORD = "speedin123";

function seed() {
  const employee = (id, name, email, role = Role.EMPLOYEE) => ({
    id,
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
      { id: 1, name: "Republic Day", holiday_date: "2026-01-26", is_optional: false },
      { id: 2, name: "Holi", holiday_date: "2026-03-04", is_optional: false },
      { id: 3, name: "Gudi Padwa", holiday_date: "2026-03-19", is_optional: false },
      { id: 4, name: "Maharashtra Day", holiday_date: "2026-05-01", is_optional: false },
      { id: 5, name: "Independence Day", holiday_date: "2026-08-15", is_optional: false },
      { id: 6, name: "Ganesh Chaturthi", holiday_date: "2026-09-14", is_optional: false },
      { id: 7, name: "Gandhi Jayanti", holiday_date: "2026-10-02", is_optional: false },
      { id: 8, name: "Dussehra", holiday_date: "2026-10-20", is_optional: false },
      { id: 9, name: "Diwali (Padwa)", holiday_date: "2026-11-09", is_optional: false },
      { id: 10, name: "Bhai Dooj", holiday_date: "2026-11-11", is_optional: false },
      { id: 11, name: "Christmas", holiday_date: "2026-12-25", is_optional: false },
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
