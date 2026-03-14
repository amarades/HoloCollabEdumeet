"""
AI Service Main Application
Provides AI-powered features for HoloCollab EduMeet
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import router
from app.config import get_cors_origins

app = FastAPI(
    title="AI Service",
    description="AI-powered features for HoloCollab EduMeet",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-service"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Service",
        "version": "1.0.0",
        "endpoints": ["/api/ai/chat", "/api/ai/quiz", "/api/ai/explain", "/api/ai/lecture-notes"]
    }
