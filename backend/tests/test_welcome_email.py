"""The welcome email with login details: POST /api/employees and
POST /api/employees/{id}/welcome-email (HR only). Resend and SMTP are replaced by fakes."""

import email
import json
import uuid

import httpx
import pytest
from sqlmodel import select

from app.core.config import Settings, get_settings
from app.core.security import (
    TEMPORARY_PASSWORD_ALPHABET,
    generate_temporary_password,
    hash_password,
    verify_password,
)
from app.models.email_log import EmailLog
from app.models.enums import EmailKind, EmailStatus, Role
from app.models.user import Employee
from app.services import mail
from tests.conftest import auth

NEW_EMPLOYEE = {"name": "Riya Sharma", "email": "riya@example.com", "role": "EMPLOYEE", "password": "Temp-pass-123"}


@pytest.fixture
def hr(make_employee):
    return make_employee("Hr", Role.HR)


@pytest.fixture
def mail_on(monkeypatch):
    """Sending on, through Resend (faked by the outbox fixture)."""
    monkeypatch.setenv("MAIL_DISABLED", "false")
    monkeypatch.setenv("MAIL_PROVIDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("MAIL_FROM", "attendance@example.com")
    monkeypatch.setenv("MAIL_FROM_NAME", "SpeedIn Attendance")
    monkeypatch.setenv("MAIL_REPLY_TO", "hr@example.com")
    monkeypatch.setenv("APP_URL", "https://speedin.example.com")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def outbox(monkeypatch):
    """Every email sent to the fake Resend API, as (request json, headers)."""
    sent = []

    def resend(request):
        sent.append((json.loads(request.read()), request.headers))
        return httpx.Response(200, json={"id": "email-id"})

    monkeypatch.setattr(mail, "http_transport", httpx.MockTransport(resend))
    return sent


def add(client, as_user, **changes):
    return client.post("/api/employees", json={**NEW_EMPLOYEE, **changes}, headers=auth(as_user))


def logs(session):
    return session.exec(select(EmailLog)).all()


def test_adding_an_employee_emails_the_login_details(client, session, hr, mail_on, outbox):
    response = add(client, hr)

    assert response.status_code == 201
    assert response.json()["welcome_email"] == "SENT"
    assert response.json()["email"] == "riya@example.com"
    assert len(outbox) == 1
    body, headers = outbox[0]
    assert headers["authorization"] == "Bearer re_test_key"
    assert body["from"] == "SpeedIn Attendance <attendance@example.com>"
    assert body["to"] == ["riya@example.com"]
    assert body["reply_to"] == "hr@example.com"
    assert body["subject"] == "Your SpeedIn account is ready"
    for part in ("riya@example.com", "Temp-pass-123", "https://speedin.example.com/login", "Hi Riya"):
        assert part in body["text"]
        assert part in body["html"]
    assert "Reply to this email" in body["text"]

    [log] = logs(session)
    assert (log.kind, log.status, log.to_address) == (EmailKind.WELCOME, EmailStatus.SENT, "riya@example.com")
    assert log.employee_id == uuid.UUID(response.json()["id"])


def test_no_email_when_hr_unticks_it(client, session, hr, mail_on, outbox):
    response = add(client, hr, send_welcome_email=False)

    assert response.status_code == 201
    assert response.json()["welcome_email"] is None
    assert outbox == []
    assert logs(session) == []


def test_mail_off_is_skipped_and_logged(client, session, hr):
    response = add(client, hr)

    assert response.status_code == 201
    assert response.json()["welcome_email"] == "SKIPPED"
    [log] = logs(session)
    assert log.status == EmailStatus.SKIPPED


@pytest.mark.parametrize(
    "fail",
    [
        lambda request: httpx.Response(422, json={"message": "The example.com domain is not verified."}),
        lambda request: (_ for _ in ()).throw(httpx.ConnectTimeout("timed out", request=request)),
    ],
    ids=["resend-refuses", "timeout"],
)
def test_a_mail_problem_never_undoes_the_account(client, session, hr, mail_on, monkeypatch, fail):
    monkeypatch.setattr(mail, "http_transport", httpx.MockTransport(fail))

    response = add(client, hr)

    assert response.status_code == 201
    assert response.json()["welcome_email"] == "FAILED"
    assert session.exec(select(Employee).where(Employee.email == "riya@example.com")).one()
    [log] = logs(session)
    assert log.status == EmailStatus.FAILED
    assert log.error


def test_the_log_never_holds_the_password(client, session, hr, mail_on, outbox):
    add(client, hr)

    [log] = logs(session)
    assert "Temp-pass-123" not in repr(log.model_dump())


def test_resend_sets_a_new_password_and_emails_it(client, session, hr, make_employee, mail_on, outbox):
    riya = make_employee("Riya")
    riya.password_hash = hash_password("Old-pass-123")
    riya.must_change_password = False
    session.add(riya)
    session.commit()

    response = client.post(f"/api/employees/{riya.id}/welcome-email", headers=auth(hr))

    assert response.status_code == 200
    new_password = response.json()["temporary_password"]
    assert response.json()["welcome_email"] == "SENT"
    assert new_password in outbox[0][0]["text"]
    session.refresh(riya)
    assert riya.must_change_password is True
    assert verify_password(new_password, riya.password_hash)
    login = {"email": riya.email}
    assert client.post("/api/auth/login", json={**login, "password": "Old-pass-123"}).status_code == 401
    assert client.post("/api/auth/login", json={**login, "password": new_password}).status_code == 200


def test_resend_refusals(client, session, hr, make_employee):
    employee = make_employee("Asha")
    gone = make_employee("Gone")
    gone.is_active = False
    session.add(gone)
    session.commit()

    def resend(target_id, as_user):
        return client.post(f"/api/employees/{target_id}/welcome-email", headers=auth(as_user))

    assert resend(employee.id, employee).status_code == 403  # HR only
    assert resend(uuid.uuid4(), hr).status_code == 404
    assert resend(gone.id, hr).json()["detail"] == "This account is deactivated."
    assert resend(hr.id, hr).json()["detail"] == "Use Change password for your own account."
    assert resend(gone.id, hr).status_code == 409


def test_smtp_provider_sends_text_and_html(client, hr, monkeypatch):
    monkeypatch.setenv("MAIL_DISABLED", "false")
    monkeypatch.setenv("MAIL_PROVIDER", "smtp")
    monkeypatch.setenv("MAIL_USERNAME", "bot@example.com")
    monkeypatch.setenv("MAIL_PASSWORD", "smtp-secret")
    monkeypatch.setenv("MAIL_REPLY_TO", "hr@example.com")
    get_settings.cache_clear()
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def starttls(self):
            calls.append(("starttls",))

        def login(self, user, password):
            calls.append(("login", user, password))

        def send_message(self, message):
            calls.append(("send", message))

    monkeypatch.setattr(mail, "smtp_factory", FakeSMTP)
    try:
        response = add(client, hr)
    finally:
        get_settings.cache_clear()

    assert response.json()["welcome_email"] == "SENT"
    assert ("starttls",) in calls and ("login", "bot@example.com", "smtp-secret") in calls
    message = email.message_from_bytes(calls[-1][1].as_bytes())
    assert message["To"] == "riya@example.com" and message["Reply-To"] == "hr@example.com"
    assert {part.get_content_type() for part in message.walk()} >= {"text/plain", "text/html"}


def test_resend_needs_a_from_address():
    with pytest.raises(ValueError, match="MAIL_FROM is required"):
        Settings(mail_provider="resend", resend_api_key="re_x", mail_from=None)


def test_temporary_passwords_are_readable():
    password = generate_temporary_password()
    assert len(password) == 12 and set(password) <= set(TEMPORARY_PASSWORD_ALPHABET)
