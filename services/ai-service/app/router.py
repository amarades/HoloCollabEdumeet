from fastapi import APIRouter, HTTPException
from app.models import AIRequest, QuizRequest, ExplainRequest, LectureNotesRequest, TopicRequest, DoubtsRequest
from app.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat")
async def chat(request: AIRequest):
    """Chat with AI assistant."""
    try:
        response = await ai_service.chat(request.message, request.context)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


@router.post("/quiz")
async def generate_quiz(request: QuizRequest):
    """Generate a quiz based on the current model."""
    try:
        quiz = await ai_service.generate_quiz(
            request.model_name,
            request.difficulty,
            request.question_count
        )
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")


@router.post("/explain")
async def explain_concept(request: ExplainRequest):
    """Get explanation for a concept."""
    try:
        explanation = await ai_service.explain(request.concept, request.context)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation error: {str(e)}")


@router.post("/lecture-notes")
async def generate_lecture_notes(request: LectureNotesRequest):
    """Generate lecture notes for a session."""
    try:
        notes = await ai_service.generate_lecture_notes(
            request.topic,
            request.model_name,
            request.transcript or ""
        )
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lecture notes generation error: {str(e)}")


# ── /generate-notes: used by CreateSession speech section ─────────────────────
@router.post("/generate-notes")
async def generate_notes_from_speech(body: dict):
    """
    Generate structured lecture notes from a spoken transcript and/or topic.
    Uses the fast model. Falls back gracefully if Ollama is unavailable.
    """
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
        # Ensure important_terms field exists
        if "important_terms" not in notes:
            notes["important_terms"] = [w for w in subject.split() if len(w) > 4][:6]
        return notes
    except Exception as e:
        # Hard fallback — never fail the user
        return {
            "summary": f"Session about {subject}.",
            "key_points": [f"Introduction to {subject}", "Core concepts", "Practical applications"],
            "important_terms": [w for w in subject.split() if len(w) > 4][:6],
            "follow_up_questions": [f"What are the key principles of {subject}?", f"How is {subject} applied?"],
            "error": str(e),
        }


# ── Feature 2: Voice Topic Detection ──────────────────────────────────────────

@router.post("/topic-detect")
async def detect_topic(request: TopicRequest):
    """Extract educational topic from a speech transcript using Ollama llama3.2."""
    try:
        result = await ai_service.detect_topic(request.transcript)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic detection error: {str(e)}")


# ── Feature 7: Smart Doubt Detection ──────────────────────────────────────────

@router.post("/detect-doubts")
async def detect_doubts(request: DoubtsRequest):
    """Analyze chat messages and identify student confusion topics using Ollama llama3.2."""
    try:
        result = await ai_service.detect_doubts(request.messages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Doubt detection error: {str(e)}")
