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

    async def detect_topic(self, transcript: str) -> Dict:
        await asyncio.sleep(0.5)
        # Simple extraction for mock
        words = transcript.split()
        topic = " ".join(words[:3]) if words else "General Education"
        return {
            "topic": topic,
            "keywords": [w for w in words if len(w) > 4][:5]
        }

    async def generate_lecture_notes(self, topic: str, model_name: str, transcript: str = "") -> Dict:
        await asyncio.sleep(1.0)
        return {
            "summary": f"This lecture covers {topic}, focusing on its core principles and relationship with {model_name}.",
            "key_points": [
                f"Introduction to {topic}",
                f"Understanding {model_name} in context",
                "Practical applications and modern research"
            ],
            "important_terms": [topic, model_name, "Analysis", "Synthesis"],
            "follow_up_questions": [
                f"How does {topic} impact our understanding of {model_name}?",
                "What are the three most important takeaways?"
            ]
        }

    async def detect_doubts(self, messages: List[str]) -> Dict:
        await asyncio.sleep(0.5)
        return {
            "confused_topic": "None",
            "confusion_percentage": 0,
            "sample_questions": []
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

    print("[INFO] Using Mock AI service")
    return MockAIService()


ai_service = get_ai_service()
