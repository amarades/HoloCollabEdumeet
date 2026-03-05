from fastapi import APIRouter, HTTPException, Depends, Request
from app.services.session_service import SessionService
from app.services.permission_service import PermissionService
from app.api.auth import get_current_user_token
from app.db.database import db

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


@router.post("/create")
async def create_session(session_data: dict, request: Request):
    """Create a new session. Works for both authenticated users and guests."""
    # Try to get authenticated user
    user = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from jose import jwt
            import os
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])
            user = payload
        except Exception:
            pass

    # Build host info
    if user:
        host_user = {
            "id": user.get("id", user.get("sub", "guest")),
            "name": user.get("name", session_data.get("user_name", "Host")),
            "email": user.get("email", ""),
            "role": "instructor",
        }
    else:
        user_name = session_data.get("user_name", "Host")
        host_user = {
            "id": f"guest_{user_name.lower().replace(' ', '_')}",
            "name": user_name,
            "email": "",
            "role": "instructor",
        }

    try:
        session = await SessionService.create_session(
            name=session_data.get("session_name", f"{host_user['name']}'s Session"),
            topic=session_data.get("topic", "General"),
            meet_link=session_data.get("meet_link"),
            host_user=host_user,
            model_id=session_data.get("model_id"),
        )
        return {
            "session_id": session.id,
            "room_code": session.room_code,
            "role": "host",
            "session_name": session.name,
            "meet_link": session.meet_link,
            "topic": session.topic,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validate/{room_code}")
async def validate_session(room_code: str):
    """Validate a room code and return session details and participants without joining."""
    session = await db.get_session_by_code(room_code.upper())
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="This session has ended")
        
    participants = [{"id": p.id, "name": p.name, "role": p.role} for p in session.participants]
    
    return {
        "session_id": session.id,
        "session_name": session.name,
        "topic": session.topic,
        "participants": participants,
        "host_id": session.host_id
    }

@router.post("/join")
async def join_session(join_data: dict, request: Request):
    """Join an existing session by room code. Works for both authenticated users and guests."""

    room_code = join_data.get("room_code")
    if not room_code:
        raise HTTPException(status_code=400, detail="Missing room_code")

    # Try to get authenticated user, fall back to guest
    user = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from jose import jwt, JWTError
            import os
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])
            user = payload
        except Exception:
            pass

    # Build participant info
    if user:
        participant = {
            "user_id": user.get("id", user.get("sub", "guest")),
            "name": user.get("name", join_data.get("user_name", "Guest")),
            "email": user.get("email", ""),
            "role": user.get("role", "student"),
        }
    else:
        user_name = join_data.get("user_name", "Guest")
        if not user_name:
            raise HTTPException(status_code=400, detail="Missing user_name")
        participant = {
            "user_id": f"guest_{user_name.lower().replace(' ', '_')}",
            "name": user_name,
            "email": "",
            "role": "student",
        }

    try:
        session = await SessionService.join_session(room_code.upper(), participant)
        return {
            "session_id": session.id,
            "role": "student",
            "session_name": session.name,
            "room_code": session.room_code,
            "meet_link": session.meet_link,
            "topic": session.topic,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user_token)):
    """Delete a session. Only the host can delete their own session."""
    await PermissionService.require_host(session_id, user)
    try:
        await SessionService.delete_session(session_id)
        return {"message": "Session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
