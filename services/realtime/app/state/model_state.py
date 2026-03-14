import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional

try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover - optional dependency/runtime availability
    redis = None

logger = logging.getLogger(__name__)


class SceneStateStore:
    """
    Collaborative 3D scene state store.

    Primary store is in-memory for low latency.
    Optional Redis persistence is used for restart recovery and cross-instance visibility.
    """

    def __init__(self, redis_url: str = "", state_ttl_seconds: int = 3600):
        self._objects: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._legacy: Dict[str, Dict[str, Any]] = {}
        self._redis = None
        self._ttl = max(60, state_ttl_seconds)

        if redis and redis_url.strip():
            try:
                self._redis = redis.from_url(redis_url.strip(), decode_responses=True)
            except Exception:
                logger.exception("Failed to initialize Redis scene state backend; using in-memory fallback.")

    def _objects_key(self, room_code: str) -> str:
        return f"scene:{room_code}:objects"

    def _legacy_key(self, room_code: str) -> str:
        return f"scene:{room_code}:legacy"

    async def _persist_room(self, room_code: str) -> None:
        if not self._redis:
            return
        try:
            objects_json = json.dumps(list(self._objects.get(room_code, {}).values()))
            legacy_json = json.dumps(self._legacy.get(room_code, {}))
            await self._redis.setex(self._objects_key(room_code), self._ttl, objects_json)
            await self._redis.setex(self._legacy_key(room_code), self._ttl, legacy_json)
        except Exception:
            logger.exception("Failed to persist scene state for room %s to Redis.", room_code)

    async def _hydrate_room_if_needed(self, room_code: str) -> None:
        if room_code in self._objects and room_code in self._legacy:
            return
        if not self._redis:
            self._objects.setdefault(room_code, {})
            self._legacy.setdefault(room_code, {})
            return
        try:
            raw_objects = await self._redis.get(self._objects_key(room_code))
            raw_legacy = await self._redis.get(self._legacy_key(room_code))
            if raw_objects:
                parsed = json.loads(raw_objects)
                self._objects[room_code] = {obj["id"]: obj for obj in parsed if isinstance(obj, dict) and "id" in obj}
            else:
                self._objects.setdefault(room_code, {})

            if raw_legacy:
                parsed_legacy = json.loads(raw_legacy)
                self._legacy[room_code] = parsed_legacy if isinstance(parsed_legacy, dict) else {}
            else:
                self._legacy.setdefault(room_code, {})
        except Exception:
            logger.exception("Failed to hydrate scene state for room %s from Redis.", room_code)
            self._objects.setdefault(room_code, {})
            self._legacy.setdefault(room_code, {})

    async def add_object(
        self,
        room_code: str,
        obj_type: str,
        position: List[float],
        color: str = "#6366f1",
        extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        await self._hydrate_room_if_needed(room_code)
        obj = {
            "id": f"obj_{uuid.uuid4().hex[:8]}",
            "type": obj_type,
            "position": position,
            "rotation": [0.0, 0.0, 0.0],
            "scale": [1.0, 1.0, 1.0],
            "color": color,
            "lockedBy": None,
            "timestamp": int(time.time()),
            **(extra or {}),
        }
        self._objects.setdefault(room_code, {})[obj["id"]] = obj
        await self._persist_room(room_code)
        return obj

    async def update_object(self, room_code: str, obj_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        await self._hydrate_room_if_needed(room_code)
        obj = self._objects.get(room_code, {}).get(obj_id)
        if obj is None:
            return None
        for key in ("position", "rotation", "scale", "color"):
            if key in payload:
                obj[key] = payload[key]
        obj["timestamp"] = int(time.time())
        await self._persist_room(room_code)
        return obj

    async def delete_object(self, room_code: str, obj_id: str) -> bool:
        await self._hydrate_room_if_needed(room_code)
        objects = self._objects.get(room_code, {})
        if obj_id in objects:
            del objects[obj_id]
            await self._persist_room(room_code)
            return True
        return False

    async def lock_object(self, room_code: str, obj_id: str, user_id: str) -> bool:
        await self._hydrate_room_if_needed(room_code)
        obj = self._objects.get(room_code, {}).get(obj_id)
        if obj is None:
            return False
        if obj.get("lockedBy") is not None and obj.get("lockedBy") != user_id:
            return False
        obj["lockedBy"] = user_id
        await self._persist_room(room_code)
        return True

    async def unlock_object(self, room_code: str, obj_id: str, user_id: str) -> None:
        await self._hydrate_room_if_needed(room_code)
        obj = self._objects.get(room_code, {}).get(obj_id)
        if obj and obj.get("lockedBy") == user_id:
            obj["lockedBy"] = None
            await self._persist_room(room_code)

    async def unlock_all_by_user(self, room_code: str, user_id: str) -> None:
        await self._hydrate_room_if_needed(room_code)
        changed = False
        for obj in self._objects.get(room_code, {}).values():
            if obj.get("lockedBy") == user_id:
                obj["lockedBy"] = None
                changed = True
        if changed:
            await self._persist_room(room_code)

    async def get_scene(self, room_code: str) -> List[Dict[str, Any]]:
        await self._hydrate_room_if_needed(room_code)
        return list(self._objects.get(room_code, {}).values())

    async def clear_room(self, room_code: str) -> None:
        self._objects.pop(room_code, None)
        self._legacy.pop(room_code, None)
        if self._redis:
            try:
                await self._redis.delete(self._objects_key(room_code), self._legacy_key(room_code))
            except Exception:
                logger.exception("Failed to clear Redis scene state for room %s.", room_code)

    async def update(self, room_code: str, payload: Dict[str, Any]) -> None:
        await self._hydrate_room_if_needed(room_code)
        self._legacy.setdefault(room_code, {}).update(payload)
        await self._persist_room(room_code)

    async def get(self, room_code: str) -> Optional[Dict[str, Any]]:
        await self._hydrate_room_if_needed(room_code)
        return self._legacy.get(room_code)

    async def clear(self, room_code: str) -> None:
        await self._hydrate_room_if_needed(room_code)
        self._legacy.pop(room_code, None)
        await self._persist_room(room_code)


ModelStateStore = SceneStateStore
