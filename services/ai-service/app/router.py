from fastapi import APIRouter, HTTPException
from app.models import AIRequest, QuizRequest, ExplainRequest, LectureNotesRequest
from app.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat")
async def chat(request: AIRequest):
    """
    Chat with AI assistant.
    Checks for 'roomCode' in context to fetch real-time room state.
    """
    try:
        # Context is passed directly from client
        response = await ai_service.chat(request.message, request.context)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


@router.post("/quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generate a quiz based on the current model
    
    - **model_name**: Name of the 3D model
    - **difficulty**: Quiz difficulty (easy, medium, hard)
    - **question_count**: Number of questions to generate
    """
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
    """
    Get explanation for a concept
    
    - **concept**: The concept to explain
    - **context**: Optional context (current model info)
    """
    try:
        explanation = await ai_service.explain(request.concept, request.context)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation error: {str(e)}")


@router.post("/lecture-notes")
async def generate_lecture_notes(request: LectureNotesRequest):
    """
    Generate lecture notes for a session
    
    - **topic**: The session topic
    - **model_name**: The name of the 3D model
    """
    try:
        notes = await ai_service.generate_lecture_notes(
            request.topic,
            request.model_name
        )
        return notes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lecture notes generation error: {str(e)}")

