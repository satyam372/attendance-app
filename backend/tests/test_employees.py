"""PATCH /api/employees/{id}: deactivate/restore and change manager (HR only)."""

import uuid

import pytest

from app.models.enums import Role
from tests.conftest import auth


@pytest.fixture
def org(make_employee):
    hr = make_employee("Hr", Role.HR)
    manager = make_employee("Manager", Role.MANAGER)
    other_manager = make_employee("OtherManager", Role.MANAGER)
    return {
        "hr": hr,
        "manager": manager,
        "other_manager": other_manager,
        "report": make_employee("Report", reports_to=manager),
        "loner": make_employee("Loner"),
    }


def patch(client, employee, body, as_user):
    return client.patch(f"/api/employees/{employee.id}", json=body, headers=auth(as_user))


def test_hr_changes_manager(client, org):
    response = patch(client, org["report"], {"reports_to_id": str(org["other_manager"].id)}, org["hr"])

    assert response.status_code == 200
    assert response.json()["reports_to_id"] == str(org["other_manager"].id)
    assert response.json()["is_active"] is True  # fields that were not sent stay as they were


def test_null_removes_manager(client, org):
    response = patch(client, org["report"], {"reports_to_id": None}, org["hr"])

    assert response.status_code == 200
    assert response.json()["reports_to_id"] is None


def test_status_only_keeps_manager(client, org):
    response = patch(client, org["report"], {"is_active": False}, org["hr"])

    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert response.json()["reports_to_id"] == str(org["manager"].id)


@pytest.mark.parametrize(
    ("target", "detail"),
    [
        ("loner", "reports_to_id must be an active manager"),  # an EMPLOYEE is not a manager
        ("hr", "reports_to_id must be an active manager"),
        ("unknown", "reports_to_id must be an active manager"),
    ],
)
def test_manager_must_be_an_active_manager(client, org, target, detail):
    manager_id = str(uuid.uuid4()) if target == "unknown" else str(org[target].id)

    response = patch(client, org["report"], {"reports_to_id": manager_id}, org["hr"])

    assert response.status_code == 422
    assert response.json()["detail"] == detail


def test_inactive_manager_is_rejected(client, session, org):
    org["other_manager"].is_active = False
    session.add(org["other_manager"])
    session.commit()

    response = patch(client, org["report"], {"reports_to_id": str(org["other_manager"].id)}, org["hr"])

    assert response.status_code == 422


def test_manager_cannot_report_to_themselves(client, org):
    response = patch(client, org["manager"], {"reports_to_id": str(org["manager"].id)}, org["hr"])

    assert response.status_code == 422


def test_reporting_loop_is_rejected(client, org):
    # other_manager reports to manager; making manager report to other_manager would loop
    assert patch(
        client, org["other_manager"], {"reports_to_id": str(org["manager"].id)}, org["hr"]
    ).status_code == 200

    response = patch(client, org["manager"], {"reports_to_id": str(org["other_manager"].id)}, org["hr"])

    assert response.status_code == 422
    assert "own team" in response.json()["detail"]


def test_manager_with_active_team_cannot_be_deactivated(client, org):
    response = patch(client, org["manager"], {"is_active": False}, org["hr"])

    assert response.status_code == 409
    assert response.json()["detail"] == "Assign Manager's team to another manager first."


def test_manager_can_be_deactivated_once_team_moved(client, org):
    patch(client, org["report"], {"reports_to_id": str(org["other_manager"].id)}, org["hr"])

    response = patch(client, org["manager"], {"is_active": False}, org["hr"])

    assert response.status_code == 200


def test_hr_cannot_deactivate_themselves(client, org):
    response = patch(client, org["hr"], {"is_active": False}, org["hr"])

    assert response.status_code == 409


@pytest.mark.parametrize("body", [{}, {"is_active": None}])
def test_empty_or_null_status_is_rejected(client, org, body):
    response = patch(client, org["report"], body, org["hr"])

    assert response.status_code == 422


def test_only_hr_can_patch(client, org):
    response = patch(client, org["report"], {"reports_to_id": None}, org["manager"])

    assert response.status_code == 403


def test_unknown_employee(client, org):
    response = client.patch(
        f"/api/employees/{uuid.uuid4()}", json={"is_active": True}, headers=auth(org["hr"])
    )

    assert response.status_code == 404


def test_create_requires_manager_role(client, org):
    body = {
        "name": "New Person",
        "email": "test.newperson@example.com",
        "password": "temporary-pass-1",
        "reports_to_id": str(org["loner"].id),
    }

    response = client.post("/api/employees", json=body, headers=auth(org["hr"]))

    assert response.status_code == 422
    assert response.json()["detail"] == "reports_to_id must be an active manager"
