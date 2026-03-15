from datetime import datetime, timedelta
from typing import Optional
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed.") from exc


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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed.") from exc


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
