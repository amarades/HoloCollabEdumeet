from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google import genai
from typing import List, Optional
import traceback

from app.config import settings
from app.api.auth import get_current_user_token as get_current_user

router = APIRouter()

class AIService:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.ai_service == "gemini" and settings.gemini_api_key:
            try:
                self.client = genai.Client(api_key=settings.gemini_api_key)
                print("[OK] Gemini AI client successfully initialized.")
            except Exception as e:
                print(f"[ERROR] CRITICAL Warning: Failed to initialize Gemini client: {e}")
                traceback.print_exc()
        else:
            print(f"[INFO] Gemini AI client NOT initialized. Service: {settings.ai_service}, Key Present: {bool(settings.gemini_api_key)}")

    async def generate_content(self, prompt: str, history: Optional[List[dict]] = None) -> str:
        if self.client is None:
            raise HTTPException(status_code=500, detail="AI Service is not initialized. Please ensure your API key and AI_SERVICE environment variables are set.")

        try:
            # If history is provided, we use a chat session
            if history:
                chat = self.client.aio.chats.create(
                    model=settings.gemini_model or "gemini-2.0-flash",
                    history=history
                )
                response = await chat.send_message(prompt)
            else:
                response = await self.client.aio.models.generate_content(
                    model=settings.gemini_model or "gemini-2.0-flash",
                    contents=prompt
                )
            return response.text
        except Exception as e:
            print(f"Error generating AI content: {e}")
            raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

    async def generate_class_summary(self, transcript: str, topic: str) -> str:
        if not transcript.strip():
            return "No transcript available for this session."
            
        prompt = f"""
        As an educational assistant, summarize the following class session transcript.
        Topic: {topic}
        
        Transcript Content:
        {transcript}
        
        Provide a structured summary for students, including:
        1. Key Concepts Covered
        2. Important Definitions
        3. Summary of Discussions
        4. Action Items or Homework mentioned
        """
        return await self.generate_content(prompt)

# Singleton instance
ai_service = AIService()

# ─── API Types ────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str # "user" or "model"
    text: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str

class TranscriptRequest(BaseModel):
    transcript: str

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Handles chat requests using the Gemini AI service.
    """
    # Prepare history with strict role alternation
    formatted_history = []
    last_role = None
    
    for msg in request.history:
        role = "user" if msg.role == "user" else "model"
        if role != last_role:
            formatted_history.append({"role": role, "parts": [{"text": msg.text}]})
            last_role = role
            
    response_text = await ai_service.generate_content(request.message, history=formatted_history)
    return {"response": response_text}

@router.post("/topic-detect")
async def detect_topic(request: TranscriptRequest, current_user: dict = Depends(get_current_user)):
    """
    Detects the topic from a short transcript/speech segment.
    """
    prompt = f"Detect the main educational topic and up to 5 keywords from this text: '{request.transcript}'. Return as JSON: {{'topic': '...', 'keywords': ['...', ...], 'auto_load_model': {{'name': '...', 'thumbnail': '...'}} if a 3D model match exists}}"
    # Note: In a real app, we'd use constrained output (Schema) but for now we'll just parse the text or return a simple response.
    # For this task, we'll keep it simple.
    response_text = await ai_service.generate_content(prompt)
@router.post("/summarize")
async def summarize_transcript(request: TranscriptRequest, current_user: dict = Depends(get_current_user)):
    """
    Summarizes a class session transcript.
    """
    return {"response": await ai_service.generate_class_summary(request.transcript, "General Class Session")}

@router.post("/notes")
async def generate_notes(request: TranscriptRequest, current_user: dict = Depends(get_current_user)):
    """
    Converts a transcript into clean lecture notes.
    """
    prompt = f"Convert this transcript into clean lecture notes with headings and bullet points: {request.transcript}"
    response_text = await ai_service.generate_content(prompt)
    return {"response": response_text}
