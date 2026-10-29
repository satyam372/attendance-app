"""Profile photo: PUT/DELETE /api/me/photo, GET and HR DELETE /api/employees/{id}/photo."""

import uuid
from datetime import date

import pytest

from app.models.enums import RequestType, Role
from app.models.photo import EmployeePhoto
from app.models.request import Request
from app.services.photo import MAX_PHOTO_BYTES
from tests.conftest import auth

# Only the first bytes matter to the server; real images are not needed
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 100
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 100
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
DAY = date(2030, 1, 7)  # a Monday far in the future, no holidays in the test database


@pytest.fixture
def people(make_employee):
    return {
        "hr": make_employee("Hr", Role.HR),
        "asha": make_employee("Asha"),
        "ravi": make_employee("Ravi"),
    }


def upload(client, as_user, data, content_type="image/webp"):
    return client.put(
        "/api/me/photo",
        content=data,
        headers={**auth(as_user), "Content-Type": content_type},
    )


@pytest.mark.parametrize(
    ("data", "content_type"),
    [(WEBP, "image/webp"), (JPEG, "image/jpeg"), (PNG, "image/png")],
)
def test_upload_returns_employee_with_photo_time(client, people, data, content_type):
    response = upload(client, people["asha"], data, content_type)

    assert response.status_code == 200
    assert response.json()["id"] == str(people["asha"].id)
    assert response.json()["photo_updated_at"] is not None
    assert "password_hash" not in response.json()


def test_anyone_signed_in_sees_the_photo(client, people):
    upload(client, people["asha"], WEBP)

    response = client.get(
        f"/api/employees/{people['asha'].id}/photo?v=x", headers=auth(people["ravi"])
    )

    assert response.status_code == 200
    assert response.content == WEBP
    assert response.headers["content-type"] == "image/webp"
    assert response.headers["cache-control"] == "private, max-age=31536000, immutable"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_photo_needs_sign_in(client, people):
    upload(client, people["asha"], WEBP)

    assert client.get(f"/api/employees/{people['asha'].id}/photo").status_code == 401


def test_replace_changes_photo_and_time(client, people):
    first = upload(client, people["asha"], WEBP).json()["photo_updated_at"]
    second = upload(client, people["asha"], JPEG, "image/jpeg").json()[
        "photo_updated_at"
    ]

    response = client.get(
        f"/api/employees/{people['asha'].id}/photo", headers=auth(people["asha"])
    )
    assert second != first
    assert response.content == JPEG
    assert response.headers["content-type"] == "image/jpeg"


def test_no_photo_is_404(client, people):
    response = client.get(
        f"/api/employees/{people['asha'].id}/photo", headers=auth(people["asha"])
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    ("data", "content_type"),
    [
        (SVG, "image/svg+xml"),
        (SVG, "image/webp"),  # a lying Content-Type does not get past the byte check
        (JPEG, "image/webp"),  # real image, wrong declared type
        (b"GIF89a" + b"\x00" * 50, "image/gif"),
        (b"", "image/webp"),
    ],
)
def test_not_an_allowed_image_is_415(client, people, session, data, content_type):
    response = upload(client, people["asha"], data, content_type)

    assert response.status_code == 415
    assert session.get(EmployeePhoto, people["asha"].id) is None


def test_too_large_is_413(client, people, session):
    response = upload(client, people["asha"], WEBP + b"\x00" * MAX_PHOTO_BYTES)

    assert response.status_code == 413
    assert session.get(EmployeePhoto, people["asha"].id) is None


def test_exactly_the_limit_is_accepted(client, people):
    data = WEBP + b"\x00" * (MAX_PHOTO_BYTES - len(WEBP))

    assert upload(client, people["asha"], data).status_code == 200


def test_content_type_parameters_are_ignored(client, people):
    assert (
        upload(client, people["asha"], JPEG, "image/jpeg; charset=binary").status_code
        == 200
    )


def test_remove_own_photo(client, people):
    upload(client, people["asha"], WEBP)

    response = client.delete("/api/me/photo", headers=auth(people["asha"]))

    assert response.status_code == 204
    assert (
        client.get("/api/auth/me", headers=auth(people["asha"])).json()[
            "photo_updated_at"
        ]
        is None
    )
    assert (
        client.get(
            f"/api/employees/{people['asha'].id}/photo", headers=auth(people["asha"])
        ).status_code
        == 404
    )


def test_remove_without_photo_is_still_204(client, people):
    assert (
        client.delete("/api/me/photo", headers=auth(people["asha"])).status_code == 204
    )


def test_hr_removes_someones_photo(client, people):
    upload(client, people["asha"], WEBP)

    response = client.delete(
        f"/api/employees/{people['asha'].id}/photo", headers=auth(people["hr"])
    )

    assert response.status_code == 204
    assert (
        client.get(
            f"/api/employees/{people['asha'].id}/photo", headers=auth(people["hr"])
        ).status_code
        == 404
    )


def test_only_hr_removes_someone_elses_photo(client, people):
    upload(client, people["asha"], WEBP)

    response = client.delete(
        f"/api/employees/{people['asha'].id}/photo", headers=auth(people["ravi"])
    )

    assert response.status_code == 403
    assert (
        client.get(
            f"/api/employees/{people['asha'].id}/photo", headers=auth(people["ravi"])
        ).status_code
        == 200
    )


def test_hr_remove_unknown_employee_is_404(client, people):
    response = client.delete(
        f"/api/employees/{uuid.uuid4()}/photo", headers=auth(people["hr"])
    )

    assert response.status_code == 404


def test_employees_list_carries_photo_time(client, people):
    upload(client, people["asha"], WEBP)

    employees = client.get("/api/employees", headers=auth(people["hr"])).json()

    by_name = {employee["name"]: employee for employee in employees}
    assert by_name["Asha"]["photo_updated_at"] is not None
    assert by_name["Ravi"]["photo_updated_at"] is None


def test_team_today_carries_photo_time(client, people):
    upload(client, people["asha"], WEBP)

    team = client.get("/api/dashboard/today/team", headers=auth(people["hr"])).json()

    by_name = {member["name"]: member for member in team}
    assert by_name["Asha"]["photo_updated_at"] is not None
    assert by_name["Ravi"]["photo_updated_at"] is None


def test_requests_list_carries_requesters_photo_time(client, people, session):
    upload(client, people["asha"], WEBP)
    session.add(
        Request(
            employee_id=people["asha"].id,
            request_type=RequestType.FULL_WFH,
            from_date=DAY,
            to_date=DAY,
        )
    )
    session.commit()

    requests = client.get("/api/requests", headers=auth(people["hr"])).json()

    assert requests[0]["employee_id"] == str(people["asha"].id)
    assert requests[0]["photo_updated_at"] is not None
