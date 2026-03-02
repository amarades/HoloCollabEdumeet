from typing import List, Dict
from app.recognition.gesture_classifier import GestureFingerClassifier


class GestureClassifier:
    """Main classifier: maps finger extension state to a named gesture."""

    GESTURE_MAP = {
        (True, True, True, True, True): "open_hand",
        (False, False, False, False, False): "fist",
        (False, True, False, False, False): "point",
        (False, True, True, False, False): "peace",
        (True, False, False, False, True): "rock",
        (True, True, False, False, False): "l_shape",
        (False, False, False, False, True): "pinky",
    }

    def __init__(self):
        self.finger_classifier = GestureFingerClassifier()

    def classify(self, landmarks: List[Dict]) -> Dict:
        """Return gesture label and confidence from hand landmarks."""
        if not landmarks or len(landmarks) < 21:
            return {"gesture": "unknown", "confidence": 0.0}

        extended = self.finger_classifier.get_extended_fingers(landmarks)
        key = tuple(extended)
        gesture = self.GESTURE_MAP.get(key, "unknown")
        confidence = 1.0 if gesture != "unknown" else 0.0

        return {
            "gesture": gesture,
            "confidence": confidence,
            "fingers_extended": extended,
        }
