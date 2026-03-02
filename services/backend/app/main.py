from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.api import auth, sessions, models
from app.db.engine import init_db
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables
    await init_db()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="HoloCollab EduMeet — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(models.router)

# Serve uploaded files
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "backend"}
