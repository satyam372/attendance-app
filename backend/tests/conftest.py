"""Test setup: an in-memory SQLite database per test, never the shared Supabase project.

Environment variables override backend/.env (pydantic-settings), so these lines run before any
app import and replace the real DATABASE_URL. The assert below is the safety net CLAUDE.md
asks for: if that ever stops working, the test run stops instead of touching real data.
"""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret-not-used-anywhere-else-0123456789"
os.environ["OFFICE_LAT"] = "18.5590"
os.environ["OFFICE_LNG"] = "73.7868"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  (registers every table on SQLModel.metadata)
from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import create_access_token
from app.main import app as fastapi_app
from app.models.enums import Role
from app.models.user import Employee

get_settings.cache_clear()
if "supabase.com" in get_settings().database_url:
    raise RuntimeError("Tests must never run against Supabase; DATABASE_URL points there.")


@pytest.fixture
def session():
    # StaticPool keeps one connection, so every session sees the same in-memory database
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session):
    fastapi_app.dependency_overrides[get_session] = lambda: session
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def make_employee(session):
    """make_employee("Asha", Role.EMPLOYEE, reports_to=manager) -> a saved Employee."""

    def make(name: str, role: Role = Role.EMPLOYEE, reports_to: Employee | None = None) -> Employee:
        employee = Employee(
            name=name,
            email=f"test.{name.lower()}@example.com",
            role=role,
            reports_to_id=reports_to.id if reports_to else None,
            password_hash="not-used",
        )
        session.add(employee)
        session.commit()
        session.refresh(employee)
        return employee

    return make


def auth(employee: Employee) -> dict[str, str]:
    """Bearer header for a request made as this employee."""
    return {"Authorization": f"Bearer {create_access_token(employee.id)}"}
