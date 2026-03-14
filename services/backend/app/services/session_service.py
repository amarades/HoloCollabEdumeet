import uuid
import random
import string
from datetime import datetime
from typing import Optional

from app.db.database import db
from app.db.models import Session, User


def _generate_room_code() -> str:
    """Generate a short 6-character room code e.g. K7MN4P."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class SessionService:

    @staticmethod
    async def create_session(
        name: str,
        topic: Optional[str],
        meet_link: Optional[str],
        host_user: dict,
        model_id: Optional[str] = None,
    ) -> Session:
        """Create a new session and persist it to PostgreSQL."""
        room_code = None
        for _ in range(5):
            candidate = _generate_room_code()
            if not await db.get_session_by_code(candidate):
                room_code = candidate
                break
        if not room_code:
            raise RuntimeError("Failed to allocate unique room code")

        host = User(
            id=host_user["id"],
            email=host_user["email"],
            name=host_user["name"],
            role=host_user.get("role", "instructor"),
            hashed_password=None,  # never store hash in session participants
        )
        session = Session(
            id=uuid.uuid4().hex,
            room_code=room_code,
            name=name,
            topic=topic,
            meet_link=meet_link,
            host_id=host.id,
            model_id=model_id,
            created_at=datetime.utcnow(),
            is_active=True,
            participants=[host],
        )
        await db.save_session(session)
        return session

    @staticmethod
    async def join_session(room_code: str, user_data: dict) -> Session:
        """Add a participant to an existing active session."""
        session = await db.get_session_by_code(room_code)
        if not session:
            raise ValueError(f"Session with room code '{room_code}' not found.")
        if not session.is_active:
            raise ValueError("This session has ended.")

        existing_ids = {p.id for p in session.participants}
        if user_data["user_id"] not in existing_ids:
            participant = User(
                id=user_data["user_id"],
                email=user_data.get("email", f"{user_data['user_id']}@guest.local"),
                name=user_data["name"],
                role=user_data.get("role", "student"),
                hashed_password=None,
            )
            session.participants.append(participant)
            await db.save_session(session)

        return session

    @staticmethod
    async def delete_session(session_id: str) -> None:
        """Delete a session by ID."""
        await db.delete_session(session_id)
