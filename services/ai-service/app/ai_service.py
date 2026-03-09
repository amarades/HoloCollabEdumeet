import asyncio
import random
from typing import Dict, Optional
from app.config import settings


class MockAIService:
    """
    Mock AI Service for development/testing.
    Replace with a real service by setting AI_SERVICE in .env
    """

    def __init__(self):
        self.model_knowledge = {
            'default': {
                'facts': [
                    'This is an educational 3D model.',
                    'You can interact with it using hand gestures.',
                    'Try asking specific questions about the model.',
                ],
                'quiz': [
                    {
                        'question': 'What is the purpose of 3D visualization in education?',
                        'options': ['Entertainment', 'Better spatial understanding', 'Decoration', 'None of the above'],
                        'correctAnswer': 1,
                        'explanation': '3D visualization helps students understand complex spatial concepts better than 2D representations.',
                    }
                ],
            }
        }

    async def chat(self, message: str, context: Optional[Dict] = None) -> Dict:
        await asyncio.sleep(0.8)
        model_name = context.get('modelName', 'default') if context else 'default'
        knowledge = self.model_knowledge.get(model_name, self.model_knowledge['default'])
        lower = message.lower()

        if 'what is' in lower or 'tell me about' in lower:
            fact = random.choice(knowledge['facts'])
            return {'response': f"About {model_name}: {fact}\n\nWould you like to know more or take a quiz?"}

        if 'how' in lower or 'why' in lower:
            return {'response': f"Great question about {model_name}! {knowledge['facts'][0]} Would you like a quiz?"}

        if 'quiz' in lower or 'test' in lower:
            return {'response': f'Click "Generate Quiz" below to start a quiz about {model_name}.'}

        return {
            'response': (
                f"I'm here to help you learn about {model_name}. You can ask me:\n"
                f"• What is {model_name}?\n"
                f"• How does it work?\n"
                f"• Generate a quiz\n\nWhat would you like to know?"
            )
        }

    async def generate_quiz(self, model_name: str, difficulty: str = "medium", question_count: int = 5) -> Dict:
        await asyncio.sleep(1.0)
        knowledge = self.model_knowledge.get(model_name, self.model_knowledge['default'])
        questions = knowledge['quiz'][:question_count]
        return {'modelName': model_name, 'difficulty': difficulty, 'questions': questions, 'totalQuestions': len(questions)}

    async def explain(self, concept: str, context: Optional[Dict] = None) -> Dict:
        await asyncio.sleep(0.6)
        model_name = context.get('modelName', 'default') if context else 'default'
        knowledge = self.model_knowledge.get(model_name, self.model_knowledge['default'])
        return {
            'explanation': f"{concept} in the context of {model_name}:\n\n" + '\n\n'.join(knowledge['facts']),
            'relatedTopics': ['Structure', 'Function', 'Importance'],
        }

    async def generate_lecture_notes(self, topic: str, model_name: str) -> Dict:
        await asyncio.sleep(1.2)
        return {
            'topic': topic,
            'model_name': model_name,
            'notes': (
                f"# Lecture Notes: {topic}\n\n"
                f"## Introduction to {model_name}\n"
                f"This session explores the {model_name}, a key component in understanding {topic}.\n\n"
                f"## Key Concepts\n"
                f"1. **Structure**: Detailed examination of the {model_name}'s anatomy.\n"
                f"2. **Function**: How the {model_name} operates within the larger system.\n"
                f"3. **Clinical Significance**: Common conditions and treatments related to {model_name}.\n\n"
                f"## Discussion Questions\n"
                f"- How does the structure of {model_name} support its function?\n"
                f"- What are the primary features visible in the 3D model?\n"
                f"- Compare normal vs. pathological states of {model_name}.\n"
            ),
        }


def get_ai_service():
    """Factory: pick the configured AI backend, fall back to Mock."""
    if settings.ai_service == "ollama":
        try:
            from app.ollama_service import ollama_service
            print("[OK] Using Ollama AI service (local models)")
            return ollama_service
        except Exception as e:
            print(f"[WARNING] Ollama failed: {e} — falling back to Mock")

    if settings.ai_service == "openai":
        try:
            from app.openai_service import openai_service
            if openai_service:
                print("[OK] Using OpenAI service")
                return openai_service
        except Exception as e:
            print(f"[WARNING] OpenAI failed: {e} — falling back to Mock")

    elif settings.ai_service == "gemini":
        try:
            from app.gemini_service import gemini_service
            if gemini_service:
                print("[OK] Using Gemini service")
                return gemini_service
        except Exception as e:
            print(f"[WARNING] Gemini failed: {e} — falling back to Mock")

    elif settings.ai_service == "deepseek":
        try:
            from app.deepseek_service import deepseek_service
            if deepseek_service:
                print("[OK] Using DeepSeek service")
                return deepseek_service
        except Exception as e:
            print(f"[WARNING] DeepSeek failed: {e} — falling back to Mock")

    print("[INFO] Using Mock AI service")
    return MockAIService()


ai_service = get_ai_service()
