from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google import genai
from typing import List

from app.config import settings
from app.api.auth import get_current_user_token as get_current_user

router = APIRouter()

# Initialize Client if configured
client = None
if settings.ai_service == "gemini" and settings.gemini_api_key:
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini client: {e}")

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    text: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str

class TranscriptRequest(BaseModel):
    transcript: str

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Handles chat requests using the new Google Gen AI SDK or a mock service.
    """
    if settings.ai_service == "mock" or client is None:
        return {"response": f"Mock Response: I received your message '{request.message}'. (AI Service is in MOCK mode or API key is missing)"}
    
    try:
        # Prepare contents with proper role alternation
        contents = []
        last_role = None
        
        for msg in request.history:
            role = "user" if msg.role == "user" else "model"
            # Ensure roles alternate; if same as last, we skip or combine (skipping for simplicity here)
            if role == last_role:
                continue
            contents.append({"role": role, "parts": [{"text": msg.text}]})
            last_role = role
        
        # Add the current message (must be "user")
        if last_role == "user":
            # If the last message in history was also user, we can't just append. 
            # We'll just replace the history or handle it. 
            # For now, let's just ensure we finish with a user message.
            pass
        
        contents.append({"role": "user", "parts": [{"text": request.message}]})
        
        model_name = settings.gemini_model or "gemini-2.0-flash"
        
        response = client.models.generate_content(
            model=model_name,
            contents=contents
        )
        
        return {"response": response.text}

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error handling Gemini chat: {error_msg}")
        traceback.print_exc()
        
        if any(x in error_msg for x in ["403", "API_KEY_INVALID", "PERMISSION_DENIED"]):
             return {
                 "response": "I'm currently in limited mode because the Gemini API key provided is invalid or has expired. Please check your configuration.",
                 "error": "Invalid API Key"
             }
             
        raise HTTPException(
            status_code=500, 
            detail={"message": "Failed to communicate with AI service", "error": error_msg}
        )

@router.post("/summarize")
async def summarize_meeting(request: TranscriptRequest, current_user: dict = Depends(get_current_user)):
    """
    Generates a meeting summary from a transcript.
    """
    if settings.ai_service == "mock" or client is None:
        return {"response": "Mock Summary: This was a productive meeting about project features and timelines."}

    prompt = f"""
    This is a meeting transcript:
    {request.transcript}

    Summarize the meeting with:
    - Key points
    - Decisions made
    - Action items
    """
    
    try:
        response = client.models.generate_content(
            model=settings.gemini_model or "gemini-2.0-flash",
            contents=prompt
        )
        return {"response": response.text}
    except Exception as e:
        print(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notes")
async def generate_notes(request: TranscriptRequest, current_user: dict = Depends(get_current_user)):
    """
    Converts a transcript into clean meeting notes.
    """
    if settings.ai_service == "mock" or client is None:
        return {"response": "Mock Notes: \n- Feature Discussion\n- Deployment Plan\n- Next Sync: Friday"}

    prompt = f"""
    Convert this lecture or meeting transcript into clean notes
    with headings and bullet points:
    {request.transcript}
    """
    
    try:
        response = client.models.generate_content(
            model=settings.gemini_model or "gemini-2.0-flash",
            contents=prompt
        )
        return {"response": response.text}
    except Exception as e:
        print(f"Error generating notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))
