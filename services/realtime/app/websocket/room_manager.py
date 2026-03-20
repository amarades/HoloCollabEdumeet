import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional, Set

from fastapi import WebSocket

try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover - optional dependency/runtime availability
    redis = None

logger = logging.getLogger(__name__)


class RoomManager:
    """Tracks WebSocket connections and users grouped by room code."""

    ENGAGEMENT_WEIGHTS = {
        "mic_active": 15,
        "chat_msg": 20,
        "quiz_answer": 25,
        "tab_back": 5,
    }

    def __init__(self, max_room_size: int = 12, redis_url: str = ""):
        self.max_room_size = max_room_size
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.room_users: Dict[str, List[dict]] = {}
        self.room_hosts: Dict[str, str] = {}
        self._ws_meta: Dict[WebSocket, tuple] = {}
        self._ws_user_id: Dict[WebSocket, str] = {}
        self._ws_reserved_slot: Dict[WebSocket, bool] = {}
        self._user_ws: Dict[tuple, WebSocket] = {}
        self.engagement_scores: Dict[str, Dict[str, int]] = {}
        self._instance_id = str(uuid.uuid4())
        self._redis = None
        self._pubsub = None
        self._pubsub_task: Optional[asyncio.Task] = None
        self._redis_ready = False

        if redis and redis_url.strip():
            try:
                self._redis = redis.from_url(redis_url.strip(), decode_responses=True)
            except Exception:
                logger.exception("Failed to initialize Redis backplane; realtime cross-instance fanout disabled.")

    def _channel(self, room_code: str) -> str:
        return f"realtime:room:{room_code}"

    def _users_key(self, room_code: str) -> str:
        return f"realtime:room:{room_code}:users"

    def _count_key(self, room_code: str) -> str:
        return f"realtime:room:{room_code}:count"

    async def _ensure_backplane(self):
        if not self._redis or self._redis_ready:
            return
        self._redis_ready = True
        try:
            self._pubsub = self._redis.pubsub()
            await self._pubsub.psubscribe("realtime:room:*")
            self._pubsub_task = asyncio.create_task(self._pubsub_loop())
        except Exception:
            logger.exception("Failed to start Redis pubsub loop; continuing without cross-instance fanout.")
            self._redis_ready = False

    async def _publish(self, room_code: str, message: dict):
        if not self._redis:
            return
        payload = {"origin": self._instance_id, "kind": "broadcast", "room_code": room_code, "message": message}
        try:
            await self._redis.publish(self._channel(room_code), json.dumps(payload))
        except Exception:
            logger.exception("Redis publish failed for room %s", room_code)

    async def _publish_direct(self, room_code: str, peer_id: str, message: dict):
        if not self._redis:
            return
        payload = {
            "origin": self._instance_id,
            "kind": "direct",
            "room_code": room_code,
            "peer_id": peer_id,
            "message": message,
        }
        try:
            await self._redis.publish(self._channel(room_code), json.dumps(payload))
        except Exception:
            logger.exception("Redis publish failed for room %s", room_code)

    async def _pubsub_loop(self):
        if not self._pubsub:
            return
        while True:
            try:
                message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if not message:
                    await asyncio.sleep(0.02)
                    continue

                raw = message.get("data")
                if not isinstance(raw, str):
                    continue
                parsed = json.loads(raw)
                if parsed.get("origin") == self._instance_id:
                    continue

                room_code = parsed.get("room_code")
                event = parsed.get("message")
                if not room_code or not isinstance(event, dict):
                    continue
                if parsed.get("kind") == "direct":
                    peer_id = parsed.get("peer_id")
                    ws = self._user_ws.get((room_code, peer_id))
                    if ws:
                        ok = await self._send_json_safe(ws, event)
                        if not ok:
                            await self.disconnect(ws, room_code)
                    continue
                
                if parsed.get("kind") == "host":
                    host_ws = self.get_host_ws(room_code)
                    if host_ws:
                        ok = await self._send_json_safe(host_ws, event)
                        if not ok:
                            await self.disconnect(host_ws, room_code)
                    continue

                await self._broadcast_local(event, room_code)
            except asyncio.CancelledError:
                return
            except Exception:
                logger.exception("Redis pubsub loop error")
                await asyncio.sleep(0.5)

    async def _sync_users_to_redis(self, room_code: str):
        if not self._redis:
            return
        users = self.room_users.get(room_code, [])
        try:
            await self._redis.setex(self._users_key(room_code), 3600, json.dumps(users))
        except Exception as e:
            logger.error("Failed syncing user roster for room %s: %s", room_code, str(e))

    async def _read_users_from_redis(self, room_code: str) -> Optional[List[dict]]:
        if not self._redis:
            return None
        try:
            raw = await self._redis.get(self._users_key(room_code))
            if not raw:
                return []
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            logger.exception("Failed reading user roster for room %s", room_code)
        return None

    async def connect(
        self,
        websocket: WebSocket,
        room_code: str,
        user_name: str = "Guest",
        is_host: bool = False,
    ) -> str:
        await self._ensure_backplane()
        room = self.rooms.setdefault(room_code, [])

        slot_reserved = False
        if self._redis:
            try:
                count = await self._redis.incr(self._count_key(room_code))
                if count > self.max_room_size:
                    await self._redis.decr(self._count_key(room_code))
                    raise ValueError("Room has reached max participant capacity")
                slot_reserved = True
            except ValueError:
                raise
            except Exception as e:
                logger.error("Redis room capacity check failed for %s: %s. Falling back to local process check.", room_code, str(e))
                if len(room) >= self.max_room_size:
                    raise ValueError("Room has reached max participant capacity")
        elif len(room) >= self.max_room_size:
            raise ValueError("Room has reached max participant capacity")

        try:
            await websocket.accept()
        except Exception:
            if self._redis and slot_reserved:
                try:
                    await self._redis.decr(self._count_key(room_code))
                except Exception:
                    logger.exception("Failed rolling back room capacity slot for room %s", room_code)
            raise
        user_id = f"{self._instance_id[:8]}-{uuid.uuid4().hex[:12]}"

        room.append(websocket)
        self.room_users.setdefault(room_code, [])
        self._ws_meta[websocket] = (room_code, user_name)
        self._ws_user_id[websocket] = user_id
        self._ws_reserved_slot[websocket] = slot_reserved
        self._user_ws[(room_code, user_id)] = websocket

        if is_host:
            self.room_hosts[room_code] = user_id

        user_entry = {"id": user_id, "name": user_name}
        self.room_users[room_code].append(user_entry)

        await self._sync_users_to_redis(room_code)
        await self.broadcast({"event": "USER_JOINED", "user": user_entry}, room_code, exclude=websocket)
        await self.broadcast_user_update(room_code)
        await self._send_json_safe(websocket, {"event": "SELF_ID", "userId": user_id})
        return user_id

    async def disconnect(self, websocket: WebSocket, room_code: str) -> Optional[dict]:
        room = self.rooms.get(room_code, [])
        if websocket in room:
            room.remove(websocket)

        ws_id = self._ws_user_id.pop(websocket, str(id(websocket)))
        users = self.room_users.get(room_code, [])
        disconnected_user = next((u for u in users if u["id"] == ws_id), None)
        self.room_users[room_code] = [u for u in users if u["id"] != ws_id]
        if self.room_hosts.get(room_code) == ws_id:
            remaining = self.room_users.get(room_code, [])
            if remaining:
                self.room_hosts[room_code] = remaining[0]["id"]
            else:
                self.room_hosts.pop(room_code, None)

        self._ws_meta.pop(websocket, None)
        self._user_ws.pop((room_code, ws_id), None)
        reserved_slot = self._ws_reserved_slot.pop(websocket, False)

        if not room:
            self.rooms.pop(room_code, None)
            self.room_users.pop(room_code, None)
            self.room_hosts.pop(room_code, None)
            if self._redis:
                try:
                    await self._redis.delete(self._users_key(room_code))
                except Exception:
                    logger.exception("Failed clearing user roster for room %s", room_code)
        else:
            await self._sync_users_to_redis(room_code)

        if self._redis and reserved_slot:
            try:
                count = await self._redis.decr(self._count_key(room_code))
                if count <= 0:
                    await self._redis.delete(self._count_key(room_code))
            except Exception:
                logger.exception("Failed releasing room capacity slot for room %s", room_code)

        return disconnected_user

    def is_host(self, room_code: str, websocket: WebSocket) -> bool:
        user_id = self._ws_user_id.get(websocket, str(id(websocket)))
        return self.room_hosts.get(room_code) == user_id

    def get_users(self, room_code: str) -> List[dict]:
        return self.room_users.get(room_code, [])

    async def _send_json_safe(self, ws: WebSocket, message: dict) -> bool:
        try:
            await ws.send_json(message)
            return True
        except Exception:
            return False

    async def _send_many(self, recipients: List[WebSocket], message: dict) -> Set[WebSocket]:
        if not recipients:
            return set()

        results = await asyncio.gather(*[self._send_json_safe(ws, message) for ws in recipients], return_exceptions=True)
        dead: Set[WebSocket] = set()
        for i, result in enumerate(results):
            ok = isinstance(result, bool) and result
            if not ok:
                dead.add(recipients[i])
        return dead

    async def _cleanup_dead(self, dead: Set[WebSocket]):
        for ws in dead:
            room_code, _ = self._ws_meta.get(ws, (None, None))
            if room_code:
                await self.disconnect(ws, room_code)

    async def broadcast_user_update(self, room_code: str):
        users = self.get_users(room_code)
        if not users:
            redis_users = await self._read_users_from_redis(room_code)
            if redis_users is not None:
                users = redis_users
        message = {"event": "USER_UPDATE", "users": users}
        recipients = list(self.rooms.get(room_code, []))
        dead = await self._send_many(recipients, message)
        if dead:
            await self._cleanup_dead(dead)
        await self._publish(room_code, message)

    async def _broadcast_local(self, message: dict, room_code: str, exclude: Optional[WebSocket] = None):
        recipients = [ws for ws in self.rooms.get(room_code, []) if ws != exclude]
        dead = await self._send_many(recipients, message)
        if dead:
            await self._cleanup_dead(dead)

    async def broadcast(self, message: dict, room_code: str, exclude: Optional[WebSocket] = None):
        await self._broadcast_local(message, room_code, exclude=exclude)
        await self._publish(room_code, message)

    async def send_to_peer(self, message: dict, room_code: str, peer_id: str):
        ws = self._user_ws.get((room_code, peer_id))
        if ws:
            ok = await self._send_json_safe(ws, message)
            if not ok:
                await self.disconnect(ws, room_code)
            return
        await self._publish_direct(room_code, peer_id, message)

    def room_size(self, room_code: str) -> int:
        return len(self.rooms.get(room_code, []))

    def update_engagement(self, room_code: str, user_id: str, signal_type: str) -> int:
        scores = self.engagement_scores.setdefault(room_code, {})
        delta = self.ENGAGEMENT_WEIGHTS.get(signal_type, 0)
        scores[user_id] = min(100, scores.get(user_id, 0) + delta)
        return scores[user_id]

    def get_host_ws(self, room_code: str) -> Optional[WebSocket]:
        host_id = self.room_hosts.get(room_code)
        logger.info(f"[RoomManager] get_host_ws room={room_code} host_id={host_id}")
        if not host_id:
            return None
        return self._user_ws.get((room_code, host_id))

    async def send_to_host(self, message: dict, room_code: str):
        host_ws = self.get_host_ws(room_code)
        if host_ws:
            ok = await self._send_json_safe(host_ws, message)
            if not ok:
                await self.disconnect(host_ws, room_code)
            return

        # If not local, publish as a targeted host message
        if not self._redis:
            return

        payload = {
            "origin": self._instance_id,
            "kind": "host",
            "room_code": room_code,
            "message": message,
        }
        try:
            await self._redis.publish(self._channel(room_code), json.dumps(payload))
        except Exception:
            logger.exception("Redis publish 'host' failed for room %s", room_code)
