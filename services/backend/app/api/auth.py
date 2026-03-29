from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict
import logging

from fastapi import APIRouter, HTTPException, status, Depends, Request, Query, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr, Field

from app.db.database import db
from app.core import security
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

ALLOWED_SELF_REGISTER_ROLES = {"student", "instructor"}


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    role: Optional[str] = "student"


class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    role: str


class CurrentUser(BaseModel):
    id: str
    email: str
    name: str
    role: str


class WebSocketTicketResponse(BaseModel):
    ws_ticket: str
    expires_in_seconds: int


class VerifyWebSocketTicketRequest(BaseModel):
    ws_ticket: str
    room_code: str = Field(min_length=4, max_length=64)


def _decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None

    email = payload.get("sub")
    return email if isinstance(email, str) else None


@router.post("/register", response_model=Token)
async def register(user: UserRegister):
    """Register a new user."""
    try:
        role = (user.role or "student").lower()
        if role not in ALLOWED_SELF_REGISTER_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

        existing = await db.get_user(user.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        hashed_password = security.get_password_hash(user.password)
        user_data = {
            "email": user.email,
            "hashed_password": hashed_password,
            "name": user.name,
            "role": role,
            "created_at": datetime.utcnow(),
        }
        await db.save_user(user_data)

        saved_user = await db.get_user(user.email)
        access_token = security.create_access_token(
            subject=user.email,
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            extra_claims={
                "uid": saved_user["id"] if saved_user else None,
                "role": role,
                "name": user.name,
            },
        )
        return {"access_token": access_token, "token_type": "bearer", "user_name": user.name, "role": role}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /register")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Registration failed: {type(exc).__name__} - {str(exc)}"
        ) from exc


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and return JWT token (OAuth2 form-urlencoded)."""
    try:
        user = await db.get_user(form_data.username)  # username field holds email
        if not user or not security.verify_password(form_data.password, user.get("hashed_password", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = security.create_access_token(
            subject=user["email"],
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            extra_claims={"uid": user["id"], "role": user.get("role", "student"), "name": user.get("name", "")},
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_name": user["name"],
            "role": user.get("role", "student"),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Login failed: {type(exc).__name__} - {str(exc)}"
        ) from exc


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user_token(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    email = _decode_token(token)
    if not email:
        raise credentials_exception

    user = await db.get_user(email)
    if user is None:
        raise credentials_exception
    return user


async def get_optional_current_user(request: Request) -> Optional[dict]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    email = _decode_token(token)
    if not email:
        return None

    return await db.get_user(email)


@router.get("/me", response_model=CurrentUser)
async def get_current_user_info(user: dict = Depends(get_current_user_token)):
    """Return current authenticated user's info."""
    return CurrentUser(id=user["id"], email=user["email"], name=user["name"], role=user.get("role", "student"))


@router.get("/profile")
async def get_user_profile(user: dict = Depends(get_current_user_token)):
    """Return current authenticated user's detailed performance profile."""
    # 1. Fetch data
    sessions = await db.get_user_sessions(user["id"])
    logs = await db.get_user_attendance_logs(user["id"], user["name"])

    # 2. Aggregate Stats
    total_sessions = len(sessions)
    total_seconds = 0
    session_metrics = {} # session_id -> duration_sec

    for log in logs:
        joined = log["joined_at"]
        left = log["left_at"] or datetime.now(timezone.utc)
        
        # Normalize/Ensure TZ awareness
        if joined.tzinfo is None:
            joined = joined.replace(tzinfo=timezone.utc)
        if left.tzinfo is None:
            left = left.replace(tzinfo=timezone.utc)

        duration = (left - joined).total_seconds()
        total_seconds += max(0, duration)
        
        sid = log["session_id"]
        session_metrics[sid] = session_metrics.get(sid, 0) + duration

    total_minutes = round(total_seconds / 60, 1) if total_seconds > 0 else 0
    
    # 3. Calculate Individual Session Performance
    history = []
    topics_engagement = {} # topic -> total_duration
    
    for s in sessions:
        user_duration_sec = session_metrics.get(s.id, 0)
        user_duration_min = round(user_duration_sec / 60, 1)
        
        # Simplified focus score based on expected session length (fallback to 60 min if active/unknown)
        score = min(100, round((user_duration_min / 60) * 100)) if user_duration_min > 0 else 0
        
        history.append({
            "session_id": s.id,
            "name": s.name,
            "topic": s.topic or "General",
            "date": s.created_at.isoformat(),
            "duration": user_duration_min,
            "score": score
        })
        
        topic = s.topic or "General"
        topics_engagement[topic] = topics_engagement.get(topic, 0) + user_duration_sec

    avg_score = round(sum(h["score"] for h in history) / len(history), 1) if history else 0
    
    # 4. Final Response
    return {
        "user_id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "student"),
        "analytics": {
            "total_sessions": total_sessions,
            "total_learning_minutes": total_minutes,
            "average_focus_score": avg_score,
            "recent_trend": [h["score"] for h in history[-10:]], # Last 10 sessions
            "topics_engagement": [
                {"topic": t, "minutes": round(secs / 60, 1)} for t, secs in topics_engagement.items()
            ]
        },
        "history": sorted(history, key=lambda x: x["date"], reverse=True)
    }


@router.post("/ws-ticket", response_model=WebSocketTicketResponse)
async def create_ws_ticket(
    room_code: str = Query(..., min_length=4, max_length=64),
    user: dict = Depends(get_current_user_token),
):
    """Issue a short-lived websocket ticket to avoid passing long JWTs in URL query."""
    expires_in_seconds = 60
    access_token = security.create_access_token(
        subject=user["email"],
        expires_delta=timedelta(seconds=expires_in_seconds),
        extra_claims={
            "uid": user["id"],
            "role": user.get("role", "student"),
            "name": user.get("name", ""),
            "typ": "ws_ticket",
            "room_code": room_code.strip().upper(),
        },
    )
    return WebSocketTicketResponse(ws_ticket=access_token, expires_in_seconds=expires_in_seconds)


@router.post("/ws-ticket/verify")
async def verify_ws_ticket(
    payload: VerifyWebSocketTicketRequest,
    x_internal_api_key: Optional[str] = Header(default=None, alias="x-internal-api-key"),
):
    """Internal endpoint for realtime service to validate websocket tickets."""
    if x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized internal request")

    email = _decode_token(payload.ws_ticket)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid websocket ticket")

    try:
        decoded = jwt.decode(payload.ws_ticket, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid websocket ticket") from exc

    if decoded.get("typ") != "ws_ticket":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid websocket ticket type")

    expected_room = payload.room_code.strip().upper()
    if decoded.get("room_code") != expected_room:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Websocket ticket room mismatch")

    user = await db.get_user(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return CurrentUser(id=user["id"], email=user["email"], name=user["name"], role=user.get("role", "student"))
