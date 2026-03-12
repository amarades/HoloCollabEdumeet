from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import Response
from app.services.session_service import SessionService
from app.services.permission_service import PermissionService
from app.api.auth import get_current_user_token
from app.db.database import db
import csv
import io

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


@router.post("/{session_id}/attendance/log")
async def log_attendance(session_id: str, data: dict):
    """Internal endpoint for realtime service to log join/leave."""
    user_name = data.get("user_name")
    action = data.get("action")  # 'join' or 'leave'
    if not user_name or not action:
        raise HTTPException(status_code=400, detail="Missing user_name or action")
    
    await db.log_attendance(session_id, user_name, action)
    return {"status": "success"}


@router.get("/{session_id}/attendance")
async def get_attendance(session_id: str, user: dict = Depends(get_current_user_token)):
    """Retrieve full attendance log. Only accessible by the host."""
    await PermissionService.require_host(session_id, user)
    logs = await db.list_attendance(session_id)
    return {"attendance": logs}


@router.get("/{session_id}/export/csv")
async def export_attendance_csv(session_id: str):
    """Export attendance data as CSV. Accessible by the host."""
    # Note: In a real app, we would use get_current_user_token to verify host
    # but for simplicity in this demo we allow room-code level access
    logs = await db.list_attendance(session_id)
    if not logs:
        raise HTTPException(status_code=404, detail="No attendance data found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Join Time", "Leave Time", "Duration (Min)"])
    
    for log in logs:
        joined = log.get("joined_at")
        left = log.get("left_at")
        
        # Calculate duration
        duration = 0
        if joined and left:
            from datetime import datetime as dt
            if isinstance(joined, str): joined = dt.fromisoformat(joined.replace("Z", "+00:00"))
            if isinstance(left, str): left = dt.fromisoformat(left.replace("Z", "+00:00"))
            duration = round((left - joined).total_seconds() / 60, 1)
        
        writer.writerow([
            log.get("user_name"),
            joined.strftime("%Y-%m-%d %H:%M:%S") if joined else "N/A",
            left.strftime("%Y-%m-%d %H:%M:%S") if left else "Still in Session",
            duration
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{session_id}.csv"}
    )


@router.get("/{session_id}/report")
async def get_session_report(session_id: str):
    """
    Returns a post-session analytics report.
    Combines attendance records with engagement data.
    No auth required so host can access immediately after session ends.
    """
    from datetime import datetime, timezone

    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Attendance data
    logs = await db.list_attendance(session_id)

    # Build per-student stats
    students: dict = {}
    for log in logs:
        name = log.get("user_name", "Unknown")
        if name not in students:
            students[name] = {
                "name": name,
                "join_time": log.get("joined_at"),
                "leave_time": log.get("left_at"),
                "duration_minutes": 0,
                "attention_score": 0,
            }
        # Calculate duration
        joined = log.get("joined_at")
        left = log.get("left_at") or datetime.now(timezone.utc)
        if joined:
            try:
                if hasattr(joined, "total_seconds"):
                    pass
                else:
                    if isinstance(joined, str):
                        from datetime import datetime as dt
                        joined = dt.fromisoformat(joined.replace("Z", "+00:00"))
                    if isinstance(left, str):
                        from datetime import datetime as dt
                        left = dt.fromisoformat(left.replace("Z", "+00:00"))
                    # Make both offset-aware or offset-naive
                    if hasattr(joined, "tzinfo") and joined.tzinfo and not (hasattr(left, "tzinfo") and left.tzinfo):
                        left = left.replace(tzinfo=timezone.utc)
                    elif hasattr(left, "tzinfo") and left.tzinfo and not (hasattr(joined, "tzinfo") and joined.tzinfo):
                        joined = joined.replace(tzinfo=timezone.utc)
                    diff = (left - joined).total_seconds() / 60
                    students[name]["duration_minutes"] = round(max(0, diff), 1)
            except Exception:
                pass

    student_list = list(students.values())

    # Synthetic attention scores based on duration
    total_duration = max(s["duration_minutes"] for s in student_list) if student_list else 1
    for s in student_list:
        if total_duration > 0:
            s["attention_score"] = min(100, round((s["duration_minutes"] / max(total_duration, 1)) * 100))

    # Session summary
    total_students = len(student_list)
    avg_attention = round(sum(s["attention_score"] for s in student_list) / total_students, 1) if student_list else 0
    avg_duration = round(sum(s["duration_minutes"] for s in student_list) / total_students, 1) if student_list else 0

    # Qualitative Rating
    rating = "Fair"
    if avg_attention >= 80: rating = "Excellent"
    elif avg_attention >= 60: rating = "Good"
    elif avg_attention < 40: rating = "Needs Attention"

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
            "summary": f"The session focused on '{session.topic}'.",
            "low_engagement_follow_up": [s["name"] for s in student_list if s["attention_score"] < 50],
            "recommendation": "Try increasing interactivity through more frequent polls during lower engagement segments." if avg_attention < 70 else "Great job maintaining engagement! Keep utilizing 3D models to ground abstract concepts."
        }
    }
