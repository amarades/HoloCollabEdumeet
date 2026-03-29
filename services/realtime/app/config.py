from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"
    backend_base_url: str = "http://localhost:8000"
    internal_api_key: str = "change-me-internal-api-key"
    max_room_size: int = 50  # Increased for SFU support
    redis_url: str = ""
    scene_state_ttl_seconds: int = 3600

    # LiveKit SFU Configuration
    livekit_url: str = "ws://localhost:7880"
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"
    webrtc_mode: str = "sfu"  # Options: mesh, sfu

    # TURN Server Configuration
    turn_url: str = ""
    turn_username: str = ""
    turn_password: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

if settings.environment.lower() == "production" and settings.internal_api_key == "change-me-internal-api-key":
    raise RuntimeError("INTERNAL_API_KEY must be configured in production.")


def get_cors_origins() -> List[str]:
    return [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
