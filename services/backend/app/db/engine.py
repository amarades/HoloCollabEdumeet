from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.schema import Base
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
)

async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def init_db():
    """Create all tables on startup (development only unless explicitly enabled)."""
    if not settings.auto_create_tables:
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure any newly added columns (e.g., is_curated) are present in existing DBs
        await conn.execute(
            text(
                """
                ALTER TABLE models
                ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT false
                """
            )
        )
