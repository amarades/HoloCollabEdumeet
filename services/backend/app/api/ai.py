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

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Handles chat requests using the new Google Gen AI SDK or a mock service.
    """
    # If mock is explicitly requested or client initialization failed/missing, return mock
    if settings.ai_service == "mock" or client is None:
        return {"response": f"Mock Response: I received your message '{request.message}'. (AI Service is in MOCK mode or API key is missing)"}
    
    try:
        # Prepare content list (history + new message)
        # The new SDK takes a list of Content objects
        contents = []
        for msg in request.history:
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.text}]})
        
        # Add the current message
        contents.append({"role": "user", "parts": [{"text": request.message}]})
        
        # Using the specified model or a fast default
        model_name = settings.gemini_model or "gemini-2.0-flash" # Default to latest flash if not set
        
        response = client.models.generate_content(
            model=model_name,
            contents=contents
        )
        
        return {"response": response.text}

    except Exception as e:
        error_msg = str(e)
        print(f"Error handling Gemini chat: {error_msg}")
        
        # If it's a permission error or invalid key, we provide a helpful mock response instead of 500
        if "403" in error_msg or "API_KEY_INVALID" in error_msg or "PERMISSION_DENIED" in error_msg:
             return {
                 "response": "I'm currently in limited mode because the Gemini API key provided is invalid or has expired. Please check your configuration.",
                 "error": "Invalid API Key"
             }
             
        raise HTTPException(
            status_code=500, 
            detail={"message": "Failed to communicate with AI service", "error": error_msg}
        )
