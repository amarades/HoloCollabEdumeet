from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError
import traceback

from app.db.database import db
from app.core import security
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ── Pydantic request/response models ──────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "student"


class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    role: str


class CurrentUser(BaseModel):
    email: str
    name: str
    role: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token)
async def register(user: UserRegister):
    """Register a new user."""
    try:
        existing = await db.get_user(user.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        hashed_password = security.get_password_hash(user.password)
        user_data = {
            "email": user.email,
            "hashed_password": hashed_password,
            "name": user.name,
            "role": user.role,
            "created_at": datetime.utcnow(),
        }
        await db.save_user(user_data)

        access_token = security.create_access_token(
            subject=user.email,
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        return {"access_token": access_token, "token_type": "bearer", "user_name": user.name, "role": user.role}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /register: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed.")


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
        )
        return {"access_token": access_token, "token_type": "bearer", "user_name": user["name"], "role": user.get("role", "student")}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /login: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed.")


# ── Auth dependency ───────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user_token(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get_user(email)
    if user is None:
        raise credentials_exception
    return user


@router.get("/me", response_model=CurrentUser)
async def get_current_user_info(user: dict = Depends(get_current_user_token)):
    """Return current authenticated user's info."""
    return CurrentUser(email=user["email"], name=user["name"], role=user.get("role", "student"))
