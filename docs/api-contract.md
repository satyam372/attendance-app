# API contract

The endpoints the frontend calls. Data shapes and enums follow [`schema.md`](schema.md); this file adds methods, paths, request and response bodies. Update it in the same pull request as any endpoint change.

Until an endpoint is used by a screen, the frontend can use an in-browser mock with the same signatures (`frontend/src/lib/mock/`, enabled with `USE_MOCK_API=true`). The services in `frontend/src/lib/services/` are the only place that calls the API.

**Status:** every endpoint in the "Implemented" tables exists in the backend (`backend/app/api/routes/`). The frontend uses Auth, Attendance, Requests, Holidays, Employees and the HR dashboard. "Not built yet" lists what the screens still need.

## Conventions

- Base path `/api`, same origin as the frontend (Vercel services). JSON in and out.
- Auth: JWT in an httpOnly cookie set by `POST /api/auth/login`. The frontend sends `credentials: "include"` and never reads the token.
- Date-times are UTC ISO 8601 strings (`"2026-10-12T05:01:00Z"`). Plain dates are `"YYYY-MM-DD"`. Business rules use Asia/Kolkata; "today" is always decided by the server.
- Errors use FastAPI's shape: `{"detail": "Human readable message"}`, or a list for validation errors. The frontend shows `detail` to the user, so write it as a full sentence.
- Status codes: `401` not signed in or bad credentials, `403` signed in but not allowed (or inactive account), `404` not found, `409` conflict (duplicate, or today's state does not allow it), `422` validation error.
- Role checks happen on every route in the backend. The frontend only hides what a role cannot use.
- Who: **any** = any signed-in employee (HR and managers included), **HR** = role HR only.

## Shared shapes

```jsonc
// Employee (EmployeePublic; never includes password_hash). All ids are UUID strings.
{ "id": "5f0c…", "name": "Sandip Sarode", "email": "sandip@speedinnovations.in", "role": "EMPLOYEE",
  "reports_to_id": null, "is_active": true, "must_change_password": false, "created_at": "2026-10-01T04:30:00Z" }

// Attendance (AttendancePublic). is_late is calculated, never stored
{ "id": "9b2e…", "employee_id": "5f0c…", "work_date": "2026-10-12", "work_mode": "OFFICE", "leave_portion": "NONE",
  "leave_half": null, "in_time": "2026-10-12T05:01:00Z", "out_time": null, "is_late": false }

// TodayStatus (GET /api/attendance/today)
{ "work_date": "2026-10-12", "attendance": /* Attendance or null */ null,
  "wfh_used": 1.5, "wfh_free": 2, "is_working_day": true }

// AttendanceDay (one calendar day in history). Absent days and holidays have no row but still appear
{ "work_date": "2026-10-12", "status": "OFFICE", "holiday_name": null, "in_time": "2026-10-12T05:01:00Z",
  "out_time": "2026-10-12T14:00:00Z", "worked_minutes": 539, "punctuality": "ON_TIME" }

// Request (RequestPublic)
{ "id": "c41a…", "employee_id": "5f0c…", "request_type": "HALF_DAY_LEAVE", "from_date": "2026-10-14", "to_date": "2026-10-14",
  "leave_half": "FIRST_HALF", "leave_category": "CASUAL", "holiday_id": null, "reason": "Bank work",
  "status": "PENDING", "decided_by_id": null, "decided_at": null, "created_at": "2026-10-12T09:15:00Z" }

// RequestWithEmployee (HR list) = Request + "employee_name": "Poorva Shipugade"

// Holiday (HolidayPublic)
{ "id": "e7d3…", "name": "Dussehra", "holiday_date": "2026-10-20", "is_optional": false, "is_active": true }

// DaySummary (HR "Today" cards). Every active employee is in exactly one bucket; late is a subset
{ "work_date": "2026-10-14", "is_working_day": true, "team_size": 8, "in_office": 2, "wfh": 1, "hybrid": 1,
  "on_leave": 1, "half_day_leave": 1, "not_checked_in": 2, "late": 2 }

// TeamMemberDay (HR "Team today" card)
{ "employee_id": "5f0c…", "name": "Ankur Yadav", "status": "OFFICE", "work_mode": "OFFICE", "leave_half": null,
  "in_time": "2026-10-14T04:50:00Z", "out_time": null, "punctuality": "ON_TIME", "attendance_id": "9b2e…" }
```

API-only enums (not stored in the database):
- `DayStatus`: OFFICE, WFH, HYBRID, HALF_DAY_LEAVE, LEAVE, HOLIDAY, WEEKEND (HR day view only), ABSENT (past working day), NOT_CHECKED_IN (today), AWAITING_APPROVAL, REJECTED
- `Punctuality`: ON_TIME (by 10:30), WITHIN_GRACE (up to 11:00), LATE, NO_CHECK_IN, or `null` on weekends, holidays and leave days

## Auth

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/login` | public | `{ "email", "password" }` (the server trims and lowercases the email) | `200 Employee` + sets the auth cookie. `401` "Invalid email or password", `403` "Your account is deactivated. Contact HR." |
| POST | `/api/auth/logout` | public | none | `204`, clears the cookie (works with an expired session) |
| GET | `/api/auth/me` | any | none | `200 Employee`, or `401` when not signed in |
| POST | `/api/auth/change-password` | any (own password only) | `{ "current_password", "new_password" }`. New password: 8+ characters, at most 72 bytes | `200 Employee` with `must_change_password: false`; the user stays signed in. `400` "Current password is incorrect", `400` "Choose a password different from the current one", `422` policy |

When `must_change_password` is `true` (accounts created by HR), show the change-password screen before anything else. "Confirm new password" is checked in the form only. The frontend does this at `/change-password` (every signed-in route redirects there until the change succeeds); anyone can also change their password from Profile.

## Attendance

| Method | Path | Who | Body / query | Response |
|---|---|---|---|---|
| GET | `/api/attendance/today` | any | none | `200 TodayStatus` |
| POST | `/api/attendance/check-in` | any | `{ "work_mode": "OFFICE" \| "WFH", "location": { "latitude", "longitude", "accuracy" } }` (HYBRID is `422`; `location` is required, `422` without it). Server sets `work_date` (Pune) and `in_time` | `201 Attendance`. `409` "You have already checked in today.", "You are on leave today.", "You have used your free WFH days this month. Raise a WFH request instead." (then open the request form; nothing is created automatically), "You are not at the office. Move closer to the office or check in from home.", "Your location is not precise enough. Turn on Wi-Fi or location services and try again." |
| POST | `/api/attendance/check-out` | any | none | `200 Attendance`. `409` "You have not checked in yet.", "You have already checked out." A check-out after midnight but before 10:30 closes yesterday's open row |
| GET | `/api/attendance/history?year=2026&month=10` | any | both optional, default this month | `200 AttendanceDay[]`, newest first, up to today. Weekends only when worked; days before the employee joined are left out |

If an approved request (or an HR correction) already set today's work mode, check-in uses that mode whatever is sent.

Location: the frontend sends a fresh browser location (`navigator.geolocation`, `accuracy` in metres) with every check-in. Only a final mode of OFFICE is checked: the location must be at most `OFFICE_MAX_ACCURACY_M` imprecise and within `OFFICE_RADIUS_M` of the office (`distance - accuracy <= radius`). WFH, and an approved WFH day where OFFICE was tapped, are never measured.

Not built yet:
- `GET /api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD` (HR weekly sheet)
- `PUT /api/attendance/{employee_id}/{work_date}` (HR correction: `work_mode`, `leave_portion`, `leave_half`, `in_time`, `out_time`; sets `updated_by_id`)

## Requests

| Method | Path | Who | Body / query | Response |
|---|---|---|---|---|
| POST | `/api/requests` | any | `request_type`, `from_date`, `to_date`, `leave_half`, `leave_category`, `holiday_id`, `reason` (optional). Combination rules per schema.md | `201 Request` (status PENDING). `422` "The selected dates are all weekends or holidays.", "Choose an optional holiday on the selected date.", or a combination rule. `409` "You already have a request for some of these dates." |
| GET | `/api/requests/me` | any | none | `200 Request[]`, the logged-in employee's own requests (every status), newest first. Not used by the frontend yet |
| GET | `/api/requests?status=PENDING` | HR, MANAGER | `status` optional and repeatable: `?status=APPROVED&status=REJECTED` for the Decided list | `200 RequestWithEmployee[]`, newest first. HR: everyone's; manager: only their direct reports who are EMPLOYEEs. Never the caller's own requests (those are in `/api/requests/me`) |
| POST | `/api/requests/{id}/decision` | HR, MANAGER | `{ "status": "APPROVED" \| "REJECTED" }` | `200 Request`. Approval writes the attendance rows (working days only) in the same transaction. `403` "You can only decide requests from your own team, and never your own.", `404`, `409` "This request has already been decided.", `409` full-day leave on a day the employee already checked in |

Combination rules (`RequestBase.check_combination`, mirrored in `frontend/src/lib/domain/requests.js`):
- `to_date >= from_date`; half-day types (`HALF_DAY_LEAVE`, `HALF_LEAVE_HALF_WFH`) cover one date and need `leave_half`.
- Leave types need `leave_category`; WFH types must not have one.
- An optional holiday is a one-date `FULL_LEAVE` with `leave_category: OPTIONAL_HOLIDAY` and the holiday's `holiday_id`.
- Every request starts PENDING (WFH too).

Who decides: an EMPLOYEE's `reports_to` manager; HR for managers, HR staff and employees without a manager; HR may also override for any employee. Nobody decides their own request. Show the Approvals screen to MANAGER and HR. Pending and rejected requests show in history as `AWAITING_APPROVAL` / `REJECTED`.

## Holidays

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| GET | `/api/holidays` | any | none | `200 Holiday[]`, active holidays only, sorted by date (no year filter yet) |
| POST | `/api/holidays` | HR | `{ "name", "holiday_date", "is_optional" }` (`is_optional` defaults to false) | `201 Holiday`. `409` "A holiday already exists on this date" (an active one). Adding a date whose holiday was removed restores that row with the new name and `is_optional` |
| PATCH | `/api/holidays/{id}` | HR | `{ "is_active": false }` removes, `{ "is_active": true }` restores (required) | `200 Holiday`. `404` "Holiday not found". The HR Holidays page removes upcoming holidays (with Undo); past ones stay read-only |

Optional holidays are working days; an employee takes one with a FULL_LEAVE request, `leave_category: "OPTIONAL_HOLIDAY"` and its `holiday_id`.

Removing is a soft delete: the row stays so optional-holiday requests keep a valid `holiday_id`, but a removed holiday is skipped everywhere (it is a working day again, and cannot be requested as an optional holiday).

## Employees

| Method | Path | Who | Body | Response |
|---|---|---|---|---|
| GET | `/api/employees` | HR | none | `200 Employee[]` sorted by name, active and inactive. Each item has `id` (needed for `PATCH /api/employees/{id}`) |
| POST | `/api/employees` | HR | `{ "name", "email", "role", "reports_to_id", "is_active", "password" }`. `password` is the temporary password (8+ characters) | `201 Employee` with `must_change_password: true`. `409` duplicate email, `422` "reports_to_id must be an active manager" (`reports_to_id` must be an active MANAGER, or null) |
| PATCH | `/api/employees/{id}` | HR | Partial: send only what changes. `{ "is_active": false }` deactivates, `{ "is_active": true }` restores, `{ "reports_to_id": "<manager id>" }` changes the manager, `{ "reports_to_id": null }` removes it. Both keys may be sent together; an empty body or `"is_active": null` is `422` | `200 Employee`. `404` "Employee not found"; `422` "reports_to_id must be an active manager", "An employee cannot report to themselves or to someone in their own team."; `409` "You cannot deactivate your own account.", "Assign {name}'s team to another manager first." (a manager with active direct reports). HR People has Deactivate (with a confirm) and Reactivate on each row except your own |

Deactivation is a soft delete: the row and its attendance history stay. The employee's session stops working on their next request (`401`), and logging in returns `403`.

When HR adds an employee, the frontend generates the temporary password (no look-alike characters) and shows it once for HR to share privately.

`reports_to_id` decides approvals: an EMPLOYEE's requests go to that manager (see Requests).

Not built yet:
- Editing `name` and `role` (could extend the same `PATCH`)

## Dashboard (HR)

| Method | Path | Who | Query | Response |
|---|---|---|---|---|
| GET | `/api/dashboard/today` | HR | `day=YYYY-MM-DD` optional, default today in Pune; future dates are `422` | `200 DaySummary` |
| GET | `/api/dashboard/today/team` | HR | same | `200 TeamMemberDay[]`, one per active employee who had joined by `day`, sorted by name. The HR attendance sheet (`/hr/sheet`) calls it once per weekday, up to today |

- A future `day` is `422` "day cannot be in the future".
- Every employee is in exactly one bucket, so `in_office + wfh + hybrid + on_leave + half_day_leave + not_checked_in == team_size`; `late` is a subset of the checked-in people.
- An approved WFH counts as working only once the person checks in.

## Other

| Method | Path | Who | Response |
|---|---|---|---|
| GET | `/api/health` | public | `200 {"status": "ok"}` |
