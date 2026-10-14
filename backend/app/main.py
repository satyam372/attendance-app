from fastapi import FastAPI

from app.api.routes import (
    attendance,
    auth,
    dashboard,
    employees,
    health,
    holidays,
    requests,
)

app = FastAPI(
    title="Attendance App",
    version="0.1.0",
    docs_url="/docs",
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(holidays.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
