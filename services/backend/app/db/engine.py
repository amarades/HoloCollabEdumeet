import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.schema import Base
from app.config import settings

# Ensure the database URL uses the asyncpg driver
db_url = settings.database_url

# If the current URL is localhost or default, try to find a better one in env vars
if "localhost" in db_url or "127.0.0.1" in db_url:
    for key in ["DATABASE_URL", "POSTGRES_URL", "DATABASE_PRIVATE_URL", "DB_URL", "SUPABASE_URL", "POSTGRESQL_URL"]:
        env_val = os.environ.get(key)
        if env_val and "localhost" not in env_val:
            print(f"🔄 Auto-switching to database URL from env var: {key}")
            db_url = env_val
            break

# Handle both postgresql:// and postgres:// (common in Supabase/Heroku)
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# Log the database host for diagnostics (safe, doesn't leak credentials)
try:
    from urllib.parse import urlparse
    parsed = urlparse(db_url)
    print(f"📡 Final Database Host: {parsed.hostname or 'localhost'} (Scheme: {parsed.scheme})")
except Exception:
    print("📡 Database Host: [Could not parse URL]")

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
