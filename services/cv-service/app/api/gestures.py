from fastapi import APIRouter, HTTPException
import logging
from pydantic import BaseModel
from typing import List
from app.recognition.classifier import GestureClassifier

router = APIRouter(prefix="/api/gestures", tags=["Gestures"])
classifier = GestureClassifier()
logger = logging.getLogger(__name__)


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float


class ClassifyRequest(BaseModel):
    landmarks: List[LandmarkPoint]


@router.post("/classify")
async def classify_gesture(request: ClassifyRequest):
    """Classify hand landmarks into a gesture label."""
    try:
        landmarks = [{"x": p.x, "y": p.y, "z": p.z} for p in request.landmarks]
        result = classifier.classify(landmarks)
        return result
    except Exception:
        logger.exception("Gesture classification failed")
        raise HTTPException(status_code=500, detail="Gesture classification failed")
