import logging

from fastapi import APIRouter, HTTPException

from app.models import AIRequest, QuizRequest, ExplainRequest, LectureNotesRequest, TopicRequest, DoubtsRequest
from app.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/chat")
async def chat(request: AIRequest):
    """Chat with AI assistant."""
    try:
        response = await ai_service.chat(request.message, request.context)
        return response
    except Exception:
        logger.exception("AI chat failed")
        raise HTTPException(status_code=500, detail="AI chat error")


@router.post("/quiz")
async def generate_quiz(request: QuizRequest):
    """Generate a quiz based on the current model."""
    try:
        quiz = await ai_service.generate_quiz(
            request.model_name,
            request.difficulty,
            request.question_count,
        )
        return quiz
    except Exception:
        logger.exception("Quiz generation failed")
        raise HTTPException(status_code=500, detail="Quiz generation error")


@router.post("/explain")
async def explain_concept(request: ExplainRequest):
    """Get explanation for a concept."""
    try:
        explanation = await ai_service.explain(request.concept, request.context)
        return explanation
    except Exception:
        logger.exception("Concept explanation failed")
        raise HTTPException(status_code=500, detail="Explanation error")


@router.post("/lecture-notes")
async def generate_lecture_notes(request: LectureNotesRequest):
    """Generate lecture notes for a session."""
    try:
        notes = await ai_service.generate_lecture_notes(
            request.topic,
            request.model_name,
            request.transcript or "",
        )
        return notes
    except Exception:
        logger.exception("Lecture notes generation failed")
        raise HTTPException(status_code=500, detail="Lecture notes generation error")


@router.post("/generate-notes")
async def generate_notes_from_speech(body: dict):
    """Generate structured lecture notes from transcript/topic with graceful fallback."""
    topic = body.get("topic", "").strip()
    transcript = body.get("transcript", "").strip()

    if not topic and not transcript:
        raise HTTPException(status_code=400, detail="Provide 'topic' or 'transcript'")

    subject = topic or transcript[:100]
    try:
        notes = await ai_service.generate_lecture_notes(
            topic=subject,
            model_name="",
            transcript=transcript,
        )
        if "important_terms" not in notes:
            notes["important_terms"] = [w for w in subject.split() if len(w) > 4][:6]
        return notes
    except Exception as exc:
        logger.warning("generate-notes fallback used: %s", exc)
        return {
            "summary": f"Session about {subject}.",
            "key_points": [f"Introduction to {subject}", "Core concepts", "Practical applications"],
            "important_terms": [w for w in subject.split() if len(w) > 4][:6],
            "follow_up_questions": [
                f"What are the key principles of {subject}?",
                f"How is {subject} applied?",
            ],
            "error": "ai_fallback",
        }


@router.post("/topic-detect")
async def detect_topic(request: TopicRequest):
    """Extract educational topic from a speech transcript using Ollama llama3.2."""
    try:
        result = await ai_service.detect_topic(request.transcript)
        return result
    except Exception:
        logger.exception("Topic detection failed")
        raise HTTPException(status_code=500, detail="Topic detection error")


@router.post("/detect-doubts")
async def detect_doubts(request: DoubtsRequest):
    """Analyze chat messages and identify confusion topics."""
    try:
        result = await ai_service.detect_doubts(request.messages)
        return result
    except Exception:
        logger.exception("Doubt detection failed")
        raise HTTPException(status_code=500, detail="Doubt detection error")
