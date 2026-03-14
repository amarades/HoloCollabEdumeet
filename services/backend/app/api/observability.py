import logging
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict, deque
import time

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("backend.client_errors")

router = APIRouter(prefix="/api/observability", tags=["observability"])
_ERROR_WINDOW_SECONDS = 60
_ERROR_LIMIT_PER_CLIENT = 30
_error_window: dict[str, deque[float]] = defaultdict(deque)


class ClientErrorEvent(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    stack: Optional[str] = Field(default=None, max_length=20000)
    component_stack: Optional[str] = Field(default=None, max_length=20000)
    page_url: Optional[str] = Field(default=None, max_length=2000)
    user_agent: Optional[str] = Field(default=None, max_length=1000)
    session_id: Optional[str] = Field(default=None, max_length=128)
    room_code: Optional[str] = Field(default=None, max_length=32)
    release: Optional[str] = Field(default=None, max_length=128)


def _check_client_error_limit(client_key: str) -> None:
    now = time.time()
    q = _error_window[client_key]
    while q and (now - q[0]) > _ERROR_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= _ERROR_LIMIT_PER_CLIENT:
        raise HTTPException(status_code=429, detail="Too many client error events")
    q.append(now)


def _sanitize_payload(payload: ClientErrorEvent) -> dict:
    data = payload.model_dump()
    redacted = {"token", "authorization", "cookie", "password", "secret", "api_key"}

    def scrub(value):
        if isinstance(value, dict):
            return {k: ("[redacted]" if k.lower() in redacted else scrub(v)) for k, v in value.items()}
        if isinstance(value, list):
            return [scrub(v) for v in value]
        return value

    return scrub(data)


@router.post("/client-error")
async def ingest_client_error(payload: ClientErrorEvent, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_client_error_limit(client_ip)
    logger.error(
        "client_error",
        extra={
            "event": {
                "ts": datetime.now(timezone.utc).isoformat(),
                "request_id": getattr(request.state, "request_id", None),
                "ip": client_ip,
                "payload": _sanitize_payload(payload),
            }
        },
    )
    return {"status": "accepted"}
