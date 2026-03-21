from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
import time
import uuid
from urllib.parse import parse_qsl, urlencode

from app.api import auth, sessions, models, observability, livekit_routes as livekit
from app.db.engine import init_db
from app.config import settings, get_cors_origins

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("backend")


def _redact_query(query: str) -> str:
    if not query:
        return ""
    redacted_keys = {"token", "ws_ticket", "host_token", "authorization"}
    pairs = parse_qsl(query, keep_blank_values=True)
    safe_pairs = []
    for key, value in pairs:
        safe_pairs.append((key, "[redacted]" if key.lower() in redacted_keys else value))
    return urlencode(safe_pairs)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        # We don't re-raise here so the app can at least start and provide health checks/docs
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="HoloCollab EduMeet - Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(models.router)
app.include_router(observability.router)
app.include_router(livekit.router, prefix="/api/livekit", tags=["livekit"])

# Serve uploaded files - directory creation is already handled in config.py
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = request_id
    started = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.exception(
            "request_failed",
            extra={
                "event": {
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query": _redact_query(str(request.url.query)),
                    "duration_ms": duration_ms,
                }
            },
        )
        raise

    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["x-request-id"] = request_id
    logger.info(
        "request_complete",
        extra={
            "event": {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        },
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "unhandled_exception",
        extra={
            "event": {
                "request_id": getattr(request.state, "request_id", None),
                "method": request.method,
                "path": request.url.path,
            }
        },
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health")
async def health():
    db_status = "healthy"
    tables = []
    try:
        from app.db.engine import engine
        from sqlalchemy import text, inspect
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            # Check if tables exist
            def get_tables(connection):
                return inspect(connection).get_table_names()
            
            table_names = await conn.run_sync(get_tables)
            tables = table_names
            if "users" not in table_names:
                db_status = "degraded: 'users' table not found"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "backend",
        "database": db_status,
        "tables": tables,
        "environment": settings.environment
    }
