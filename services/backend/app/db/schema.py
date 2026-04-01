from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Text, CheckConstraint
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

    __table_args__ = (
        CheckConstraint(role.in_(['student', 'teacher', 'instructor', 'admin']), name='check_user_role'),
    )


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
    is_curated = Column(Boolean, default=False)


class DBAttendanceLog(Base):
    __tablename__ = "attendance"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    user_name = Column(String, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)


class DBTranscript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("DBSession")


class DBAINote(Base):
    __tablename__ = "ai_notes"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    summary = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("DBSession")


class DBMessage(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("DBSession")
    user = relationship("DBUser")


class DBVoiceRecording(Base):
    __tablename__ = "voice_recordings"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    file_path = Column(String, nullable=False)
    duration_seconds = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("DBSession")
