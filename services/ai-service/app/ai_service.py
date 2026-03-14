import logging

logger = logging.getLogger(__name__)


def get_ai_service():
    """Factory: return the Ollama AI service."""
    try:
        from app.ollama_service import ollama_service
        return ollama_service
    except Exception as e:
        # If Ollama module is missing or has errors, we fail fast in production
        logger.critical("AI Service initialization failed: %s", e)
        raise


ai_service = get_ai_service()
