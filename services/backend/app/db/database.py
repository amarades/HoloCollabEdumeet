from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, delete, desc
from sqlalchemy.orm import selectinload
from app.db.models import (
    Session as PydanticSession, 
    User as PydanticUser, 
    ModelMetadata as PydanticModelMetadata,
    Transcript as PydanticTranscript,
    AINote as PydanticAINote,
    Message as PydanticMessage
)
from app.db.schema import (
    DBSession, 
    DBUser, 
    DBModelMetadata, 
    DBTranscript, 
    DBAINote, 
    DBMessage
)
from app.db.engine import async_session_maker
import uuid


def _map_user(p: DBUser) -> PydanticUser:
    return PydanticUser(
        id=p.id,
        email=p.email,
        name=p.name,
        role=p.role,
        hashed_password=p.hashed_password,
    )


def _map_session(db_session: DBSession) -> PydanticSession:
    return PydanticSession(
        id=db_session.id,
        room_code=db_session.room_code,
        name=db_session.name,
        topic=db_session.topic,
        meet_link=db_session.meet_link,
        host_id=db_session.host_id,
        model_id=db_session.model_id,
        created_at=db_session.created_at,
        is_active=db_session.is_active,
        participants=[_map_user(p) for p in db_session.participants],
    )


def _map_model(db_model: DBModelMetadata) -> PydanticModelMetadata:
    return PydanticModelMetadata(
        id=db_model.id,
        name=db_model.name,
        category=db_model.category,
        thumbnail=db_model.thumbnail,
        url=db_model.url,
        description=db_model.description,
        is_curated=db_model.is_curated,
    )


def _map_transcript(db_obj: DBTranscript) -> PydanticTranscript:
    return PydanticTranscript(
        id=db_obj.id,
        session_id=db_obj.session_id,
        text=db_obj.text,
        created_at=db_obj.created_at,
    )


def _map_ai_note(db_obj: DBAINote) -> PydanticAINote:
    return PydanticAINote(
        id=db_obj.id,
        session_id=db_obj.session_id,
        summary=db_obj.summary,
        action_items=db_obj.action_items,
        created_at=db_obj.created_at,
    )


def _map_message(db_obj: DBMessage) -> PydanticMessage:
    return PydanticMessage(
        id=db_obj.id,
        session_id=db_obj.session_id,
        user_id=db_obj.user_id,
        message=db_obj.message,
        created_at=db_obj.created_at,
    )


