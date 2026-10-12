# API contract

The endpoints the frontend calls. Data shapes and enums follow [`schema.md`](schema.md); this file adds methods, paths, request and response bodies. Update it in the same pull request as any endpoint change.

Until an endpoint exists in the backend, the frontend uses an in-browser mock with the same signatures (`frontend/src/lib/mock/`, enabled with `USE_MOCK_API=true`). The services in `frontend/src/lib/services/` are the only place that calls the API.

**Status:** Auth is used by the frontend now. The other sections are the planned shape for upcoming screens and may still change; they will be finalised in the PR that first uses them.

## Conventions

- Base path `/api`, same origin as the frontend (Vercel services). JSON in and out.
- Auth: JWT in an httpOnly cookie set by `POST /api/auth/login`. The frontend sends `credentials: "include"` and never reads the token.
- Date-times are UTC ISO 8601 strings (`"2026-10-12T05:01:00Z"`). Plain dates are `"YYYY-MM-DD"`. Business rules use Asia/Kolkata.
- Errors use FastAPI's shape: `{"detail": "Human readable message"}`, or a list for validation errors. The frontend shows `detail` to the user, so write it as a full sentence.
- Status codes: `401` not signed in or bad credentials, `403` signed in but not allowed (or inactive account), `404` not found, `409` conflict (e.g. duplicate), `422` validation error.
- Role checks happen on every route in the backend. The frontend only hides what a role cannot use.

## Shared shapes

```jsonc
// Employee (never includes password_hash)
{ "id": 3, "name": "Sandip Sarode", "email": "sandip@speedinnovations.in", "role": "EMPLOYEE",
  "reports_to_id": null, "is_active": true, "must_change_password": false, "created_at": "2026-10-01T04:30:00Z" }

// Attendance
{ "id": 41, "employee_id": 3, "work_date": "2026-10-12", "work_mode": "OFFICE", "leave_portion": "NONE",
  "leave_half": null, "in_time": "2026-10-12T05:01:00Z", "out_time": null, "request_id": null,
  "updated_by_id": null, "updated_at": "2026-10-12T05:01:00Z" }

// Request
{ "id": 7, "employee_id": 3, "request_type": "HALF_DAY_LEAVE", "from_date": "2026-10-14", "to_date": "2026-10-14",
  "leave_half": "FIRST_HALF", "leave_category": "CASUAL", "holiday_id": null, "reason": "Bank work",
  "status": "PENDING", "decided_by_id": null, "decided_at": null, "created_at": "2026-10-12T09:15:00Z" }

// Holiday
{ "id": 8, "name": "Dussehra", "holiday_date": "2026-10-20", "is_optional": false }
```

## Auth (in use)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ "email", "password" }` (email lowercased by the client) | `200 { "user": Employee }` + sets the auth cookie. `401` wrong email or password, `403` inactive account |
| POST | `/api/auth/logout` | none | `204`, clears the cookie |
| GET | `/api/auth/me` | none | `200 Employee`, or `401` when not signed in |

## Attendance (planned)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/attendance/today` | any | My row for today (or `null`), plus `wfh_used_this_month` (number, half days 0.5) |
| POST | `/api/attendance/check-in` | any | Body `{ "work_mode": "OFFICE" \| "WFH" }`. Server sets `in_time`. WFH beyond the free limit also creates a PENDING `FULL_WFH` request (`reason` required) |
| POST | `/api/attendance/check-out` | any | Server sets `out_time`. `409` if not checked in |
| GET | `/api/attendance/me?month=YYYY-MM` | any | My rows for the month (history and summary) |
| GET | `/api/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD` | HR | Everyone's rows in the range (weekly sheet, today view, dashboard) |
| PUT | `/api/attendance/{employee_id}/{work_date}` | HR | Create or correct a day: `work_mode`, `leave_portion`, `leave_half`, `in_time`, `out_time`. Sets `updated_by_id` |

## Requests (planned)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/api/requests` | any | Body: `request_type`, `from_date`, `to_date`, `leave_half`, `leave_category`, `holiday_id`, `reason`. Validation per schema.md |
| GET | `/api/requests/me` | any | My requests, newest first |
| GET | `/api/requests?status=PENDING` | HR, MANAGER (own reports) | Requests to decide |
| POST | `/api/requests/{id}/decision` | HR, MANAGER (own reports) | Body `{ "status": "APPROVED" \| "REJECTED" }`. Approval creates or updates attendance rows |

## Holidays (planned)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/holidays?year=2026` | any | Sorted by date |
| POST | `/api/holidays` | HR | Body `{ "name", "holiday_date", "is_optional" }`. `409` if the date already has a holiday |
| DELETE | `/api/holidays/{id}` | HR | `204` |

## Employees (planned)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/employees` | HR | All employees |
| POST | `/api/employees` | HR | Body `{ "name", "email", "role", "temporary_password" }`. Sets `must_change_password`. `409` duplicate email |
| PATCH | `/api/employees/{id}` | HR | `name`, `role`, `reports_to_id`, `is_active` |
