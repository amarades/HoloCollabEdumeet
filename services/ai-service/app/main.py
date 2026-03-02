"""
AI Service Main Application
Provides AI-powered features for HoloCollab EduMeet
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.router import router

app = FastAPI(
    title="AI Service",
    description="AI-powered features for HoloCollab EduMeet",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include AI router
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
