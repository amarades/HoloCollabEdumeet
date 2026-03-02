from pydantic import BaseModel
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
    participants: List[User] = []


class ModelMetadata(BaseModel):
    id: str
    name: str
    category: str
    thumbnail: str = "📦"
    url: str
    description: str = "Custom uploaded model"
