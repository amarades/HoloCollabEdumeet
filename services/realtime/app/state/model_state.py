from typing import Dict, Any, Optional


class ModelStateStore:
    """
    In-memory store for current 3D model transform state per room.
    Allows new joiners to receive the current scene state immediately.
    """

    def __init__(self):
        self._state: Dict[str, Dict[str, Any]] = {}

    def update(self, room_code: str, payload: Dict[str, Any]):
        self._state.setdefault(room_code, {}).update(payload)

    def get(self, room_code: str) -> Optional[Dict[str, Any]]:
        return self._state.get(room_code)

    def clear(self, room_code: str):
        self._state.pop(room_code, None)
