"""Ollama-powered AI service for HoloCollab EduMeet.

All methods call the local Ollama server at http://localhost:11434.
Models: llama3.2 (fast) for classification/detection, mistral (smart) for generation.
"""
import json
import re
import httpx
from typing import Dict, List, Optional, Any


OLLAMA_BASE = "http://localhost:11434/api/generate"
MODEL_FAST = "llama3.2"
MODEL_SMART = "mistral"


async def _ollama(model: str, prompt: str, timeout: float = 30.0) -> str:
    """Low-level helper — POST to Ollama and return the response text."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(OLLAMA_BASE, json={
            "model": model,
            "prompt": prompt,
            "stream": False,
        })
        resp.raise_for_status()
        return resp.json().get("response", "")


def _extract_json(text: str) -> dict:
    """Strip any markdown fences and parse JSON from Ollama response."""
    # Remove markdown code fences
    text = re.sub(r"```(?:json)?", "", text).strip()
    # Find the first {...} block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text)


class OllamaAIService:
    """Real AI service backed by locally-running Ollama models."""

    # ── Feature 2: Voice Topic Detection ──────────────────────────────────────
    async def detect_topic(self, transcript: str) -> Dict:
        prompt = (
            "From this classroom speech transcript, extract the main educational topic.\n"
            'Reply ONLY as JSON with no extra text:\n'
            '{"topic": "...", "keywords": ["...", "..."]}\n'
            f"Transcript: {transcript}"
        )
        try:
            raw = await _ollama(MODEL_FAST, prompt, timeout=15)
            return _extract_json(raw)
        except Exception as e:
            return {"topic": "Unknown", "keywords": [], "error": str(e)}

    # ── Feature 6: AI Lecture Summary ──────────────────────────────────────────
    async def generate_lecture_notes(self, topic: str, model_name: str, transcript: str = "") -> Dict:
        transcript_part = f"\nTranscript excerpt: {transcript[:500]}" if transcript else ""
        prompt = (
            "You are an educational AI. Generate structured lecture notes.\n"
            f"Topic: {topic}\n"
            f"3D Model shown: {model_name}{transcript_part}\n\n"
            "Reply ONLY as JSON:\n"
            '{"summary": "2-3 sentence overview", '
            '"key_points": ["point 1", "point 2", "point 3"], '
            '"explanation": "paragraph explanation", '
            '"follow_up_questions": ["q1", "q2", "q3"]}'
        )
        try:
            raw = await _ollama(MODEL_SMART, prompt, timeout=45)
            data = _extract_json(raw)
            data["topic"] = topic
            data["model_name"] = model_name
            return data
        except Exception as e:
            # Fallback
            return {
                "topic": topic,
                "model_name": model_name,
                "summary": f"Session on {topic} using {model_name} as the 3D reference.",
                "key_points": ["Please review your notes.", "Consult textbook for details."],
                "explanation": "AI service unavailable. Please try again.",
                "follow_up_questions": ["What did you learn today?"],
                "error": str(e),
            }

    # ── Feature 7: Smart Doubt Detection ──────────────────────────────────────
    async def detect_doubts(self, messages: List[str]) -> Dict:
        joined = "\n".join(messages[:30])  # Cap to last 30 messages
        prompt = (
            "Analyze these classroom chat messages and identify what topic students are confused about.\n"
            'Reply ONLY as JSON:\n'
            '{"confused_topic": "...", "confusion_percentage": 30, "sample_questions": ["..."]}\n'
            f"Messages:\n{joined}"
        )
        try:
            raw = await _ollama(MODEL_FAST, prompt, timeout=15)
            return _extract_json(raw)
        except Exception as e:
            return {"confused_topic": "Unknown", "confusion_percentage": 0, "sample_questions": [], "error": str(e)}

    # ── Feature 8: AI Quiz Generator ──────────────────────────────────────────
    async def generate_quiz(self, model_name: str, difficulty: str = "medium", question_count: int = 5) -> Dict:
        prompt = (
            f"Generate {question_count} {difficulty} educational quiz questions about {model_name}.\n"
            "Reply ONLY as JSON with no extra text:\n"
            '{"questions": [{"question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "..."}]}'
        )
        try:
            raw = await _ollama(MODEL_SMART, prompt, timeout=45)
            data = _extract_json(raw)
            return {
                "modelName": model_name,
                "difficulty": difficulty,
                "questions": data.get("questions", []),
                "totalQuestions": len(data.get("questions", [])),
            }
        except Exception as e:
            # Return a minimal fallback quiz
            return {
                "modelName": model_name,
                "difficulty": difficulty,
                "questions": [
                    {
                        "question": f"What is the main function of {model_name}?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correctAnswer": 0,
                        "explanation": "AI service unavailable.",
                    }
                ],
                "totalQuestions": 1,
                "error": str(e),
            }

    # ── Standard methods (kept for compatibility with base interface) ──────────
    async def chat(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict:
        model_name = (context or {}).get("modelName", "the 3D model")
        topic = (context or {}).get("detectedTopic", "")
        topic_hint = f" The current topic is: {topic}." if topic else ""
        prompt = (
            f"You are a helpful classroom AI assistant for a HoloCollab session about {model_name}.{topic_hint}\n"
            f"Student question: {message}\n"
            "Give a concise, educational answer in 2-4 sentences."
        )
        try:
            response = await _ollama(MODEL_FAST, prompt, timeout=20)
            return {"response": response.strip()}
        except Exception as e:
            return {"response": f"Sorry, I couldn't connect to the AI model. ({e})"}

    async def explain(self, concept: str, context: Optional[Dict[str, Any]] = None) -> Dict:
        model_name = (context or {}).get("modelName", "the 3D model")
        prompt = f"Explain '{concept}' in the context of {model_name} in 3 sentences for a student."
        try:
            explanation = await _ollama(MODEL_FAST, prompt, timeout=20)
            return {
                "explanation": explanation.strip(),
                "relatedTopics": ["Structure", "Function", "Applications"],
            }
        except Exception as e:
            return {"explanation": f"Unable to connect to AI: {e}", "relatedTopics": []}


ollama_service = OllamaAIService()
