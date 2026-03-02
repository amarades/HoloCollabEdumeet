from openai import AsyncOpenAI
from typing import Dict, Optional
from app.config import settings
import json


class OpenAIService:
    """OpenAI GPT integration for HoloCollab EduMeet."""

    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    async def chat(self, message: str, context: Optional[Dict] = None) -> Dict:
        model_name = context.get('modelName', 'general topic') if context else 'general topic'
        system_prompt = (
            f"You are an educational AI assistant helping students learn about {model_name}. "
            "Explain concepts clearly, use analogies, and encourage curiosity. Be friendly and concise."
        )
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": message}],
            temperature=0.7,
            max_tokens=500,
        )
        return {"response": response.choices[0].message.content}

    async def generate_quiz(self, model_name: str, difficulty: str = "medium", question_count: int = 5) -> Dict:
        prompt = (
            f"Generate {question_count} {difficulty} difficulty multiple-choice questions about {model_name}.\n"
            "Return ONLY a JSON array:\n"
            '[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"..."}]'
        )
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an educational quiz generator. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=1500,
        )
        text = response.choices[0].message.content
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        questions = json.loads(text)
        return {"modelName": model_name, "difficulty": difficulty, "questions": questions[:question_count], "totalQuestions": len(questions[:question_count])}

    async def explain(self, concept: str, context: Optional[Dict] = None) -> Dict:
        model_name = context.get('modelName', 'this topic') if context else 'this topic'
        prompt = f'Explain "{concept}" in the context of {model_name} in 2-3 paragraphs with a simple analogy.'
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": "You are an educational AI."}, {"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
        )
        explanation = response.choices[0].message.content

        topics_resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "List 3 related topics as a JSON array of strings. No other text."},
                {"role": "user", "content": f"Topics related to '{concept}' in context of {model_name}?"},
            ],
            temperature=0.5,
            max_tokens=100,
        )
        topics_text = topics_resp.choices[0].message.content
        if "```json" in topics_text:
            topics_text = topics_text.split("```json")[1].split("```")[0].strip()
        elif "```" in topics_text:
            topics_text = topics_text.split("```")[1].split("```")[0].strip()
        try:
            related_topics = json.loads(topics_text)
        except Exception:
            related_topics = ["Structure", "Function", "Applications"]

        return {"explanation": explanation, "relatedTopics": related_topics}


openai_service = OpenAIService() if settings.ai_service == "openai" and settings.openai_api_key else None
