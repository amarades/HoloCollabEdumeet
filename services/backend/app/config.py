from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    environment: str = "development"

    # Server
    port: int = 8000
    host: str = "0.0.0.0"
    reload: bool = True

    # AI Service
    ai_service: str = "mock"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-pro"
    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-chat"

    # Storage
    upload_dir: str = "./uploads"
    max_file_size: int = 52428800  # 50MB

    # Database - should be set in .env
    database_url: str = "postgresql+asyncpg://holo_user:change-me@localhost:5432/holocollab"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    auto_create_tables: bool = True

    # Session - should be set in .env
    session_secret: str = "change-me-session-secret"
    session_timeout: int = 3600

    # JWT Auth - should be set in .env
    secret_key: str = "change-me-jwt-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    cors_origin: str = "http://localhost:5173"
    cors_origins: Optional[str] = None

    # Internal service auth
    internal_api_key: str = "change-me-internal-api-key"

    # Features
    enable_recording: bool = True
    enable_analytics: bool = True
    enable_ai_assistant: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()


def get_cors_origins() -> List[str]:
    raw = settings.cors_origins or settings.cors_origin
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# Validation warnings
if settings.ai_service == "openai" and not settings.openai_api_key:
    print("Warning: OpenAI API key not set.")
if settings.ai_service == "gemini" and not settings.gemini_api_key:
    print("Warning: Gemini API key not set.")
if settings.ai_service == "deepseek" and not settings.deepseek_api_key:
    print("Warning: DeepSeek API key not set.")
if settings.internal_api_key == "change-me-internal-api-key":
    print("Warning: INTERNAL_API_KEY is using a development default.")
if settings.environment.lower() == "production":
    if settings.secret_key == "change-me-jwt-secret":
        raise RuntimeError("SECRET_KEY must be configured in production.")
    if settings.session_secret == "change-me-session-secret":
        raise RuntimeError("SESSION_SECRET must be configured in production.")
    if settings.internal_api_key == "change-me-internal-api-key":
        raise RuntimeError("INTERNAL_API_KEY must be configured in production.")

# Diagnostic: Verify if DATABASE_URL is actually coming from ENV
if "DATABASE_URL" in os.environ:
    val = os.environ["DATABASE_URL"]
    print(f"✅ Configuration: DATABASE_URL is set in environment (Length: {len(val)})")
    if val.startswith("localhost") or "127.0.0.1" in val:
         print("⚠️ WARNING: DATABASE_URL contains 'localhost' or '127.0.0.1' - this will fail on Render!")
else:
    print("⚠️ Configuration: DATABASE_URL NOT found in environment, using default.")
    # List keys that DO exist to help debug
    db_keys = [k for k in os.environ.keys() if "DB" in k.upper() or "POSTGRES" in k.upper()]
    if db_keys:
        print(f"DEBUG: Found these related env keys: {db_keys}")

# Secure directory creation - Render's filesystem is read-only unless a disk is mounted.
# We wrap this to prevent startup crashes when persistent storage isn't attached.
try:
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "models"), exist_ok=True)
except Exception as e:
    print(f"Note: Could not create upload directories ({e}). This is expected on some read-only environments.")
