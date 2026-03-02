from fastapi import HTTPException, status
from app.db.database import db


class PermissionService:

    @staticmethod
    async def require_host(session_id: str, user: dict) -> None:
        """Raise 403 if the user is not the host of the session."""
        session = await db.get_session(session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        if session.host_id != user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the session host can perform this action")

    @staticmethod
    def is_instructor(user: dict) -> bool:
        return user.get("role") in ("instructor", "host", "admin")

    @staticmethod
    def require_instructor(user: dict) -> None:
        if not PermissionService.is_instructor(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor role required")
