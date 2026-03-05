from typing import Dict, Any, Optional, List
import uuid
import time


class SceneStateStore:
    """
    In-memory store for collaborative 3D scene state per room.
    Tracks a list of scene objects (position, rotation, scale, color, lock).
    Also supports legacy single-model transform state for backward compatibility.
    """

    def __init__(self):
        # Multi-object scene: room_code -> {id -> object_dict}
        self._objects: Dict[str, Dict[str, Dict[str, Any]]] = {}
        # Legacy single-transform state
        self._legacy: Dict[str, Dict[str, Any]] = {}

    # ─── Multi-object Scene API ────────────────────────────────────────────

    def add_object(self, room_code: str, obj_type: str, position: List[float],
                   color: str = "#6366f1", extra: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create a new scene object and return it."""
        obj = {
            "id": f"obj_{uuid.uuid4().hex[:8]}",
            "type": obj_type,          # 'box' | 'sphere' | 'cylinder' | 'model'
            "position": position,       # [x, y, z]
            "rotation": [0.0, 0.0, 0.0],
            "scale": [1.0, 1.0, 1.0],
            "color": color,
            "lockedBy": None,
            "timestamp": int(time.time()),
            **(extra or {}),
        }
        self._objects.setdefault(room_code, {})[obj["id"]] = obj
        return obj

    def update_object(self, room_code: str, obj_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Apply a partial transform update to an existing object."""
        obj = self._objects.get(room_code, {}).get(obj_id)
        if obj is None:
            return None
        for key in ("position", "rotation", "scale", "color"):
            if key in payload:
                obj[key] = payload[key]
        obj["timestamp"] = int(time.time())
        return obj

    def delete_object(self, room_code: str, obj_id: str) -> bool:
        objects = self._objects.get(room_code, {})
        if obj_id in objects:
            del objects[obj_id]
            return True
        return False

    def lock_object(self, room_code: str, obj_id: str, user_id: str) -> bool:
        obj = self._objects.get(room_code, {}).get(obj_id)
        if obj is None:
            return False
        if obj["lockedBy"] is not None and obj["lockedBy"] != user_id:
            return False  # Already locked by someone else
        obj["lockedBy"] = user_id
        return True

    def unlock_object(self, room_code: str, obj_id: str, user_id: str):
        obj = self._objects.get(room_code, {}).get(obj_id)
        if obj and obj.get("lockedBy") == user_id:
            obj["lockedBy"] = None

    def unlock_all_by_user(self, room_code: str, user_id: str):
        """Release all locks held by a disconnected user."""
        for obj in self._objects.get(room_code, {}).values():
            if obj.get("lockedBy") == user_id:
                obj["lockedBy"] = None

    def get_scene(self, room_code: str) -> List[Dict[str, Any]]:
        return list(self._objects.get(room_code, {}).values())

    def clear_room(self, room_code: str):
        self._objects.pop(room_code, None)
        self._legacy.pop(room_code, None)

    # ─── Legacy single-transform API (backward compat) ────────────────────

    def update(self, room_code: str, payload: Dict[str, Any]):
        self._legacy.setdefault(room_code, {}).update(payload)

    def get(self, room_code: str) -> Optional[Dict[str, Any]]:
        return self._legacy.get(room_code)

    def clear(self, room_code: str):
        self._legacy.pop(room_code, None)


# Alias for backward compatibility with code that imported ModelStateStore
ModelStateStore = SceneStateStore
