from pydantic import BaseModel
from typing import Optional, Dict, Any

class AIRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class QuizRequest(BaseModel):
    model_name: str
    difficulty: str
    question_count: int

class ExplainRequest(BaseModel):
    concept: str
    context: Optional[Dict[str, Any]] = None

class LectureNotesRequest(BaseModel):
    topic: str
    model_name: str
