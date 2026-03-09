from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class AIRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class QuizRequest(BaseModel):
    model_name: str
    difficulty: str = "medium"
    question_count: int = 5

class ExplainRequest(BaseModel):
    concept: str
    context: Optional[Dict[str, Any]] = None

class LectureNotesRequest(BaseModel):
    topic: str
    model_name: str
    transcript: Optional[str] = ""

class TopicRequest(BaseModel):
    transcript: str

class DoubtsRequest(BaseModel):
    messages: List[str]
