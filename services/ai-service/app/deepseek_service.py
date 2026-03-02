from openai import AsyncOpenAI
from typing import Dict, Optional
from app.config import settings
import json


class DeepSeekService:
    """
    DeepSeek AI Service for HoloCollab EduMeet
    Uses OpenAI-compatible API with DeepSeek models
    """
    
    def __init__(self):
        if not settings.deepseek_api_key:
            raise ValueError("DeepSeek API key not configured")
        
        # DeepSeek uses OpenAI-compatible API
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com"
        )
        self.model = settings.deepseek_model
    
    async def chat(self, message: str, context: Optional[Dict] = None) -> Dict:
        """Generate chat response using DeepSeek"""
        try:
            model_name = context.get('modelName', 'general topic') if context else 'general topic'
            
            system_prompt = f"""You are an educational AI assistant helping students learn about {model_name}.
            
Your role is to:
- Explain concepts clearly and concisely
- Provide accurate educational information
- Encourage curiosity and deeper learning
- Use analogies and examples when helpful
- Keep responses focused and relevant to {model_name}

Be friendly, supportive, and educational."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return {
                "response": response.choices[0].message.content
            }
            
        except Exception as e:
            print(f"DeepSeek chat error: {e}")
            raise
    
    async def generate_quiz(self, model_name: str, difficulty: str = "medium", 
                          question_count: int = 5) -> Dict:
        """Generate quiz questions using DeepSeek"""
        try:
            prompt = f"""Generate {question_count} {difficulty} difficulty multiple-choice questions about {model_name}.

For each question, provide:
1. A clear, educational question
2. Four answer options (A, B, C, D)
3. The correct answer (0-3 index)
4. A brief explanation of why that answer is correct

Format your response as a JSON array with this structure:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation here"
  }}
]

Make questions educational and appropriate for students learning about {model_name}."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an educational quiz generator. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=1500
            )
            
            # Parse the JSON response
            questions_text = response.choices[0].message.content
            
            # Extract JSON from markdown code blocks if present
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
            print(f"DeepSeek quiz generation error: {e}")
            raise
    
    async def explain(self, concept: str, context: Optional[Dict] = None) -> Dict:
        """Generate explanation using DeepSeek"""
        try:
            model_name = context.get('modelName', 'this topic') if context else 'this topic'
            
            prompt = f"""Explain the concept of "{concept}" in the context of {model_name}.

Provide:
1. A clear, concise explanation (2-3 paragraphs)
2. Why this concept is important
3. How it relates to {model_name}
4. A simple analogy or example if applicable

Keep the explanation educational and accessible to students."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an educational AI that explains concepts clearly and concisely."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=600
            )
            
            explanation_text = response.choices[0].message.content
            
            # Extract related topics using a follow-up call
            topics_response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "List 3 related topics as a JSON array of strings."},
                    {"role": "user", "content": f"What are 3 topics related to '{concept}' in the context of {model_name}?"}
                ],
                temperature=0.5,
                max_tokens=100
            )
            
            topics_text = topics_response.choices[0].message.content
            if "```json" in topics_text:
                topics_text = topics_text.split("```json")[1].split("```")[0].strip()
            elif "```" in topics_text:
                topics_text = topics_text.split("```")[1].split("```")[0].strip()
            
            try:
                related_topics = json.loads(topics_text)
            except:
                related_topics = ["Structure", "Function", "Applications"]
            
            return {
                "explanation": explanation_text,
                "relatedTopics": related_topics
            }
            
        except Exception as e:
            print(f"DeepSeek explanation error: {e}")
            raise


# Create service instance
deepseek_service = DeepSeekService() if settings.ai_service == "deepseek" and settings.deepseek_api_key else None
