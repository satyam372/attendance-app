"""Login and password changes. Raises AuthError subclasses, never HTTPException,
so the seed script, tests and cron jobs can call these outside a request."""

from sqlmodel import Session, select

from app.core.security import hash_password, verify_password
from app.models.user import Employee

# Precomputed bcrypt hash of a throwaway string. Checked when the email is unknown so that
# "no such user" takes as long as "wrong password" and timing does not reveal valid emails.
_DUMMY_HASH = "$2b$12$Qgeb6Sb9PWkXoJcdhnVR7eNQiiqnIeT2anw0wZa3bjgYZ3Wg2mgsi"


class AuthError(Exception):
    """Base class for authentication errors. The route maps each subclass to a status code."""


class InvalidCredentialsError(AuthError):
    """Unknown email or wrong password. One error for both so emails cannot be probed."""


class InactiveAccountError(AuthError):
    """Correct password, but HR has deactivated the account."""


class WrongPasswordError(AuthError):
    """Current password did not match during a password change."""


class SamePasswordError(AuthError):
    """New password is the same as the current one."""


def authenticate(session: Session, email: str, password: str) -> Employee:
    email = email.strip().lower()
    employee = session.exec(select(Employee).where(Employee.email == email)).first()

    if employee is None:
        verify_password(password, _DUMMY_HASH)
        raise InvalidCredentialsError
    if not verify_password(password, employee.password_hash):
        raise InvalidCredentialsError
    # Only reached with the right password, so this does not leak which emails exist
    if not employee.is_active:
        raise InactiveAccountError
    return employee


def change_password(
    session: Session, employee: Employee, current_password: str, new_password: str
) -> Employee:
    if not verify_password(current_password, employee.password_hash):
        raise WrongPasswordError
    if verify_password(new_password, employee.password_hash):
        raise SamePasswordError

    employee.password_hash = hash_password(new_password)
    employee.must_change_password = False
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return employee
