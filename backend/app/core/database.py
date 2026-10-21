from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.pool import NullPool
from sqlmodel import Session, create_engine

from app.core.config import get_settings

settings = get_settings()

if settings.environment == "production":
    # Vercel + Supabase transaction pooler (port 6543)
    engine_options = {"poolclass": NullPool, "connect_args": {"prepare_threshold": None}}
else:
    # Local + Supabase session pooler (port 5432)
    engine_options = {}

engine = create_engine(settings.database_url, pool_pre_ping=True, **engine_options)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]

    