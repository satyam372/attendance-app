# CLAUDE.md: Attendance Tracker

Context for Claude Code. Summary of the planning done so far.

## How to work with me (important)

- I am building this project to **learn**. I write the code myself.
- Default role: **reviewer and mentor**. Review my code, explain *why* something is a problem, suggest the approach, and point to docs. Do not write full implementations unless I explicitly ask ("write this for me").
- When reviewing, order findings by impact: bugs and security first, then design, then naming and style.
- Keep explanations short and concrete. Ask before making changes to files.

## What we are building

An employee attendance web app that replaces an Excel sheet (columns per day: In Time, Out Time, WFH, On Leave). Team: ~6 employees + HR, based in Pune (time zone Asia/Kolkata).

A clickable HTML prototype was built first to agree on flows. The real app is being built from scratch with the stack below.

## Stack

| Part | Tech |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Parcel 2, react-router-dom 7 |
| Backend | FastAPI, Uvicorn, SQLModel, SQLAlchemy 2, Pydantic 2, pydantic-settings, PyJWT, bcrypt, psycopg 3 (binary), Alembic, email-validator, tzdata |
| Dev tools | pytest, httpx, ruff |
| Database | PostgreSQL on Supabase: **one shared project** for local dev and production (see safeguards below) |
| Hosting | Vercel: **one multi-service project** (`vercel.json` at repo root). Frontend at `/`, backend at `/api`, same domain |
| Tracking | Jira (epics and stories), GitHub |

Backend dependencies are managed with **uv** (`backend/pyproject.toml` + `backend/uv.lock`, Python 3.12 via `backend/.python-version`). Frontend versions are pinned in `frontend/package.json`.

### Known setup gotchas

1. Parcel needs `"@parcel/resolver-default": { "packageExports": true }` in `package.json` (already added), otherwise "Failed to resolve 'react-router/dom'".
2. Tailwind with Parcel needs `frontend/.postcssrc`: `{ "plugins": { "@tailwindcss/postcss": {} } }`, and `styles.css` starting with `@import "tailwindcss";`.
3. Parcel inlines `process.env.API_URL` at build time; restart dev server after changing `.env`.
4. Alembic folder is a placeholder; can be regenerated with `alembic init alembic`. Use the psycopg 3 URL prefix `postgresql+psycopg://`.
5. Vercel FastAPI entrypoint: `backend/index.py` exposing `app`.
6. `vercel.json` rewrites: `/api/(.*)` must stay **before** the catch-all `/(.*)` (first match wins). To verify on first deploy: whether FastAPI receives `/api/health` or `/health` (decides `prefix="/api"` on routers), and whether reloading a react-router path like `/hr` returns 404 (would need an SPA fallback).
7. Local dev mirrors production with a Parcel proxy: `frontend/.proxyrc` forwards `/api` to `http://localhost:8000`, so the browser sees one origin and cookies behave as in production.

## Project structure

All code files currently exist as **empty placeholders** (I am writing them).

```
attendance-app/
├── CLAUDE.md
├── vercel.json                    # multi-service: backend at /api, frontend at /
├── docs/schema.md                 # database schema (source of truth)
├── .github/workflows/ci.yml       # lint + tests + build on PRs to dev/main
├── .github/pull_request_template.md
├── backend/
│   ├── pyproject.toml, uv.lock, .python-version, requirements*.txt, .env.example
│   ├── index.py                   # Vercel entrypoint
│   ├── alembic.ini, alembic/ (env.py, script.py.mako, versions/)
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, routers
│   │   ├── core/                  # config.py, database.py, security.py, deps.py, time.py
│   │   ├── models/                # enums.py, user.py, attendance.py, request.py, holiday.py
│   │   └── api/routes/            # health.py, auth.py (more per epic), all under /api
│   ├── scripts/seed.py            # HR admin, team, holidays
│   └── tests/                     # conftest.py, test_health.py, test_auth.py, test_time.py
└── frontend/
    ├── package.json, .env.example (API_URL=/api), .postcssrc, .proxyrc
    └── src/
        ├── index.html, main.jsx, App.jsx, styles.css
        ├── lib/api.js             # fetch wrapper, credentials: "include"
        ├── auth/AuthContext.jsx
        ├── components/            # AppHeader.jsx, ProtectedRoute.jsx
        └── pages/                 # Login.jsx, EmployeeHome.jsx, HrHome.jsx
```

