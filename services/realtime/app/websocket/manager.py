import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import httpx

from app.config import settings
from app.websocket.room_manager import RoomManager
from app.state.model_state import SceneStateStore

logger = logging.getLogger(__name__)

HOST_ONLY_MSG_TYPES = {
    "HOST_MUTE_ALL",
    "HOST_MUTE",
    "HOST_REMOVE",
    "HOST_PROMOTE",
    "APPROVE_PARTICIPANT",
    "REJECT_PARTICIPANT",
    "GRANT_PERMISSION",
    "REVOKE_PERMISSION",
}


def build_router(max_room_size: int = 12) -> APIRouter:
    router = APIRouter()
    room_manager = RoomManager(max_room_size=max_room_size, redis_url=settings.redis_url)
    scene_state = SceneStateStore(
        redis_url=settings.redis_url,
        state_ttl_seconds=settings.scene_state_ttl_seconds,
    )

    async def _resolve_user(token: Optional[str], ws_ticket: Optional[str], room_code: str):
        if ws_ticket:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    response = await client.post(
                        f"{settings.backend_base_url}/api/auth/ws-ticket/verify",
                        json={"ws_ticket": ws_ticket, "room_code": room_code},
                        headers={"x-internal-api-key": settings.internal_api_key},
                    )
                    if response.status_code == 200:
                        return response.json()
            except Exception as exc:
                logger.warning("Failed to verify websocket ticket: %s", exc)
        if not token:
            return None
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(
                    f"{settings.backend_base_url}/api/auth/me",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as exc:
            logger.warning("Failed to resolve websocket user from backend auth: %s", exc)
        return None

    async def _resolve_is_host(room_code: str, user: dict | None) -> bool:
        if not user:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{settings.backend_base_url}/api/sessions/validate/{room_code}")
                if response.status_code != 200:
                    return False
                payload = response.json()
                return payload.get("host_id") == user.get("id")
        except Exception as exc:
            logger.warning("Failed to resolve host status for room %s: %s", room_code, exc)
            return False

    async def _resolve_guest_host(room_code: str, host_token: Optional[str]) -> Optional[dict]:
        if not host_token:
            return None
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.post(
                    f"{settings.backend_base_url}/api/sessions/verify-host-token",
                    json={"room_code": room_code, "host_token": host_token},
                    headers={"x-internal-api-key": settings.internal_api_key},
                )
                if response.status_code == 200:
                    data = response.json()
                    return {"id": data.get("host_id"), "name": data.get("host_name", "Host")}
                else:
                    logger.warning("verify-host-token failed (%s) for room %s: %s", response.status_code, room_code, response.text)
        except Exception as exc:
            logger.warning("Failed to resolve guest host token for room %s: %s", room_code, exc)
        return None

    async def _log_attendance(room_code: str, user_name: str, action: str):
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(
                    f"{settings.backend_base_url}/api/sessions/{room_code}/attendance/log",
                    json={"user_name": user_name, "action": action},
                    headers={"x-internal-api-key": settings.internal_api_key},
                )
        except Exception as exc:
            logger.warning("Attendance log failed (%s) for room %s user %s: %s", action, room_code, user_name, exc)

    @router.websocket("/ws/room/{room_code_input}")
    async def websocket_endpoint(websocket: WebSocket, room_code_input: str, user: str = "Guest", is_host: bool = False):
        """WebSocket endpoint for a room."""
        token = websocket.query_params.get("token")
        ws_ticket = websocket.query_params.get("ws_ticket")
        host_token = websocket.query_params.get("host_token")
        
        # 1. Resolve Identity and Canonical Room UUID
        authenticated_user = await _resolve_user(token, ws_ticket, room_code_input)
        guest_host_user = None
        session_id = None
        is_verified_host = False
        
        # Call backend to validate room and get canonical ID
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.backend_base_url}/api/sessions/validate/{room_code_input}")
                if resp.status_code == 200:
                    payload = resp.json()
                    session_id = payload.get("session_id")
                    if authenticated_user and payload.get("host_id") == authenticated_user.get("id"):
                        is_verified_host = True
        except Exception as exc:
            logger.warning("Session validation failed for %s: %s", room_code_input, exc)

        if is_host and not authenticated_user and host_token:
             # Resolve guest host
             guest_host_data = await _resolve_guest_host(room_code_input, host_token)
             if guest_host_data:
                 guest_host_user = guest_host_data
                 is_verified_host = True
                 # If we didn't get session_id yet, guest host verification might have it
                 # (Though validate_session should have worked if the room exists)

        # Fallback: if we couldn't resolve session_id yet, the room might be invalid
        if not session_id:
            logger.error(f"[WS] Could not resolve canonical session ID for room_code={room_code_input}")
            await websocket.close(code=1008, reason="Invalid session")
            return
            
        real_room_id = session_id # Use the UUID internally from here on
        logger.info(f"[WS] room_input={room_code_input} canonical_id={real_room_id} user={user} is_host={is_verified_host}")
        
        if is_host and not is_verified_host:
            logger.warning("Rejected host spoof attempt for room %s by user '%s'", real_room_id, user)

        display_name = (
            (authenticated_user or {}).get("name")
            or (guest_host_user or {}).get("name")
            or user
            or "Guest"
        )

        try:
            user_id = await room_manager.connect(
                websocket,
                real_room_id,
                user_name=display_name,
                is_host=is_verified_host,
            )
        except ValueError:
            await websocket.close(code=1008, reason="Room is full")
            return

        await _log_attendance(real_room_id, display_name, "join")

        try:
            legacy_state = await scene_state.get(real_room_id)
            if legacy_state:
                await websocket.send_json({"event": "STATE_SYNC", "state": legacy_state})

            objects = await scene_state.get_scene(real_room_id)
            await websocket.send_json({"event": "SCENE_STATE", "objects": objects})

            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "")
                payload = data.get("payload", {})

                if msg_type == "PONG":
                    continue

                if msg_type in HOST_ONLY_MSG_TYPES and not room_manager.is_host(real_room_id, websocket):
                    await websocket.send_json({"event": "ERROR", "code": "FORBIDDEN", "message": "Host privilege required"})
                    continue

                if msg_type == "MODEL_TRANSFORM":
                    await scene_state.update(real_room_id, payload)
                    state = await scene_state.get(real_room_id) or {}
                    await room_manager.broadcast(
                        {"event": "MODEL_UPDATE", "state": state},
                        real_room_id,
                        exclude=websocket,
                    )

                elif msg_type == "OBJECT_ADD":
                    obj = await scene_state.add_object(
                        real_room_id,
                        obj_type=payload.get("type", "box"),
                        position=payload.get("position", [0.0, 0.0, 0.0]),
                        color=payload.get("color", "#6366f1"),
                        extra={k: v for k, v in payload.items() if k not in ("type", "position", "color")},
                    )
                    await room_manager.broadcast({"event": "OBJECT_ADDED", "object": obj}, real_room_id)

                elif msg_type == "OBJECT_TRANSFORM":
                    obj_id = payload.get("id")
                    updated = await scene_state.update_object(real_room_id, obj_id, payload)
                    if updated:
                        await room_manager.broadcast(
                            {"event": "OBJECT_UPDATED", "object": updated},
                            real_room_id,
                            exclude=websocket,
                        )

                elif msg_type == "OBJECT_DELETE":
                    obj_id = payload.get("id")
                    deleted = await scene_state.delete_object(real_room_id, obj_id)
                    if deleted:
                        await room_manager.broadcast(
                            {"event": "OBJECT_DELETED", "id": obj_id},
                            real_room_id,
                            exclude=websocket,
                        )

                elif msg_type == "OBJECT_LOCK":
                    obj_id = payload.get("id")
                    success = await scene_state.lock_object(real_room_id, obj_id, user_id)
                    if success:
                        await room_manager.broadcast(
                            {"event": "OBJECT_LOCKED", "id": obj_id, "lockedBy": user_id, "userName": display_name},
                            real_room_id,
                        )

                elif msg_type == "OBJECT_UNLOCK":
                    obj_id = payload.get("id")
                    await scene_state.unlock_object(real_room_id, obj_id, user_id)
                    await room_manager.broadcast(
                        {"event": "OBJECT_UNLOCKED", "id": obj_id},
                        real_room_id,
                        exclude=websocket,
                    )

                elif msg_type == "CURSOR_MOVE":
                    await room_manager.broadcast(
                        {
                            "event": "CURSOR_UPDATE",
                            "userId": user_id,
                            "userName": display_name,
                            "position": payload.get("position", [0, 0, 0]),
                        },
                        real_room_id,
                        exclude=websocket,
                    )

                elif msg_type == "GESTURE_DETECTED":
                    await room_manager.broadcast(data, real_room_id, exclude=websocket)

                elif msg_type in {"WEBRTC_SIGNAL", "WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE"}:
                    target = data.get("target") or payload.get("target") or payload.get("userId")
                    if target:
                        forwarded = {
                            **data,
                            "sender": user_id,
                            "payload": {**payload, "sender": user_id, "target": target},
                        }
                        await room_manager.send_to_peer(forwarded, real_room_id, target)

                elif msg_type in ("DRAW_STROKE", "WHITEBOARD_CLEAR"):
                    await room_manager.broadcast(data, real_room_id, exclude=websocket)

                elif msg_type == "CHAT_SEND":
                    score = room_manager.update_engagement(real_room_id, user_id, "chat_msg")
                    await room_manager.send_to_host({"event": "ENGAGEMENT_UPDATE", "userId": user_id, "score": score}, real_room_id)
                    await room_manager.broadcast({"event": "CHAT_MESSAGE", "message": payload}, real_room_id)

                elif msg_type == "ENGAGEMENT_SIGNAL":
                    signal = payload.get("type")
                    if signal:
                        score = room_manager.update_engagement(real_room_id, user_id, signal)
                        await room_manager.send_to_host(
                            {"event": "ENGAGEMENT_UPDATE", "userId": user_id, "score": score},
                            real_room_id,
                        )

                elif msg_type == "TOPIC_DETECTED":
                    await room_manager.broadcast(
                        {"event": "TOPIC_DETECTED", "topic": payload.get("topic")},
                        real_room_id,
                        exclude=websocket,
                    )

                elif msg_type == "QUIZ_ACTION":
                    if payload.get("sub_action") == "VOTE":
                        score = room_manager.update_engagement(real_room_id, user_id, "quiz_answer")
                        await room_manager.send_to_host(
                            {"event": "ENGAGEMENT_UPDATE", "userId": user_id, "score": score},
                            real_room_id,
                        )
                    await room_manager.broadcast(data, real_room_id, exclude=websocket)

                elif msg_type == "HOST_MUTE_ALL":
                    await room_manager.broadcast({"event": "HOST_MUTE_ALL", "by": payload.get("by", display_name)}, real_room_id)

                elif msg_type == "HOST_MUTE":
                    await room_manager.broadcast(
                        {
                            "event": "HOST_MUTE",
                            "targetId": payload.get("targetId"),
                            "targetName": payload.get("targetName"),
                            "by": display_name,
                        },
                        real_room_id,
                    )

                elif msg_type == "HOST_REMOVE":
                    await room_manager.broadcast(
                        {
                            "event": "HOST_REMOVE",
                            "targetId": payload.get("targetId"),
                            "targetName": payload.get("targetName"),
                            "by": display_name,
                        },
                        real_room_id,
                    )

                elif msg_type == "HOST_PROMOTE":
                    await room_manager.broadcast(
                        {
                            "event": "HOST_PROMOTE",
                            "targetId": payload.get("targetId"),
                            "targetName": payload.get("targetName"),
                        },
                        real_room_id,
                    )

                elif msg_type in ("HAND_RAISE", "HAND_LOWER"):
                    await room_manager.broadcast(
                        {"event": msg_type, "userId": user_id, "userName": display_name},
                        real_room_id,
                        exclude=websocket,
                    )

                elif msg_type == "SEND_REACTION":
                    await room_manager.broadcast(
                        {
                            "event": "REACTION",
                            "emoji": payload.get("emoji", "thumbs_up"),
                            "userId": user_id,
                            "userName": display_name,
                        },
                        real_room_id,
                        exclude=websocket,
                    )

                elif msg_type == "PARTICIPANT_JOIN_REQUEST":
                    logger.info(f"[WS] JOIN_REQUEST for room {real_room_id} from {display_name} ({user_id})")
                    await room_manager.send_to_host(
                        {
                            "event": "PARTICIPANT_JOIN_REQUEST",
                            "userId": user_id,
                            "userName": display_name,
                            "requestedAt": payload.get("requestedAt"),
                        },
                        real_room_id,
                    )

                elif msg_type == "APPROVE_PARTICIPANT":
                    target_id = payload.get("userId")
                    await room_manager.send_to_peer(
                        {
                            "event": "JOIN_APPROVED",
                            "userId": target_id,
                            "permissions": payload.get("permissions"),
                        },
                        real_room_id,
                        target_id,
                    )

                elif msg_type == "REJECT_PARTICIPANT":
                    target_id = payload.get("userId")
                    await room_manager.send_to_peer(
                        {
                            "event": "JOIN_REJECTED",
                            "userId": target_id,
                            "reason": payload.get("reason"),
                        },
                        real_room_id,
                        target_id,
                    )

                elif msg_type == "PERMISSION_REQUEST":
                    await room_manager.send_to_host(
                        {
                            "event": "PERMISSION_REQUEST",
                            "userId": user_id,
                            "permission": payload.get("permission"),
                        },
                        real_room_id,
                    )

                elif msg_type == "GRANT_PERMISSION":
                    target_id = payload.get("userId")
                    await room_manager.send_to_peer(
                        {
                            "event": "PERMISSION_GRANTED",
                            "userId": target_id,
                            "permissions": payload.get("permissions"),
                        },
                        real_room_id,
                        target_id,
                    )

                elif msg_type == "REVOKE_PERMISSION":
                    target_id = payload.get("userId")
                    await room_manager.send_to_peer(
                        {
                            "event": "PERMISSION_REVOKED",
                            "userId": target_id,
                            "permissions": payload.get("permissions"),
                        },
                        real_room_id,
                        target_id,
                    )

                elif msg_type in ("SCREEN_SHARE_START", "SCREEN_SHARE_STOP"):
                    await room_manager.broadcast(
                        {"event": msg_type, "userId": user_id, "userName": display_name},
                        real_room_id,
                        exclude=websocket,
                    )

                else:
                    await room_manager.broadcast(data, real_room_id, exclude=websocket)

        except WebSocketDisconnect:
            await scene_state.unlock_all_by_user(real_room_id, user_id)

            disconnected_user = await room_manager.disconnect(websocket, real_room_id)
            await room_manager.broadcast_user_update(real_room_id)
            await _log_attendance(real_room_id, display_name, "leave")

            await room_manager.broadcast(
                {
                    "event": "PEER_LEFT",
                    "payload": {"room_code": room_code_input, "user": display_name},
                    "userId": disconnected_user["id"] if disconnected_user else user_id,
                },
                real_room_id,
            )

            if disconnected_user:
                await room_manager.broadcast({"event": "USER_LEFT", "userId": disconnected_user["id"]}, real_room_id)

            if room_manager.room_size(real_room_id) == 0:
                await scene_state.clear_room(real_room_id)

    return router
