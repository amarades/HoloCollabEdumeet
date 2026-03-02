from typing import List, Dict


class GestureFingerClassifier:
    """
    Determines which fingers are extended using MediaPipe hand landmark indices.

    Landmark indices (per MediaPipe hand model):
      Thumb:  1-4   | Index: 5-8 | Middle: 9-12
      Ring:  13-16  | Pinky: 17-20
    Tip indices: [4, 8, 12, 16, 20]
    MCP indices: [2, 5, 9, 13, 17]  (used as baseline)
    """

    FINGER_TIPS = [4, 8, 12, 16, 20]
    FINGER_MCPS = [2, 5, 9, 13, 17]

    def get_extended_fingers(self, landmarks: List[Dict]) -> List[bool]:
        """Return [thumb, index, middle, ring, pinky] extension booleans."""
        extended = []

        # Thumb: compare x instead of y (thumb moves sideways)
        thumb_tip = landmarks[self.FINGER_TIPS[0]]
        thumb_mcp = landmarks[self.FINGER_MCPS[0]]
        extended.append(abs(thumb_tip["x"] - thumb_mcp["x"]) > 0.05)

        # Other four fingers: tip y < mcp y means extended (y increases downward)
        for i in range(1, 5):
            tip = landmarks[self.FINGER_TIPS[i]]
            mcp = landmarks[self.FINGER_MCPS[i]]
            extended.append(tip["y"] < mcp["y"])

        return extended
