from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """AI Service Settings"""
    
    # AI Service Configuration
    ai_service: str = "mock"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()
