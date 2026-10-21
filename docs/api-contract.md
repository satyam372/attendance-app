# API contract

The endpoints the frontend calls. Data shapes and enums follow [`schema.md`](schema.md); this file adds methods, paths, request and response bodies. Update it in the same pull request as any endpoint change.

Until an endpoint exists in the backend, the frontend uses an in-browser mock with the same signatures (`frontend/src/lib/mock/`, enabled with `USE_MOCK_API=true`). The services in `frontend/src/lib/services/` are the only place that calls the API.

**Status:** Auth matches the implemented backend (`backend/app/api/routes/auth.py`) and is used by the frontend now. The backend also implements attendance, holidays, requests, employees and dashboard routes; the sections below for those are the frontend's earlier plan and will be reconciled with the real routes in the PR that first uses each one.

## Conventions

- Base path `/api`, same origin as the frontend (Vercel services). JSON in and out.
- Auth: JWT in an httpOnly cookie set by `POST /api/auth/login`. The frontend sends `credentials: "include"` and never reads the token.
- Date-times are UTC ISO 8601 strings (`"2026-10-12T05:01:00Z"`). Plain dates are `"YYYY-MM-DD"`. Business rules use Asia/Kolkata.
- Errors use FastAPI's shape: `{"detail": "Human readable message"}`, or a list for validation errors. The frontend shows `detail` to the user, so write it as a full sentence.
- Status codes: `401` not signed in or bad credentials, `403` signed in but not allowed (or inactive account), `404` not found, `409` conflict (e.g. duplicate), `422` validation error.
- Role checks happen on every route in the backend. The frontend only hides what a role cannot use.

## Shared shapes

```jsonc
// Employee (EmployeePublic; never includes password_hash). All ids are UUID strings.
{ "id": "5f0c…", "name": "Sandip Sarode", "email": "sandip@speedinnovations.in", "role": "EMPLOYEE",
  "reports_to_id": null, "is_active": true, "must_change_password": false, "created_at": "2026-10-01T04:30:00Z" }

// Attendance
{ "id": "9b2e…", "employee_id": "5f0c…", "work_date": "2026-10-12", "work_mode": "OFFICE", "leave_portion": "NONE",
  "leave_half": null, "in_time": "2026-10-12T05:01:00Z", "out_time": null, "request_id": null,
  "updated_by_id": null, "updated_at": "2026-10-12T05:01:00Z" }

// Request
{ "id": "c41a…", "employee_id": "5f0c…", "request_type": "HALF_DAY_LEAVE", "from_date": "2026-10-14", "to_date": "2026-10-14",
  "leave_half": "FIRST_HALF", "leave_category": "CASUAL", "holiday_id": null, "reason": "Bank work",
  "status": "PENDING", "decided_by_id": null, "decided_at": null, "created_at": "2026-10-12T09:15:00Z" }

// Holiday
{ "id": "e7d3…", "name": "Dussehra", "holiday_date": "2026-10-20", "is_optional": false }
```

## Auth (in use)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ "email", "password" }` (the server trims and lowercases the email) | `200 Employee` + sets the auth cookie. `401` "Invalid email or password", `403` "Your account is deactivated. Contact HR." |
| POST | `/api/auth/logout` | none | `204`, clears the cookie |
| GET | `/api/auth/me` | none | `200 Employee`, or `401` when not signed in |

## Attendance (in use: home screen)