class PersistenceLayer:
    """PostgreSQL-backed persistence layer using SQLAlchemy async."""

    # ── Sessions ──────────────────────────────────────────────────────────────

    async def get_session(self, session_id: str) -> Optional[PydanticSession]:
        async with async_session_maker() as db:
            stmt = (
                select(DBSession)
                .where(DBSession.id == session_id)
                .options(selectinload(DBSession.participants))
            )
            result = await db.execute(stmt)
            obj = result.scalar_one_or_none()
            return _map_session(obj) if obj else None

    async def get_session_by_code(self, room_code: str) -> Optional[PydanticSession]:
        async with async_session_maker() as db:
            stmt = (
                select(DBSession)
                .where(DBSession.room_code == room_code)
                .options(selectinload(DBSession.participants))
            )
            result = await db.execute(stmt)
            obj = result.scalar_one_or_none()
            return _map_session(obj) if obj else None

    async def list_sessions(self) -> List[PydanticSession]:
        async with async_session_maker() as db:
            stmt = select(DBSession).options(selectinload(DBSession.participants))
            result = await db.execute(stmt)
            return [_map_session(s) for s in result.scalars().all()]

    async def save_session(self, session: PydanticSession):
        async with async_session_maker() as db:
            # Ensure all participants exist in the users table first
            for p in session.participants:
                existing = await db.execute(select(DBUser).where(DBUser.id == p.id))
                existing_user = existing.scalar_one_or_none()
                if not existing_user:
                    # Ensure unique email — guests get a unique email based on their ID
                    email = p.email if p.email else f"{p.id}@guest.local"
                    new_user = DBUser(
                        id=p.id,
                        email=email,
                        name=p.name,
                        role=p.role,
                        hashed_password=p.hashed_password,
                    )
                    db.add(new_user)

            # Flush so participants exist before session FK references them
            await db.flush()

            # Load or create the DB session row
            stmt = (
                select(DBSession)
                .where(DBSession.id == session.id)
                .options(selectinload(DBSession.participants))
            )
            result = await db.execute(stmt)
            db_session = result.scalar_one_or_none()

            # Fetch DB user objects for the participants list
            participant_ids = [p.id for p in session.participants]
            db_participants: List[DBUser] = []
            if participant_ids:
                p_result = await db.execute(select(DBUser).where(DBUser.id.in_(participant_ids)))
                db_participants = list(p_result.scalars().all())

            if not db_session:
                db_session = DBSession(
                    id=session.id,
                    room_code=session.room_code,
                    name=session.name,
                    topic=session.topic,
                    meet_link=session.meet_link,
                    host_id=session.host_id,
                    model_id=session.model_id,
                    created_at=session.created_at,
                    is_active=session.is_active,
                )
                db.add(db_session)
            else:
                db_session.room_code = session.room_code
                db_session.name = session.name
                db_session.topic = session.topic
                db_session.meet_link = session.meet_link
                db_session.host_id = session.host_id
                db_session.model_id = session.model_id
                db_session.is_active = session.is_active

            db_session.participants = db_participants
            await db.commit()

    async def delete_session(self, session_id: str):
        async with async_session_maker() as db:
            await db.execute(delete(DBSession).where(DBSession.id == session_id))
            await db.commit()

    # ── Attendance ────────────────────────────────────────────────────────────

    async def log_attendance(self, session_id: str, user_name: str, action: str):
        """Log a join or leave event."""
        async with async_session_maker() as db:
            from app.db.schema import DBAttendanceLog
            import uuid
            
            if action == "join":
                log = DBAttendanceLog(
                    id=uuid.uuid4().hex,
                    session_id=session_id,
                    user_name=user_name,
                    joined_at=datetime.utcnow(),
                )
                db.add(log)
            else:
                # Find last join for this user that hasn't left
                stmt = (
                    select(DBAttendanceLog)
                    .where(DBAttendanceLog.session_id == session_id)
                    .where(DBAttendanceLog.user_name == user_name)
                    .where(DBAttendanceLog.left_at == None)
                    .order_by(DBAttendanceLog.joined_at.desc())
                )
                result = await db.execute(stmt)
                log = result.scalars().first()
                if log:
                    log.left_at = datetime.utcnow()
            
            await db.commit()

    async def list_attendance(self, session_id: str) -> List[dict]:
        """Return all attendance records for a session."""
        async with async_session_maker() as db:
            from app.db.schema import DBAttendanceLog
            stmt = select(DBAttendanceLog).where(DBAttendanceLog.session_id == session_id)
            result = await db.execute(stmt)
            return [
                {
                    "user_name": r.user_name,
                    "joined_at": r.joined_at,
                    "left_at": r.left_at
                } for r in result.scalars().all()
            ]

    # ── Transcripts ───────────────────────────────────────────────────────────

    async def save_transcript(self, transcript: PydanticTranscript):
        async with async_session_maker() as db:
            db_obj = DBTranscript(
                id=transcript.id,
                session_id=transcript.session_id,
                text=transcript.text,
                created_at=transcript.created_at,
            )
            db.add(db_obj)
            await db.commit()

    async def get_transcripts(self, session_id: str) -> List[PydanticTranscript]:
        async with async_session_maker() as db:
            stmt = select(DBTranscript).where(DBTranscript.session_id == session_id).order_by(DBTranscript.created_at)
            result = await db.execute(stmt)
            return [_map_transcript(t) for t in result.scalars().all()]

    # ── AI Notes ──────────────────────────────────────────────────────────────

    async def save_ai_note(self, note: PydanticAINote):
        async with async_session_maker() as db:
            db_obj = DBAINote(
                id=note.id,
                session_id=note.session_id,
                summary=note.summary,
                action_items=note.action_items,
                created_at=note.created_at,
            )
            db.add(db_obj)
            await db.commit()

    async def get_ai_notes(self, session_id: str) -> List[PydanticAINote]:
        async with async_session_maker() as db:
            stmt = select(DBAINote).where(DBAINote.session_id == session_id).order_by(desc(DBAINote.created_at))
            result = await db.execute(stmt)
            return [_map_ai_note(n) for n in result.scalars().all()]

    # ── Messages ──────────────────────────────────────────────────────────────

    async def save_message(self, message: PydanticMessage):
        async with async_session_maker() as db:
            db_obj = DBMessage(
                id=message.id,
                session_id=message.session_id,
                user_id=message.user_id,
                message=message.message,
                created_at=message.created_at,
            )
            db.add(db_obj)
            await db.commit()

    async def get_messages(self, session_id: str) -> List[PydanticMessage]:
        async with async_session_maker() as db:
            stmt = select(DBMessage).where(DBMessage.session_id == session_id).order_by(DBMessage.created_at)
            result = await db.execute(stmt)
            return [_map_message(m) for m in result.scalars().all()]

    # ── Users ─────────────────────────────────────────────────────────────────

    async def get_user(self, email: str) -> Optional[dict]:
        async with async_session_maker() as db:
            result = await db.execute(select(DBUser).where(DBUser.email == email))
            obj = result.scalar_one_or_none()
            if obj:
                return {
                    "id": obj.id,
                    "email": obj.email,
                    "name": obj.name,
                    "role": obj.role,
                    "hashed_password": obj.hashed_password,  # used only for auth verification
                }
        return None

    async def save_user(self, user_data: dict):
        async with async_session_maker() as db:
            result = await db.execute(select(DBUser).where(DBUser.email == user_data["email"]))
            obj = result.scalar_one_or_none()
            if not obj:
                obj = DBUser(
                    id=user_data.get("id") or str(uuid.uuid4()),
                    email=user_data["email"],
                    name=user_data.get("name", ""),
                    role=user_data.get("role", "student"),
                    hashed_password=user_data.get("hashed_password"),
                )
                db.add(obj)
            else:
                obj.name = user_data.get("name", obj.name)
                obj.role = user_data.get("role", obj.role)
                if "hashed_password" in user_data:
                    obj.hashed_password = user_data["hashed_password"]
            await db.commit()

    # ── Models ────────────────────────────────────────────────────────────────

    async def list_models(self) -> List[PydanticModelMetadata]:
        async with async_session_maker() as db:
            result = await db.execute(select(DBModelMetadata))
            return [_map_model(m) for m in result.scalars().all()]

    async def save_model(self, model: PydanticModelMetadata):
        async with async_session_maker() as db:
            # Check by ID first
            result = await db.execute(select(DBModelMetadata).where(DBModelMetadata.id == model.id))
            obj = result.scalar_one_or_none()
            
            if not obj:
                # Check for duplicate by name AND URL (to avoid re-adding same model)
                stmt = select(DBModelMetadata).where(
                    (DBModelMetadata.name == model.name) & (DBModelMetadata.url == model.url)
                )
                dup = await db.execute(stmt)
                obj = dup.scalar_one_or_none()
                
            if not obj:
                obj = DBModelMetadata(
                    id=model.id,
                    name=model.name,
                    category=model.category,
                    thumbnail=model.thumbnail,
                    url=model.url,
                    description=model.description,
                    is_curated=model.is_curated,
                )
                db.add(obj)
            else:
                obj.name = model.name
                obj.category = model.category
                obj.thumbnail = model.thumbnail
                obj.url = model.url
                obj.description = model.description
                obj.is_curated = model.is_curated
            await db.commit()


db = PersistenceLayer()
