from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.gestures import router
from app.config import get_cors_origins

app = FastAPI(title="CV Service - Gesture Classification", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "cv-service"}
