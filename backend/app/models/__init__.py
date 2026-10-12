"""Import every table model here so SQLModel.metadata (used by Alembic) sees all tables."""

from app.models.user import Employee

__all__ = ["Employee"]
