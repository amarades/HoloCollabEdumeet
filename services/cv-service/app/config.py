from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    environment: str = "development"
    cors_origins: Optional[str] = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()


def get_cors_origins() -> List[str]:
    raw = settings.cors_origins or "http://localhost:5173"
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
