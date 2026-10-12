from fastapi import FastAPI

from app.api.routes import auth, employees, health

app = FastAPI(
    title="Attendance App",
    version="0.1.0",
    docs_url="/docs",
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
