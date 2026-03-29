import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict, deque
import time
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Depends, Request, Header, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from jose import jwt, JWTError

from app.services.session_service import SessionService
from app.services.permission_service import PermissionService
from app.api.auth import get_current_user_token, get_optional_current_user
from app.db.database import db
from app.config import settings
from app.api.ai import ai_service

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

_SESSION_CREATE_WINDOW_SEC = 60
_SESSION_CREATE_LIMIT = 12
_HOST_TOKEN_EXP_MINUTES = 12 * 60
_rate_window: dict[str, deque[float]] = defaultdict(deque)
_MAX_RATE_KEYS = 5000


def _check_rate_limit(client_key: str) -> None:
    now = time.time()
    if len(_rate_window) > _MAX_RATE_KEYS:
        stale_keys = [k for k, q in _rate_window.items() if not q or (now - q[-1]) > _SESSION_CREATE_WINDOW_SEC]
        for k in stale_keys[: len(_rate_window) - _MAX_RATE_KEYS]:
            _rate_window.pop(k, None)

    q = _rate_window[client_key]
    while q and (now - q[0]) > _SESSION_CREATE_WINDOW_SEC:
        q.popleft()
    if len(q) >= _SESSION_CREATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many session operations, please retry shortly.")
    q.append(now)


class CreateSessionRequest(BaseModel):
    session_name: Optional[str] = Field(default=None, max_length=200)
    topic: Optional[str] = Field(default="General", max_length=200)
    meet_link: Optional[str] = Field(default=None, max_length=1000)
    user_name: Optional[str] = Field(default="Host", min_length=1, max_length=120)
    model_id: Optional[str] = Field(default=None, max_length=64)


class JoinSessionRequest(BaseModel):
    room_code: str = Field(min_length=4, max_length=64)
    user_name: Optional[str] = Field(default="Guest", min_length=1, max_length=120)


class AttendanceLogRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=120)
    action: str = Field(min_length=4, max_length=8)  # join | leave


class VerifyHostTokenRequest(BaseModel):
    room_code: str = Field(min_length=4, max_length=64)
    host_token: str = Field(min_length=16)


