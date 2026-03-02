from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

# Many-to-many: sessions ↔ users
session_participants = Table(
    "session_participants",
    Base.metadata,
    Column("session_id", String, ForeignKey("sessions.id"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), primary_key=True),
)


class DBUser(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="student")
    hashed_password = Column(String, nullable=True)


class DBSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    room_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    meet_link = Column(String, nullable=True)
    host_id = Column(String, ForeignKey("users.id"), nullable=False)
    model_id = Column(String, ForeignKey("models.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True)

    host = relationship("DBUser", foreign_keys=[host_id])
    model = relationship("DBModelMetadata", foreign_keys=[model_id])
    # Note: no lazy="selectin" here — we use explicit selectinload() in queries
    participants = relationship("DBUser", secondary=session_participants, backref="joined_sessions")


class DBModelMetadata(Base):
    __tablename__ = "models"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    thumbnail = Column(String, default="📦")
    url = Column(String, nullable=False)
    description = Column(String, default="Custom uploaded model")
