from fastapi import WebSocket
from typing import Dict, List, Optional


class RoomManager:
    """Tracks WebSocket connections and users grouped by room code."""

    # Feature 4: Score weights per engagement signal type
    ENGAGEMENT_WEIGHTS = {
        'mic_active': 15,
        'chat_msg': 20,
        'quiz_answer': 25,
        'tab_back': 5,
    }

    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        # Maps room_code -> list of {"id": str, "name": str}
        self.room_users: Dict[str, List[dict]] = {}
        # Maps room_code -> host_user_id
        self.room_hosts: Dict[str, str] = {}
        # Maps websocket -> (room_code, user_name)
        self._ws_meta: Dict[WebSocket, tuple] = {}
        # Feature 4: Maps room_code -> {user_id: engagement_score}
        self.engagement_scores: Dict[str, Dict[str, int]] = {}

    async def connect(self, websocket: WebSocket, room_code: str, user_name: str = "Guest", is_host: bool = False):
        await websocket.accept()
        user_id = str(id(websocket))
        
        self.rooms.setdefault(room_code, []).append(websocket)
        self.room_users.setdefault(room_code, [])
        self._ws_meta[websocket] = (room_code, user_name)

        if is_host:
            self.room_hosts[room_code] = user_id

        # Add user entry
        user_entry = {"id": user_id, "name": user_name}
        self.room_users[room_code].append(user_entry)

        # Broadcast updated user list to everyone in the room (including the new joiner)
        await self.broadcast_user_update(room_code)

    def disconnect(self, websocket: WebSocket, room_code: str):
        room = self.rooms.get(room_code, [])
        if websocket in room:
            room.remove(websocket)

        # Remove this user from the users list
        ws_id = str(id(websocket))
        users = self.room_users.get(room_code, [])
        self.room_users[room_code] = [u for u in users if u["id"] != ws_id]

        # Clean up meta
        self._ws_meta.pop(websocket, None)

        if not room:
            self.rooms.pop(room_code, None)
            self.room_users.pop(room_code, None)
            self.room_hosts.pop(room_code, None)

    def is_host(self, room_code: str, websocket: WebSocket) -> bool:
        """Check if the given websocket belongs to the host of the room."""
        user_id = str(id(websocket))
        return self.room_hosts.get(room_code) == user_id

    def get_users(self, room_code: str) -> List[dict]:
        return self.room_users.get(room_code, [])

    async def broadcast_user_update(self, room_code: str):
        """Send the current user list to all clients in the room."""
        users = self.get_users(room_code)
        message = {"event": "USER_UPDATE", "users": users}
        for ws in self.rooms.get(room_code, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast(self, message: dict, room_code: str, exclude: Optional[WebSocket] = None):
        for ws in self.rooms.get(room_code, []):
            if ws != exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def send_to_peer(self, message: dict, room_code: str, peer_id: str):
        """Send a message to a specific peer (used for WebRTC signaling)."""
        for ws in self.rooms.get(room_code, []):
            try:
                await ws.send_json(message)
                return
            except Exception:
                pass

    def room_size(self, room_code: str) -> int:
        return len(self.rooms.get(room_code, []))

    # ── Feature 4: Engagement Tracking ──────────────────────────────────────────

    def update_engagement(self, room_code: str, user_id: str, signal_type: str) -> int:
        """Increment engagement score for a user and return the new score."""
        scores = self.engagement_scores.setdefault(room_code, {})
        delta = self.ENGAGEMENT_WEIGHTS.get(signal_type, 0)
        scores[user_id] = min(100, scores.get(user_id, 0) + delta)
        return scores[user_id]

    def get_host_ws(self, room_code: str) -> Optional[WebSocket]:
        """Return the WebSocket of the room host, if present."""
        host_id = self.room_hosts.get(room_code)
        if not host_id:
            return None
        for ws in self.rooms.get(room_code, []):
            if str(id(ws)) == host_id:
                return ws
        return None

    async def send_to_host(self, message: dict, room_code: str):
        """Send a message exclusively to the host WebSocket."""
        host_ws = self.get_host_ws(room_code)
        if host_ws:
            try:
                await host_ws.send_json(message)
            except Exception:
                pass