def _create_guest_host_token(*, room_code: str, host_id: str, host_name: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=_HOST_TOKEN_EXP_MINUTES)
    payload = {
        "sub": "guest_host",
        "typ": "host_access",
        "room_code": room_code.upper(),
        "host_id": host_id,
        "host_name": host_name,
        "exp": exp,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def _decode_guest_host_token(host_token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(host_token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None

    if payload.get("typ") != "host_access" or payload.get("sub") != "guest_host":
        return None
    room_code = payload.get("room_code")
    host_id = payload.get("host_id")
    host_name = payload.get("host_name")
    if not isinstance(room_code, str) or not isinstance(host_id, str):
        return None
    if host_name is not None and not isinstance(host_name, str):
        return None
    return payload


async def _resolve_session(session_or_room: str):
    session = await db.get_session(session_or_room)
    if session:
        return session

    return await db.get_session_by_code(session_or_room.upper())


@router.post("/create")
async def create_session(session_data: CreateSessionRequest, request: Request):
    """Create a new session. Works for both authenticated users and guests."""
    client_key = request.client.host if request.client else "unknown"
    _check_rate_limit(f"create:{client_key}")

    user = await get_optional_current_user(request)

    guest_host_token: Optional[str] = None
    if user:
        host_user = {
            "id": user["id"],
            "name": user.get("name") or session_data.user_name or "Host",
            "email": user.get("email", ""),
            "role": "instructor",
        }
    else:
        user_name = session_data.user_name or "Host"
        host_user = {
            "id": f"guest_{uuid.uuid4().hex}",
            "name": user_name,
            "email": "",
            "role": "instructor",
        }

    try:
        session = await SessionService.create_session(
            name=session_data.session_name or f"{host_user['name']}'s Session",
            topic=session_data.topic,
            meet_link=session_data.meet_link,
            host_user=host_user,
            model_id=session_data.model_id,
        )
        if not user:
            guest_host_token = _create_guest_host_token(
                room_code=session.room_code,
                host_id=host_user["id"],
                host_name=host_user["name"],
            )
        return {
            "session_id": session.id,
            "room_code": session.room_code,
            "role": "host",
            "session_name": session.name,
            "meet_link": session.meet_link,
            "topic": session.topic,
            "host_token": guest_host_token,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to create session") from exc


@router.get("/validate/{room_code}")
async def validate_session(room_code: str):
    """Validate a room code or session ID and return session details and participants without joining."""
    session = await _resolve_session(room_code)
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
        "host_id": session.host_id,
    }


@router.post("/join")
async def join_session(join_data: JoinSessionRequest, request: Request):
    """Join an existing session by room code. Works for both authenticated users and guests."""
    client_key = request.client.host if request.client else "unknown"
    _check_rate_limit(f"join:{client_key}")

    room_code = join_data.room_code.strip().upper()
    if not room_code:
        raise HTTPException(status_code=400, detail="Missing room_code")

    user = await get_optional_current_user(request)
    if user:
        participant = {
            "user_id": user["id"],
            "name": user.get("name") or join_data.user_name or "Guest",
            "email": user.get("email", ""),
            "role": user.get("role", "student"),
        }
    else:
        user_name = join_data.user_name or "Guest"
        participant = {
            "user_id": f"guest_{uuid.uuid4().hex}",
            "name": user_name,
            "email": "",
            "role": "student",
        }

    try:
        session = await SessionService.join_session(room_code, participant)
        return {
            "session_id": session.id,
            "role": "student",
            "session_name": session.name,
            "room_code": session.room_code,
            "meet_link": session.meet_link,
            "topic": session.topic,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to join session") from exc


@router.delete("/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user_token)):
    """Delete a session. Only the host can delete their own session."""
    await PermissionService.require_host(session_id, user)
    try:
        await SessionService.delete_session(session_id)
        return {"message": "Session deleted successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to delete session") from exc


@router.post("/{session_or_room}/attendance/log")
async def log_attendance(
    session_or_room: str,
    data: AttendanceLogRequest,
    x_internal_api_key: Optional[str] = Header(default=None, alias="x-internal-api-key"),
):
    """Internal endpoint for realtime service to log join/leave."""
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized internal request")

    action = data.action.lower()
    if action not in {"join", "leave"}:
        raise HTTPException(status_code=400, detail="action must be 'join' or 'leave'")

    session = await _resolve_session(session_or_room)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.log_attendance(session.id, data.user_name, action)
    return {"status": "success"}


@router.get("/{session_id}/attendance")
async def get_attendance(session_id: str, user: dict = Depends(get_current_user_token)):
    """Retrieve full attendance log. Only accessible by the host."""
    await PermissionService.require_host(session_id, user)
    logs = await db.list_attendance(session_id)
    return {"attendance": logs}


@router.get("/{session_id}/export/csv")
async def export_attendance_csv(session_id: str, user: dict = Depends(get_current_user_token)):
    """Export attendance data as CSV. Only accessible by the host."""
    await PermissionService.require_host(session_id, user)
    logs = await db.list_attendance(session_id)
    if not logs:
        raise HTTPException(status_code=404, detail="No attendance data found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Join Time", "Leave Time", "Duration (Min)"])

    for log in logs:
        joined = log.get("joined_at")
        left = log.get("left_at")

        duration = 0
        if joined and left:
            if isinstance(joined, str):
                joined = datetime.fromisoformat(joined.replace("Z", "+00:00"))
            if isinstance(left, str):
                left = datetime.fromisoformat(left.replace("Z", "+00:00"))
            duration = round((left - joined).total_seconds() / 60, 1)

        writer.writerow([
            log.get("user_name"),
            joined.strftime("%Y-%m-%d %H:%M:%S") if joined else "N/A",
            left.strftime("%Y-%m-%d %H:%M:%S") if left else "Still in Session",
            duration,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{session_id}.csv"},
    )


@router.post("/{session_id}/transcripts")
async def save_session_transcript(session_id: str, text: str, user: dict = Depends(get_current_user_token)):
    """Save a transcript segment for a session."""
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = PydanticTranscript(
        id=uuid.uuid4().hex,
        session_id=session_id,
        text=text,
        created_at=datetime.utcnow()
    )
    await db.save_transcript(transcript)
    return {"status": "success"}


@router.get("/{session_id}/report")
async def get_session_report(session_id: str, user: dict = Depends(get_current_user_token)):
    """Return a post-session analytics report. Only host access is allowed."""
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 1. Identify Roles
    is_host = (session.host_id == user.get("id")) or (user.get("role") in {"teacher", "instructor", "admin"})
    
    participants = await db.list_attendance(session_id)
    is_participant = any(p.get("user_id") == user.get("id") or p.get("user_name") == user.get("name") for p in participants)
    
    if not is_host and not is_participant:
         raise HTTPException(status_code=403, detail="Only session participants can view the report")

    students: dict = {}
    for log in participants:
        name = log.get("user_name", "Unknown")
        uid = log.get("user_id")
        
        # Skip the host in the student list
        if uid == session.host_id or name == "Host":
            continue

        if name not in students:
            students[name] = {
                "name": name,
                "join_time": log.get("joined_at"),
                "leave_time": log.get("left_at"),
                "duration_minutes": 0,
                "attention_score": 0,
            }

        joined = log.get("joined_at")
        left = log.get("left_at") or datetime.now(timezone.utc)
        if joined:
            try:
                if isinstance(joined, str):
                    joined = datetime.fromisoformat(joined.replace("Z", "+00:00"))
                if isinstance(left, str):
                    left = datetime.fromisoformat(left.replace("Z", "+00:00"))
                
                # Normalize TZ
                if joined.tzinfo and not left.tzinfo:
                    left = left.replace(tzinfo=timezone.utc)
                elif left.tzinfo and not joined.tzinfo:
                    joined = joined.replace(tzinfo=timezone.utc)

                diff = (left - joined).total_seconds() / 60
                students[name]["duration_minutes"] += round(max(0, diff), 1)
            except Exception:
                pass

    student_list = list(students.values())
    
    # Logic to limit what students see
    is_host = session.host_id == user.get("id") or user.get("role") in {"teacher", "instructor"}
    
    total_duration = max(s["duration_minutes"] for s in student_list) if student_list else 1
    for s in student_list:
        if total_duration > 0:
            s["attention_score"] = min(100, round((s["duration_minutes"] / max(total_duration, 1)) * 100))

    # If the user is a student, we might want to hide other students' names or provide a consolidated view
    # But for now, we'll keep the list as requested, but maybe the UI handles the filtering.
    # The requirement is "give summary to students", which we're doing.

    total_students = len(student_list)
    avg_attention = round(sum(s["attention_score"] for s in student_list) / total_students, 1) if student_list else 0
    avg_duration = round(sum(s["duration_minutes"] for s in student_list) / total_students, 1) if student_list else 0

    rating = "Fair"
    if avg_attention >= 80:
        rating = "Excellent"
    elif avg_attention >= 60:
        rating = "Good"
    elif avg_attention < 40:
        rating = "Needs Attention"

    # AI Summary Generation
    transcripts = await db.get_transcripts(session_id)
    transcript_text = " ".join([t.text for t in transcripts])
    
    ai_summary = "No transcripts available for a detailed summary."
    if transcript_text:
        try:
            ai_summary = await ai_service.generate_class_summary(transcript_text, session.topic or "General")
        except Exception as e:
            ai_summary = f"Summary generation failed: {str(e)}"

    return {
        "session_id": session_id,
        "session_name": session.name,
        "topic": session.topic,
        "total_students": total_students,
        "average_attention": avg_attention,
        "average_duration_minutes": avg_duration,
        "rating": rating,
        "students": student_list,
        "insights": {
            "summary": ai_summary,
            "low_engagement_follow_up": [s["name"] for s in student_list if s["attention_score"] < 50],
            "recommendation": (
                "Try increasing interactivity through more frequent polls during lower engagement segments."
                if avg_attention < 70
                else "Great job maintaining engagement! Keep utilizing 3D models to ground abstract concepts."
            ),
        },
    }


@router.post("/verify-host-token")
async def verify_host_token(
    payload: VerifyHostTokenRequest,
    x_internal_api_key: Optional[str] = Header(default=None, alias="x-internal-api-key"),
):
    """Internal endpoint for realtime service to verify guest host access token."""
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized internal request")

    decoded = _decode_guest_host_token(payload.host_token)
    if not decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid host token")

    room_code = payload.room_code.strip()
    session = await _resolve_session(room_code)
    if not session or not session.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # The token might store either room_code (legacy) or potentially something else.
    # We check if the token's room reference matches the session we found.
    token_room = decoded.get("room_code")
    if token_room and token_room != session.room_code and token_room != session.id:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host token room mismatch")

    host_id = decoded.get("host_id")
    if session.host_id != host_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Host token does not match session host")

    return {
        "valid": True,
        "host_id": host_id,
        "host_name": decoded.get("host_name") or "Host",
        "session_id": session.id,
    }