Matches `backend/app/api/routes/attendance.py`. Every signed-in employee (managers and HR too).

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/attendance/today` | none | `TodayStatus`: `{ "work_date", "attendance": AttendancePublic \| null, "wfh_used": 1.5, "wfh_free": 2, "is_working_day": true }` |
| POST | `/api/attendance/check-in` | `{ "work_mode": "OFFICE" \| "WFH" }` (HYBRID is rejected with 422) | `201 AttendancePublic` (with `is_late`). `409` with a message: already checked in, on leave today, or free WFH days used up |
| POST | `/api/attendance/check-out` | none | `200 AttendancePublic`. `409`: not checked in, or already checked out. Before 10:30 it closes yesterday's open late-night check-in |
| GET | `/api/attendance/history?year=2026&month=10` | none | `AttendanceDay[]` for the month up to today, newest first: `{ "work_date", "status": DayStatus, "holiday_name", "in_time", "out_time", "worked_minutes", "punctuality": Punctuality \| null }` |

- `DayStatus`: OFFICE, WFH, HYBRID, HALF_DAY_LEAVE, LEAVE, HOLIDAY, WEEKEND, ABSENT, NOT_CHECKED_IN, AWAITING_APPROVAL, REJECTED.
- `Punctuality`: ON_TIME (by 10:30), WITHIN_GRACE (by 11:00), LATE, NO_CHECK_IN; `null` on weekends, holidays and leave days.
- If an approved request (or an HR correction) already set today's work mode, check-in uses that mode whatever is sent.
- Not built yet in the backend: HR attendance sheet for all employees and HR corrections (`AttendanceUpdate` exists as a model, no route yet).

## Requests (in use: Leave screen and HR Approvals)

Matches `backend/app/api/routes/requests.py`.

| Method | Path | Who | Body / query | Response |
|---|---|---|---|---|
| POST | `/api/requests` | any | `RequestCreate`: `request_type`, `from_date`, `to_date`, `leave_half`, `leave_category`, `holiday_id`, `reason` | `201 RequestPublic` (status PENDING). `422` "The selected dates are all weekends or holidays." / "Choose an optional holiday on the selected date." / combination errors; `409` "You already have a request for some of these dates." |
| GET | `/api/requests?status=PENDING` (repeatable) | HR | `status` filter, none = all | `RequestWithEmployee[]` (RequestPublic + `employee_name`), newest first |
| POST | `/api/requests/{id}/decision` | HR | `{ "status": "APPROVED" \| "REJECTED" }` | `RequestPublic`. `409` already decided, or full-day leave on a day already checked in |

Combination rules (`RequestBase.check_combination`, mirrored in `frontend/src/lib/domain/requests.js`):
- `to_date >= from_date`; half-day types (`HALF_DAY_LEAVE`, `HALF_LEAVE_HALF_WFH`) cover one date and need `leave_half`.
- Leave types need `leave_category`; WFH types must not have one.
- An optional holiday is a one-date `FULL_LEAVE` with `leave_category: OPTIONAL_HOLIDAY` and the holiday's `holiday_id`.
- Every request starts PENDING (WFH too). Pending and rejected days appear in `/attendance/history` as `AWAITING_APPROVAL` / `REJECTED`.
- Approving writes one attendance row per working day of the request (`request_id` set). Full-day leave is refused (409) if the person already checked in on one of those days; half-day leave keeps an existing check-in.

**Not available yet (requested):** `GET /api/requests/me` (the employee's own requests) and leave balances.

## Holidays

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/holidays` | any | `HolidayPublic[]` (`id`, `name`, `holiday_date`, `is_optional`), earliest first. In use on the Leave screen |
| POST | `/api/holidays` | HR | Body `{ "name", "holiday_date", "is_optional" }`. `409` "A holiday already exists on this date" |

Not available yet: deleting a holiday.

## HR dashboard (in use: HR "Team today")

Matches `backend/app/api/routes/dashboard.py`. HR only (403 for everyone else).

| Method | Path | Response |
|---|---|---|
| GET | `/api/dashboard/today?day=YYYY-MM-DD` | `DaySummary`: `work_date`, `is_working_day`, `team_size`, `in_office`, `wfh`, `hybrid`, `on_leave`, `half_day_leave`, `not_checked_in`, `late` |
| GET | `/api/dashboard/today/team?day=YYYY-MM-DD` | `TeamMemberDay[]`, one per active employee who had joined by `day`, sorted by name: `employee_id`, `name`, `status` (DayStatus), `work_mode`, `leave_half`, `in_time`, `out_time`, `punctuality`, `attendance_id` |

- Leave `day` out for today: the server decides "today" in Pune time. A future `day` is a `422` "day cannot be in the future".
- Every employee is in exactly one bucket, so `in_office + wfh + hybrid + on_leave + half_day_leave + not_checked_in == team_size`; `late` is a subset of the checked-in people.
- An approved WFH counts as working only once the person checks in.

## Employees (in use: HR People)

Matches `backend/app/api/routes/employees.py`. HR only.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/employees` | none | `EmployeeBase[]`: `name`, `email`, `role`, `reports_to_id`, `is_active`, sorted by name (active and inactive) |
| POST | `/api/employees` | `EmployeeCreate`: `name`, `email`, `role`, `reports_to_id?`, `is_active?`, `password` (8 to 72 characters, at most 72 bytes) | `201 EmployeePublic` with `must_change_password: true`. `409` "An employee with this email already exists"; `422` "reports_to_id must be an active employee" |

- The frontend generates the temporary password (no look-alike characters) and shows it once for HR to share privately.
- **Not available yet:** employee `id` in the list (needed to choose a "reports to" manager), editing or deactivating an employee, and changing a password.
