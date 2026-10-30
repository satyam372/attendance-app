"""Email content. Each function returns (subject, plain text, HTML).

The HTML uses inline styles and tables, which is what email clients (Gmail, Outlook, phone mail
apps) reliably render; the app's Tailwind classes do not work in email. Colours follow the SpeedIn
palette. Every value from the database is HTML-escaped.
"""

from html import escape

BRAND = "#493085"
INK = "#001e33"
SOFT = "#334155"
MUTED = "#4a5567"
FONT = "Rubik, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def welcome_email(
    *, name: str, email: str, temporary_password: str, app_url: str, can_reply: bool
) -> tuple[str, str, str]:
    """Login details for a new account, or new ones when HR resends them."""
    first_name = name.split()[0] if name.split() else name
    login_url = app_url.rstrip("/") + "/login"
    subject = "Your SpeedIn account is ready"
    help_line = "Questions? Reply to this email and it goes to HR." if can_reply else "Questions? Contact HR."

    text = f"""Hi {first_name},

HR has created your SpeedIn account. Use it to check in, apply for leave or work from home, and see your attendance.

Sign in: {login_url}
Email: {email}
Temporary password: {temporary_password}

The first time you sign in, you'll choose your own password. This temporary one stops working after that.

Don't forward this email or share the password with anyone.

{help_line}
SpeedIn Attendance, Speed Innovations
"""

    e = {
        "first_name": escape(first_name),
        "email": escape(email),
        "password": escape(temporary_password),
        "login_url": escape(login_url, quote=True),
        "help_line": escape(help_line),
    }
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1eff8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your login details for SpeedIn Attendance.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1eff8;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:{FONT};color:{INK};">
  <tr><td style="background:{BRAND};padding:24px 32px;">
    <div style="font-size:24px;font-weight:700;letter-spacing:0.02em;color:#ffffff;">Speed<span style="color:#5ee6d0;">In</span></div>
    <div style="margin-top:4px;font-size:13px;color:#d4c6ff;">Attendance for Speed Innovations</div>
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:{INK};">Hi {e["first_name"]}, your account is ready</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:{SOFT};">HR has created your SpeedIn account. Use it to check in, apply for leave or work from home, and see your attendance.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f9;border-radius:14px;">
      <tr><td style="padding:18px 20px;font-size:14px;line-height:1.5;">
        <div style="color:{MUTED};">Email</div>
        <div style="margin:2px 0 14px;font-weight:600;color:{INK};word-break:break-all;">{e["email"]}</div>
        <div style="color:{MUTED};">Temporary password</div>
        <div style="margin-top:2px;font-family:Consolas,Menlo,'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:0.05em;color:{INK};">{e["password"]}</div>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;">
      <tr><td style="border-radius:12px;background:{BRAND};">
        <a href="{e["login_url"]}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">Sign in to SpeedIn</a>
      </td></tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:{SOFT};">The first time you sign in, you'll choose your own password. This temporary one stops working after that.</p>
    <p style="margin:0;font-size:14px;line-height:1.6;font-weight:600;color:#991b1b;">Don't forward this email or share the password with anyone.</p>
  </td></tr>
  <tr><td style="padding:18px 32px 24px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:{MUTED};">
    {e["help_line"]}<br>
    If the button doesn't work, open <a href="{e["login_url"]}" style="color:{BRAND};">{e["login_url"]}</a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""
    return subject, text, html
