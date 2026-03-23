from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class User(BaseModel):
    id: str
    email: str
    name: str
    role: str = "student"
    hashed_password: Optional[str] = None


class Session(BaseModel):
    id: str
    room_code: str
    name: str
    topic: Optional[str] = None
    meet_link: Optional[str] = None
    host_id: str
    model_id: Optional[str] = None
    created_at: datetime
    is_active: bool = True
    participants: List[User] = Field(default_factory=list)


class ModelMetadata(BaseModel):
    id: str
    name: str
    category: str
    thumbnail: str = "📦"
    url: str
    description: str = "Custom uploaded model"
    is_curated: bool = False


class Transcript(BaseModel):
    id: str
    session_id: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AINote(BaseModel):
    id: str
    session_id: str
    summary: Optional[str] = None
    action_items: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Message(BaseModel):
    id: str
    session_id: str
    user_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

