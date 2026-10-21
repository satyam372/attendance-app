"""Seed test users and sample holidays into the database in DATABASE_URL.

Run from backend/:
    uv run python -m scripts.seed

Safe to run more than once: existing emails and holiday dates are skipped.

The repository is public, so no password is stored here. Set SEED_PASSWORD to choose one,
otherwise a random password is generated and printed once. All users get the same password.
Every email starts with "test." so test data can be removed before go-live (see CLAUDE.md).
"""

import os
import secrets
from datetime import date

from sqlmodel import Session, select

from app.core.database import engine
from app.models.enums import Role
from app.models.holiday import Holiday, HolidayCreate
from app.models.user import Employee, EmployeeCreate
from app.services.employee import create_employee
from app.services.holiday import create_holiday

DOMAIN = "speedinnovations.in"

USERS = [
    ("Test HR", "test.hr", Role.HR),
    ("Test Manager", "test.manager", Role.MANAGER),
    ("Test Employee One", "test.employee1", Role.EMPLOYEE),
    ("Test Employee Two", "test.employee2", Role.EMPLOYEE),
    ("Test Employee Three", "test.employee3", Role.EMPLOYEE),
]

# Sample data for testing; HR can edit the real calendar from the Holidays tab
HOLIDAYS = [
    ("Gandhi Jayanti", date(2026, 10, 2), False),
    ("Dussehra", date(2026, 10, 20), False),
    ("Diwali", date(2026, 11, 8), False),
    ("Bhai Dooj", date(2026, 11, 11), True),
    ("Christmas", date(2026, 12, 25), False),
]


def seed_users(session: Session, password: str) -> None:
    for name, local_part, role in USERS:
        email = f"{local_part}@{DOMAIN}"
        if session.exec(select(Employee.id).where(Employee.email == email)).first():
            print(f"  skip   {email} (exists)")
            continue
        create_employee(session, EmployeeCreate(name=name, email=email, role=role, password=password))
        print(f"  added  {email} ({role})")


def seed_holidays(session: Session) -> None:
    for name, day, optional in HOLIDAYS:
        if session.exec(select(Holiday.id).where(Holiday.holiday_date == day)).first():
            print(f"  skip   {day} {name} (exists)")
            continue
        create_holiday(session, HolidayCreate(name=name, holiday_date=day, is_optional=optional))
        print(f"  added  {day} {name}{' (optional)' if optional else ''}")


def main() -> None:
    password = os.environ.get("SEED_PASSWORD") or secrets.token_urlsafe(9)
    with Session(engine) as session:
        print("Users:")
        seed_users(session, password)
        print("Holidays:")
        seed_holidays(session)
    if "SEED_PASSWORD" not in os.environ:
        print(f"\nPassword for newly added users: {password}")
        print("It is not stored anywhere else. Set SEED_PASSWORD next time to choose one.")


if __name__ == "__main__":
    main()
