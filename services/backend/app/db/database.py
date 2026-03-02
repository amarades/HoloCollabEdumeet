from typing import Optional, List
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.db.models import Session as PydanticSession, User as PydanticUser, ModelMetadata as PydanticModelMetadata
from app.db.schema import DBSession, DBUser, DBModelMetadata
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
            result = await db.execute(select(DBModelMetadata).where(DBModelMetadata.id == model.id))
            obj = result.scalar_one_or_none()
            if not obj:
                obj = DBModelMetadata(
                    id=model.id,
                    name=model.name,
                    category=model.category,
                    thumbnail=model.thumbnail,
                    url=model.url,
                    description=model.description,
                )
                db.add(obj)
            else:
                obj.name = model.name
                obj.category = model.category
                obj.thumbnail = model.thumbnail
                obj.url = model.url
                obj.description = model.description
            await db.commit()


db = PersistenceLayer()
