from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """AI Service Settings"""
    
    # AI Service Configuration
    ai_service: str = "mock"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-pro"
    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-chat"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()
