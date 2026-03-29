import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.schema import Base
from app.config import settings

# Ensure the database URL uses the asyncpg driver
db_url = settings.database_url

# If the current URL is localhost or default, try to find a better one in env vars
if "localhost" in db_url or "127.0.0.1" in db_url:
    # Order of preference: Render Personal/Private URLs, Database URL, others
    keys = ["DATABASE_URL", "POSTGRES_URL", "DATABASE_PRIVATE_URL", "DB_URL", "SUPABASE_URL", "POSTGRESQL_URL"]
    for key in keys:
        env_val = os.environ.get(key)
        if env_val and "localhost" not in env_val:
            print(f"[DB] Auto-switching to production database: {key}")
            db_url = env_val
            break

# Handle scheme differences (Heroku/Render common issues)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Render / Supabase / Managed Postgres often require SSL
connect_args = {}
if "localhost" not in db_url and "127.0.0.1" not in db_url:
    # require SSL for non-local connections
    connect_args["ssl"] = "require"
    # Disable prepared statement caching for compatibility with PgBouncer
    # (used by Render and many cloud providers for transaction pooling)
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    connect_args=connect_args
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
                ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT false;
                """
            )
        )

        # Apply constraints to users table if they don't exist
        # PostgreSQL doesn't have "ADD CONSTRAINT IF NOT EXISTS" for all types, 
        # so we use a DO block for safety.
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    -- Unique constraint for email
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
                    ) THEN
                        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
                    END IF;

                    -- Check constraint for role
                    IF EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'check_user_role'
                    ) THEN
                        ALTER TABLE users DROP CONSTRAINT check_user_role;
                    END IF;
                    
                    ALTER TABLE users ADD CONSTRAINT check_user_role 
                    CHECK (role IN ('student', 'teacher', 'instructor', 'admin'));
                END $$;
                """
            )
        )