## Database schema

Full detail in `docs/schema.md`. Summary:

- **employee**: name, email (unique), password_hash, role (Role), reports_to_id (self FK, nullable), is_active, must_change_password, created_at
- **attendance** (one row per employee per day, unique on employee_id + work_date): work_mode (WorkMode, null on full leave), leave_portion, leave_half (only when HALF), in_time, out_time (UTC, nullable), request_id (FK), updated_by_id, updated_at
- **request** (leave and WFH): request_type, from_date, to_date, leave_half, leave_category, holiday_id (optional holiday), reason, status (default PENDING), decided_by_id, decided_at, created_at
- **holiday**: name, holiday_date (unique), is_optional

Enums:
- Role: EMPLOYEE, MANAGER, HR
- WorkMode: OFFICE, WFH, HYBRID (HYBRID = half WFH + half office)
- LeavePortion: NONE, HALF, FULL
- LeaveHalf: FIRST_HALF, SECOND_HALF (leave only; WFH never needs a half)
- RequestType: FULL_LEAVE, HALF_DAY_LEAVE, HALF_LEAVE_HALF_WFH, HALF_WFH, FULL_WFH
- LeaveCategory: CASUAL, SICK, EARNED, OPTIONAL_HOLIDAY
- ApprovalStatus: PENDING, APPROVED, REJECTED

Design decisions:
- `attendance` = what happened; `request` = what was asked + decision. Approval lives only on `request`.
- `is_late` is **calculated**, not stored.
- Optional holidays are taken via a request (category OPTIONAL_HOLIDAY + holiday_id).
- Store date-times in UTC; evaluate business rules in Asia/Kolkata. Dates (work_date, from/to, holiday_date) are plain `date`.

## Business rules

- Office hours 10:30 to 19:30. **Late** = check-in after 10:30 + 30 min grace = after **11:00** (11:00 exactly is on time). Configurable: OFFICE_START, OFFICE_END, LATE_BUFFER_MIN.
- **WFH limit**: 2 free WFH days per employee per calendar month (half WFH = 0.5). When used = 2, any further WFH creates a PENDING request needing approval (reason required). Configurable: WFH_FREE_DAYS_PER_MONTH.
- Leave always needs approval. Show note: apply at least 1 day in advance (not hard-enforced yet; idea: block same-day for Casual/Earned, allow Sick).
- Half-day counts: half leave + half office/WFH count 0.5 each side in all totals.
- On a half-day leave day the employee can still check in for the working half; no Late tag that day.
- Weekends and holidays are skipped in leave/WFH date ranges.
- Approval routing: to the employee's `reports_to` manager; if none, to HR. (Only HR exists today.)
- Role checks must be enforced **in the backend** on every route, not only by hiding UI.
- Managers and HR are also employees (they check in, request leave, etc.). Navigation is layered: employee screens for everyone, + team screens for MANAGER, + everything for HR.

## Auth

- Email + password. Passwords hashed with bcrypt.
- JWT (PyJWT, HS256) in an **httpOnly cookie**; frontend uses `credentials: "include"`. Bearer header fallback for tests/tools.
- Endpoints planned: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me.
- JWT_SECRET must be 32+ random chars outside local.
- Frontend and backend share one domain (Vercel services), so the auth cookie is first-party: no custom domain needed, `COOKIE_DOMAIN` stays empty, SameSite=lax, Secure=true in production. No CORS needed in production (same origin); `CORS_ORIGINS` only matters for local tools.

## Features (from the prototype)

