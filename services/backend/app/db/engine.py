from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.schema import Base
from app.config import settings

# Ensure the database URL uses the asyncpg driver
# Render and Supabase often provide postgresql://, but SQLAlchemy async requires postgresql+asyncpg://
db_url = settings.database_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
)

async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db():
    """Dependency for getting async database sessions."""
    async with async_session_maker() as session:
        yield session


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
