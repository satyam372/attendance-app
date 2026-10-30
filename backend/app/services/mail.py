"""Sending email and recording each attempt in email_log.

Mail goes out during the request: on Vercel a background task can be cut off once the response
is sent. deliver() never raises, so a mail problem never undoes the action that triggered it
(for example creating an account); the caller gets SENT, FAILED or SKIPPED back instead.
"""

import smtplib
from email.message import EmailMessage
from email.utils import formataddr

import httpx
from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.models.email_log import EmailLog
from app.models.enums import EmailKind, EmailStatus

RESEND_URL = "https://api.resend.com/emails"

# Swapped out in tests (tests/conftest.py), so no test can reach a real mail server even when
# backend/.env has real mail settings
http_transport: httpx.BaseTransport | None = None
smtp_factory = smtplib.SMTP


class MailError(Exception):
    """The mail provider refused the email."""


# What a send can fail with: the provider refusing (MailError), HTTP/timeouts (httpx), SMTP replies,
# and network errors such as refused connections (OSError)
SEND_ERRORS = (MailError, httpx.HTTPError, smtplib.SMTPException, OSError)


def _sender(settings: Settings) -> str:
    return formataddr((settings.mail_from_name, settings.mail_from or settings.mail_username))


def _send_resend(settings: Settings, to: str, subject: str, text: str, html: str) -> None:
    payload = {"from": _sender(settings), "to": [to], "subject": subject, "text": text, "html": html}
    if settings.mail_reply_to:
        payload["reply_to"] = settings.mail_reply_to
    headers = {"Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}"}
    with httpx.Client(timeout=settings.mail_timeout_seconds, transport=http_transport) as client:
        response = client.post(RESEND_URL, json=payload, headers=headers)
    if response.is_error:
        try:
            message = response.json().get("message") or response.text
        except ValueError:
            message = response.text
        raise MailError(f"Resend {response.status_code}: {message}")


def _send_smtp(settings: Settings, to: str, subject: str, text: str, html: str) -> None:
    message = EmailMessage()
    message["From"] = _sender(settings)
    message["To"] = to
    message["Subject"] = subject
    if settings.mail_reply_to:
        message["Reply-To"] = settings.mail_reply_to
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    with smtp_factory(settings.mail_server, settings.mail_port, timeout=settings.mail_timeout_seconds) as smtp:
        smtp.starttls()
        smtp.login(settings.mail_username, settings.mail_password.get_secret_value())
        smtp.send_message(message)


def send_email(to: str, subject: str, text: str, html: str) -> None:
    """Send one email through the configured provider. Raises on any failure."""
    settings = get_settings()
    if settings.mail_provider == "resend":
        _send_resend(settings, to, subject, text, html)
    else:
        _send_smtp(settings, to, subject, text, html)


def deliver(
    session: Session,
    *,
    kind: EmailKind,
    to: str,
    subject: str,
    text: str,
    html: str,
    employee_id=None,
    work_date=None,
) -> EmailStatus:
    """Send (or skip, when mail is off) and record the attempt. Never raises.

    The body is not stored in email_log: some emails, like the welcome email, contain a password.
    """
    status, error = EmailStatus.SKIPPED, None
    if get_settings().mail_enabled:
        try:
            send_email(to, subject, text, html)
            status = EmailStatus.SENT
        except SEND_ERRORS as exc:  # recorded, never raised
            status, error = EmailStatus.FAILED, f"{type(exc).__name__}: {exc}"[:1000]

    session.add(
        EmailLog(
            employee_id=employee_id,
            kind=kind,
            work_date=work_date,
            to_address=to,
            subject=subject[:255],
            status=status,
            error=error,
        )
    )
    session.commit()
    return status