**Employee screen**
- Live clock; selector "Where are you working today?" Office / Home (WFH); buttons "Check in at office / from home", "Check out from office / from home".
- Shows "x of 2 free WFH days used this month".
- "Request leave or WFH" form: type (RequestType), which half (half-leave types), leave category, from/to, reason; note about 1-day advance.
- Summary cards with month filter: days in office, WFH (of 2 free), leave taken, late arrivals.
- Upcoming holidays (next 4) + full calendar.
- Attendance history table with filters: month, status (office, WFH, leave, half day, awaiting approval, absent/rejected, holiday), in time (on time, within grace, late, no check-in).

**HR screen (tabs)**
- Today: counts (in office + late, WFH, on leave, not checked in), card per employee, holiday banner.
- Dashboard (month filter): KPIs (attendance rate, avg check-in, late, WFH days, leave days, pending), work-mode donut, punctuality bars, per-employee stacked bars, daily headcount, heatmap.
- Attendance sheet: weekly grid (Mon to Fri), status + times per cell, edit any entry.
- Requests: pending leave + extra WFH with approve/reject; decided history.
- Holidays: add/remove, upcoming/past.
- Team: list, add employee (temporary password).

Visual direction: navy `#1F4E79` header and sky `#DDEBF7` sub-header (from the original Excel), IBM Plex Sans / IBM Plex Sans Condensed. Status colours: office green, WFH teal, leave rose, late amber, absent grey.

## Git, CI/CD and deployment

- **One deployed environment** (production). No qa environment.
- Branches: `feature/ATT-<n>-short-name` → `dev` (integration) → `main` (production, linked to Vercel). A PR `dev` → `main` is a release.
- PRs required into dev/main; CI must pass. Approvals: 0 while working solo (GitHub blocks approving your own PR), 1+ once a second developer joins. Hotfix from main, then merge main back into dev.
- CI (GitHub Actions): backend `ruff check .` + `pytest`; frontend `npm ci` + `npm run build`.
- Vercel: one multi-service project, production branch `main` only. Preview deploys for other branches disabled via Ignored Build Step. One set of env vars (`ENVIRONMENT=production`, transaction pooler `DATABASE_URL` on port 6543, own `JWT_SECRET`, `COOKIE_SECURE=true`, `API_URL=/api`).
- Database: one shared Supabase project used by local dev and production. Safeguards:
  1. pytest must **never** connect to Supabase; tests use their own DB, and `conftest.py` refuses to run if `DATABASE_URL` contains `supabase.com`.
  2. `pg_dump` backup before every `alembic upgrade head` (free plan has no self-serve restore). Backup files stay out of git.
  3. Local test data uses seeded `test.*` users so it can be removed before go-live. After go-live, running locally means acting on real data.
- Local dev and Alembic use the session pooler URL (port 5432).
- Serverless limits on Vercel: no persistent disk, no always-on background tasks (use Vercel Cron for auto check-out / reminders), cold starts.
- Include Jira key (ATT-12) in branch, commits and PR titles; GitHub for Jira app links them.

## Jira backlog

A CSV (`attendance-jira-backlog.csv`) with 10 epics and 38 stories (As a / I want / so that + acceptance criteria, priority, points, labels `mvp` / `phase-2` / `frontend` / `backend`) was created for import.

Epics: 1 Platform setup, 2 Authentication and roles, 3 Check-in and check-out, 4 Leave and WFH requests, 5 HR approvals, 6 Attendance sheet and corrections, 7 Corporate holidays, 8 Employee summary and history (phase 2), 9 HR dashboard (phase 2), 10 Team management.

Suggested sprints: (1) epics 1 + 2, (2) epic 3, (3) epics 4, 5, 7, (4) epics 6 + 10, later phase 2.

## Current status and next steps

- Done: prototype, schema design (`docs/schema.md`), Jira backlog, empty project skeleton with dependencies, Supabase project + `backend/.env`, `backend/.env.example`, `app/core/config.py`, uv setup.
- In progress: git repo at the project root (not `backend/`), GitHub remote, `dev` + `main` branches.
- Next (me): `database.py`, SQLModel models from `docs/schema.md` (enums.py first), security, Alembic initial migration, auth routes, then login page.
- Ask Claude Code to: review each file as I finish it, explain issues, check models match `docs/schema.md`, and help write tests.

