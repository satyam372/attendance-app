# Vercel entrypoint: Vercel looks for a top-level `app` here
from app.main import app

__all__ = ["app"]
