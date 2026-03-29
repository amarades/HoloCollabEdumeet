from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal
from google import genai

from app.config import settings
from app.api.auth import get_current_user_token as get_current_user

router = APIRouter()

# ─── Request / Response Models ───────────────────────────────────────────────

SummarizeMode = Literal["summarize", "notes", "key_points"]

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="The transcript or text to process.")
    mode: SummarizeMode = Field(
        "summarize",
        description="Processing mode: 'summarize', 'notes', or 'key_points'.",
    )

class SummarizeResponse(BaseModel):
    result: str
    mode: SummarizeMode

# ─── Prompt Templates ─────────────────────────────────────────────────────────

_PROMPTS: dict[str, str] = {
    "summarize": (
        "Summarize the following transcript concisely. "
        "Capture the main ideas and any important conclusions in 3–5 sentences.\n\n"
        "Transcript:\n{text}"
    ),
    "notes": (
        "Convert the following transcript into well-structured lecture notes. "
        "Use clear headings and bullet points. Preserve key details and examples.\n\n"
        "Transcript:\n{text}"
    ),
    "key_points": (
        "Extract the key points from the following transcript. "
        "Return them as a numbered list. Be concise and specific.\n\n"
        "Transcript:\n{text}"
    ),
}

# ─── Gemini Client ────────────────────────────────────────────────────────────

def _get_gemini_client() -> genai.Client:
    """Return an initialised Gemini client, or raise a 500 if unconfigured."""
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not set.",
        )
    return genai.Client(api_key=settings.gemini_api_key)


async def _call_gemini(text: str, mode: SummarizeMode) -> str:
    """Build the prompt and call the Gemini API."""
    prompt = _PROMPTS[mode].format(text=text)
    model = settings.gemini_model or "gemini-1.5-flash"

    try:
        client = _get_gemini_client()
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
        )
        return response.text
    except HTTPException:
        raise  # Re-raise our own structured errors
    except Exception as exc:
        print(f"Gemini API error in /api/summarize: {exc}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(exc)}")


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=SummarizeResponse, summary="Summarize text with Gemini AI")
async def summarize(
    request: SummarizeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Accepts a text/transcript and a processing mode, then returns an
    AI-generated result using the Gemini API.

    Modes:
    - **summarize**   – Concise summary (3–5 sentences).
    - **notes**       – Structured lecture notes with headings and bullets.
    - **key_points**  – Numbered list of key points.
    """
    result = await _call_gemini(request.text, request.mode)
    return SummarizeResponse(result=result, mode=request.mode)
