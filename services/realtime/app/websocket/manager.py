from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.room_manager import RoomManager
from app.state.model_state import SceneStateStore

router = APIRouter()
room_manager = RoomManager()
scene_state = SceneStateStore()


@router.websocket("/ws/room/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, user: str = "Guest", is_host: bool = False):
    """
    WebSocket endpoint for a room.
    Query params:
      - user: display name of the connecting user
      - is_host: boolean indicating if the user is the host
    """
    user_id = str(id(websocket))

    # Connect and immediately broadcast USER_UPDATE to all room members
    await room_manager.connect(websocket, room_code, user_name=user, is_host=is_host)

    try:
        # ... (keep existing state sync logic) ...
        legacy_state = scene_state.get(room_code)
        if legacy_state:
            await websocket.send_json({"event": "STATE_SYNC", "state": legacy_state})

        objects = scene_state.get_scene(room_code)
        await websocket.send_json({
            "event": "SCENE_STATE",
            "objects": objects,
        })

        # ── Main message loop ──────────────────────────────────────────────
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")
            payload = data.get("payload", {})

            # ── Server-Side Host Validation ──────────────────────────────
            if msg_type.startswith("HOST_"):
                if not room_manager.is_host(room_code, websocket):
                    print(f"⚠️ Unauthorized host action attempt: {msg_type} from {user}")
                    continue

            # ── Legacy single-model transform (AR model sync) ─────────────
            if msg_type == "MODEL_TRANSFORM":
                # Update authoritative single-model state for this room
                scene_state.update(room_code, payload)
                state = scene_state.get(room_code) or {}
                # Broadcast as MODEL_UPDATE so existing clients can apply it
                await room_manager.broadcast(
                    {"event": "MODEL_UPDATE", "state": state},
                    room_code,
                    exclude=websocket,
                )

            # ── Multi-object: Add object ───────────────────────────────────
            elif msg_type == "OBJECT_ADD":
                obj = scene_state.add_object(
                    room_code,
                    obj_type=payload.get("type", "box"),
                    position=payload.get("position", [0.0, 0.0, 0.0]),
                    color=payload.get("color", "#6366f1"),
                    extra={k: v for k, v in payload.items()
                           if k not in ("type", "position", "color")},
                )
                await room_manager.broadcast(
                    {"event": "OBJECT_ADDED", "object": obj},
                    room_code,
                    # Notify sender too so they get the server-assigned id
                )

            # ── Multi-object: Transform (delta update) ─────────────────────
            elif msg_type == "OBJECT_TRANSFORM":
                obj_id = payload.get("id")
                updated = scene_state.update_object(room_code, obj_id, payload)
                if updated:
                    await room_manager.broadcast(
                        {"event": "OBJECT_UPDATED", "object": updated},
                        room_code,
                        exclude=websocket,
                    )

            # ── Multi-object: Delete ───────────────────────────────────────
            elif msg_type == "OBJECT_DELETE":
                obj_id = payload.get("id")
                deleted = scene_state.delete_object(room_code, obj_id)
                if deleted:
                    await room_manager.broadcast(
                        {"event": "OBJECT_DELETED", "id": obj_id},
                        room_code,
                        exclude=websocket,
                    )

            # ── Multi-object: Lock ─────────────────────────────────────────
            elif msg_type == "OBJECT_LOCK":
                obj_id = payload.get("id")
                success = scene_state.lock_object(room_code, obj_id, user_id)
                if success:
                    obj = scene_state.get_scene(room_code)
                    locked_obj = next((o for o in obj if o["id"] == obj_id), None)
                    await room_manager.broadcast(
                        {"event": "OBJECT_LOCKED", "id": obj_id, "lockedBy": user_id, "userName": user},
                        room_code,
                    )

            # ── Multi-object: Unlock ───────────────────────────────────────
            elif msg_type == "OBJECT_UNLOCK":
                obj_id = payload.get("id")
                scene_state.unlock_object(room_code, obj_id, user_id)
                await room_manager.broadcast(
                    {"event": "OBJECT_UNLOCKED", "id": obj_id},
                    room_code,
                    exclude=websocket,
                )

            # ── Cursor position in 3D space ────────────────────────────────
            elif msg_type == "CURSOR_MOVE":
                await room_manager.broadcast(
                    {
                        "event": "CURSOR_UPDATE",
                        "userId": user_id,
                        "userName": user,
                        "position": payload.get("position", [0, 0, 0]),
                    },
                    room_code,
                    exclude=websocket,
                )

            # ── Gesture detection broadcast ────────────────────────────────
            elif msg_type == "GESTURE_DETECTED":
                await room_manager.broadcast(data, room_code, exclude=websocket)

            # ── WebRTC signaling ───────────────────────────────────────────
            elif msg_type == "WEBRTC_SIGNAL":
                target = data.get("target")
                await room_manager.send_to_peer(data, room_code, target)

            # ── Whiteboard drawing ─────────────────────────────────────────
            elif msg_type in ("DRAW_STROKE", "WHITEBOARD_CLEAR"):
                await room_manager.broadcast(data, room_code, exclude=websocket)

            # ── Chat messages ──────────────────────────────────────────────
            elif msg_type == "CHAT_SEND":
                await room_manager.broadcast(
                    {"event": "CHAT_MESSAGE", "message": payload},
                    room_code,
                )

            # ── Host controls ──────────────────────────────────────────────
            elif msg_type == "HOST_MUTE_ALL":
                await room_manager.broadcast(
                    {"event": "HOST_MUTE_ALL", "by": payload.get("by", user)},
                    room_code,
                )

            elif msg_type == "HOST_MUTE":
                await room_manager.broadcast(
                    {"event": "HOST_MUTE", "targetId": payload.get("targetId"),
                     "targetName": payload.get("targetName"), "by": user},
                    room_code,
                )

            elif msg_type == "HOST_REMOVE":
                await room_manager.broadcast(
                    {"event": "HOST_REMOVE", "targetId": payload.get("targetId"),
                     "targetName": payload.get("targetName"), "by": user},
                    room_code,
                )

            elif msg_type == "HOST_PROMOTE":
                await room_manager.broadcast(
                    {"event": "HOST_PROMOTE", "targetId": payload.get("targetId"),
                     "targetName": payload.get("targetName")},
                    room_code,
                )

            # ── Raise hand ─────────────────────────────────────────────────
            elif msg_type in ("HAND_RAISE", "HAND_LOWER"):
                await room_manager.broadcast(
                    {"event": msg_type, "userId": user_id, "userName": user},
                    room_code,
                    exclude=websocket,
                )

            # ── Emoji reactions ────────────────────────────────────────────
            elif msg_type == "SEND_REACTION":
                await room_manager.broadcast(
                    {"event": "REACTION", "emoji": payload.get("emoji", "👍"),
                     "userId": user_id, "userName": user},
                    room_code,
                    exclude=websocket,
                )

            # ── Screen share ───────────────────────────────────────────────
            elif msg_type in ("SCREEN_SHARE_START", "SCREEN_SHARE_STOP"):
                await room_manager.broadcast(
                    {"event": msg_type, "userId": user_id, "userName": user},
                    room_code,
                    exclude=websocket,
                )

            else:
                # Unknown message type — broadcast as-is
                await room_manager.broadcast(data, room_code, exclude=websocket)

    except WebSocketDisconnect:
        # Release all locks held by this user
        scene_state.unlock_all_by_user(room_code, user_id)

        room_manager.disconnect(websocket, room_code)

        # Notify remaining participants of the updated user list
        await room_manager.broadcast_user_update(room_code)

        await room_manager.broadcast(
            {"event": "PEER_LEFT", "payload": {"room_code": room_code, "user": user}},
            room_code,
        )
