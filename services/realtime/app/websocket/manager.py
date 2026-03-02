from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.room_manager import RoomManager
from app.state.model_state import ModelStateStore

router = APIRouter()
room_manager = RoomManager()
model_state = ModelStateStore()


@router.websocket("/ws/room/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, user: str = "Guest"):
    """
    WebSocket endpoint for a room.
    Query params:
      - user: display name of the connecting user
    """
    # Connect and immediately broadcast USER_UPDATE to all room members
    await room_manager.connect(websocket, room_code, user_name=user)

    try:
        # Send current model state to newly joined client
        state = model_state.get(room_code)
        if state:
            await websocket.send_json({"event": "STATE_SYNC", "state": state})

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "MODEL_TRANSFORM":
                model_state.update(room_code, data.get("payload", {}))
                await room_manager.broadcast(data, room_code, exclude=websocket)

            elif msg_type == "GESTURE_DETECTED":
                await room_manager.broadcast(data, room_code, exclude=websocket)

            elif msg_type == "WEBRTC_SIGNAL":
                target = data.get("target")
                await room_manager.send_to_peer(data, room_code, target)

            else:
                # Unknown message type — broadcast as-is
                await room_manager.broadcast(data, room_code, exclude=websocket)

    except WebSocketDisconnect:
        room_manager.disconnect(websocket, room_code)

        # Notify remaining participants of the updated user list
        await room_manager.broadcast_user_update(room_code)

        await room_manager.broadcast(
            {"event": "PEER_LEFT", "payload": {"room_code": room_code, "user": user}},
            room_code,
        )
