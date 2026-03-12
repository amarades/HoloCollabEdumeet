from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

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

    # Database — should be set in .env
    database_url: str = "postgresql+asyncpg://holo_user:holopassword@localhost:5432/holocollab"

    # Session — should be set in .env
    session_secret: str = "ac4b123d51ebdc28e7"
    session_timeout: int = 3600

    # JWT Auth — should be set in .env
    secret_key: str = "24c8b2a8d132a22cc37aebd3d9d30c5e7ae2a32c2d2e1329a997ec22c262c5eb"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    cors_origin: str = "http://localhost:5173"

    # Features
    enable_recording: bool = True
    enable_analytics: bool = True
    enable_ai_assistant: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Validation warnings
if settings.ai_service == "openai" and not settings.openai_api_key:
    print("⚠️  Warning: OpenAI API key not set.")
if settings.ai_service == "gemini" and not settings.gemini_api_key:
    print("⚠️  Warning: Gemini API key not set.")
if settings.ai_service == "deepseek" and not settings.deepseek_api_key:
    print("⚠️  Warning: DeepSeek API key not set.")

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(os.path.join(settings.upload_dir, "models"), exist_ok=True)
