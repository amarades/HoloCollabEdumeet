import google.generativeai as genai
from typing import Dict, Optional
from app.config import settings
import json


class GeminiService:
    """
    Google Gemini Service for HoloCollab EduMeet
    Provides real AI-powered responses using Google's Gemini models
    """
    
    def __init__(self):
        if not settings.gemini_api_key:
            raise ValueError("Gemini API key not configured")
        
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)
    
    async def chat(self, message: str, context: Optional[Dict] = None) -> Dict:
        """Generate chat response using Gemini"""
        try:
            model_name = context.get('modelName', 'general topic') if context else 'general topic'
            
            prompt = f"""You are an educational AI assistant helping students learn about {model_name}.

Student question: {message}

Provide a clear, concise, and educational response. Be friendly and supportive."""

            response = await self.model.generate_content_async(prompt)
            
            return {
                "response": response.text
            }
            
        except Exception as e:
            print(f"Gemini chat error: {e}")
            raise
    
    async def generate_quiz(self, model_name: str, difficulty: str = "medium", 
                          question_count: int = 5) -> Dict:
        """Generate quiz questions using Gemini"""
        try:
            prompt = f"""Generate {question_count} {difficulty} difficulty multiple-choice questions about {model_name}.

Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  {{
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct"
  }}
]

Make questions educational and appropriate for students."""

            response = await self.model.generate_content_async(prompt)
            questions_text = response.text.strip()
            
            # Clean up response
            if "```json" in questions_text:
                questions_text = questions_text.split("```json")[1].split("```")[0].strip()
            elif "```" in questions_text:
                questions_text = questions_text.split("```")[1].split("```")[0].strip()
            
            questions = json.loads(questions_text)
            
            return {
                "modelName": model_name,
                "difficulty": difficulty,
                "questions": questions[:question_count],
                "totalQuestions": len(questions[:question_count])
            }
            
        except Exception as e:
            print(f"Gemini quiz generation error: {e}")
            raise
    
    async def explain(self, concept: str, context: Optional[Dict] = None) -> Dict:
        """Generate explanation using Gemini"""
        try:
            model_name = context.get('modelName', 'this topic') if context else 'this topic'
            
            prompt = f"""Explain "{concept}" in the context of {model_name}.

Provide:
1. Clear explanation (2-3 paragraphs)
2. Why it's important
3. How it relates to {model_name}
4. A simple analogy

Also list 3 related topics as a JSON object:
{{
  "explanation": "your explanation here",
  "relatedTopics": ["topic1", "topic2", "topic3"]
}}"""

            response = await self.model.generate_content_async(prompt)
            response_text = response.text.strip()
            
            # Try to parse as JSON
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            try:
                result = json.loads(response_text)
                return result
            except:
                # Fallback if not JSON
                return {
                    "explanation": response_text,
                    "relatedTopics": ["Structure", "Function", "Applications"]
                }
            
        except Exception as e:
            print(f"Gemini explanation error: {e}")
            raise


# Create service instance
gemini_service = GeminiService() if settings.ai_service == "gemini" and settings.gemini_api_key else None
