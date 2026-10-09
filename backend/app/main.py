from fastapi import FastAPI

from app.api.routes import health

app = FastAPI(
    title="Attendance App",
    version="0.1.0",
)

app.include_router(health.router, prefix="/api")
