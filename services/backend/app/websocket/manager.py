from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    """Tracks active WebSocket connections per session room."""

    def __init__(self):
        # room_code -> list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        self.active_connections.setdefault(room_code, []).append(websocket)

    def disconnect(self, websocket: WebSocket, room_code: str):
        room = self.active_connections.get(room_code, [])
        if websocket in room:
            room.remove(websocket)
        if not room:
            self.active_connections.pop(room_code, None)

    async def broadcast(self, message: dict, room_code: str, exclude: WebSocket = None):
        """Send a message to all connections in a room."""
        for connection in self.active_connections.get(room_code, []):
            if connection != exclude:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass  # stale connection — will be cleaned up on next disconnect

    async def send_personal(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    def room_size(self, room_code: str) -> int:
        return len(self.active_connections.get(room_code, []))


manager = ConnectionManager()
