from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.health import check_database_health

app = FastAPI(
    title="FlowPocket API",
    description="Backend REST API for FlowPocket Personal & Group Expense Management",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check():
    """Liveness check for backend service"""
    return {
        "status": "ok",
        "service": "flowpocket-backend",
        "environment": settings.APP_ENV,
    }


@app.get("/ready", tags=["System"])
def readiness_check(response: Response):
    """Readiness check including database connectivity"""
    db_ok = check_database_health()
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "degraded",
            "database": "disconnected",
            "service": "flowpocket-backend",
        }
    return {
        "status": "ready",
        "database": "connected",
        "service": "flowpocket-backend",
    }


@app.get("/api/v1/health", tags=["System"])
def api_v1_health(response: Response):
    """API v1 health status endpoint"""
    return readiness_check(response)

