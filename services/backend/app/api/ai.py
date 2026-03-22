from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai
from typing import List

from app.config import settings
from app.api.auth import get_current_user_token as get_current_user

router = APIRouter()

# Initialize Gemini only if configured
if settings.ai_service == "gemini" and settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

class ChatMessage(BaseModel):
    role: str # "user" or "model"
    text: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str

@router.post("/chat")
async def chat_with_ai(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Handles chat requests using Google Gemini API.
    Receives chat history and a new message, sends it to Gemini, and returns the response.
    """
    if settings.ai_service != "gemini" or not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API is not configured on the server.")
    
    try:
        model = genai.GenerativeModel(settings.gemini_model or "gemini-1.5-flash")
        
        # Format the history for the Gemini SDK
        formatted_history = []
        for msg in request.history:
            role = "user" if msg.role == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg.text]})
        
        # Create a chat session with the previous context
        chat = model.start_chat(history=formatted_history)
        
        # Send the new message
        response = chat.send_message(request.message)
        
        return {"response": response.text}

    except Exception as e:
        print(f"Error handling Gemini chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
