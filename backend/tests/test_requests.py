"""Who may list and decide leave/WFH requests (manager approvals, HR override, never your own)."""

from datetime import date

import pytest

from app.models.enums import ApprovalStatus, RequestType, Role
from app.models.request import Request
from tests.conftest import auth

# A Monday far in the future: a working day, and no holidays exist in the test database
DAY = date(2030, 1, 7)


@pytest.fixture
def team(make_employee):
    hr = make_employee("Hr", Role.HR)
    manager = make_employee("Manager", Role.MANAGER)
    other_manager = make_employee("OtherManager", Role.MANAGER)
    return {
        "hr": hr,
        "manager": manager,
        "other_manager": other_manager,
        "report": make_employee("Report", reports_to=manager),
        "other_report": make_employee("OtherReport", reports_to=other_manager),
        "no_manager": make_employee("NoManager"),
        # A manager who reports to another manager: their requests still go to HR
        "sub_manager": make_employee("SubManager", Role.MANAGER, reports_to=manager),
    }


@pytest.fixture
def raise_request(session):
    def raise_(employee) -> Request:
        request = Request(
            employee_id=employee.id,
            request_type=RequestType.FULL_WFH,
            from_date=DAY,
            to_date=DAY,
        )
        session.add(request)
        session.commit()
        session.refresh(request)
        return request

    return raise_


def decide(client, request, decider, status="APPROVED"):
    return client.post(
        f"/api/requests/{request.id}/decision", json={"status": status}, headers=auth(decider)
    )


@pytest.mark.parametrize(
    ("decider", "requester", "expected"),
    [
        ("manager", "report", 200),  # the normal path: manager decides for their report
        ("manager", "other_report", 403),  # not their team
        ("manager", "no_manager", 403),  # employee without a manager: HR only
        ("manager", "sub_manager", 403),  # a manager's request goes to HR, not their manager
        ("hr", "report", 200),  # HR override for an employee
        ("hr", "manager", 200),  # managers' requests are decided by HR
        ("hr", "no_manager", 200),
        ("manager", "manager", 403),  # nobody decides their own request ...
        ("hr", "hr", 403),  # ... HR included
        ("report", "other_report", 403),  # employees cannot decide at all (route)
    ],
)
def test_who_can_decide(client, team, raise_request, decider, requester, expected):
    request = raise_request(team[requester])

    response = decide(client, request, team[decider])

    assert response.status_code == expected
    if expected == 200:
        assert response.json()["status"] == ApprovalStatus.APPROVED
        assert response.json()["decided_by_id"] == str(team[decider].id)
    else:
        assert response.json()["detail"]


def test_refused_decision_leaves_request_pending(client, session, team, raise_request):
    request = raise_request(team["other_report"])

    decide(client, request, team["manager"])

    session.refresh(request)
    assert request.status == ApprovalStatus.PENDING
    assert request.decided_by_id is None


def test_manager_lists_only_requests_they_can_decide(client, team, raise_request):
    mine = raise_request(team["report"])
    for name in ("other_report", "no_manager", "sub_manager", "manager"):
        raise_request(team[name])

    response = client.get("/api/requests", headers=auth(team["manager"]))

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(mine.id)]


def test_hr_lists_everyone_except_their_own(client, team, raise_request):
    others = [raise_request(team[name]) for name in ("report", "manager", "sub_manager")]
    raise_request(team["hr"])

    response = client.get("/api/requests", headers=auth(team["hr"]))

    assert {item["id"] for item in response.json()} == {str(r.id) for r in others}


def test_employee_cannot_list_requests(client, team):
    response = client.get("/api/requests", headers=auth(team["report"]))

    assert response.status_code == 403
