"""ArthNiti — async database session management.

Uses aiosqlite for local development. PostgreSQL asyncpg can be swapped
in by changing the DATABASE_URL without touching any other code.
"""

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import get_settings

_settings = get_settings()

# Create async engine with SQLite-specific pragmas
_engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=False,
    connect_args={
        "check_same_thread": False,
    } if _settings.DATABASE_URL.startswith("sqlite") else {},
)

if _settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(_engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # Foreign key enforcement
        cursor.execute("PRAGMA foreign_keys=ON")
        # WAL mode: concurrent reads don't block writes and vice versa.
        # Critical for demo seeding + simultaneous API requests on startup.
        cursor.execute("PRAGMA journal_mode=WAL")
        # NORMAL sync: safe for demo/dev; durable on OS crash but not power loss.
        # Much faster than the default FULL mode which fsync()s on every commit.
        cursor.execute("PRAGMA synchronous=NORMAL")
        # 64MB memory-mapped I/O: reduces read syscall overhead significantly.
        cursor.execute("PRAGMA mmap_size=67108864")
        # Limit WAL file growth
        cursor.execute("PRAGMA journal_size_limit=67108864")
        cursor.close()

_AsyncSessionLocal = async_sessionmaker(
    bind=_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
async_session_maker = _AsyncSessionLocal


async def init_db():
    """Create all tables (DDL is a no-op if tables already exist)."""
    from backend.database.models import Base
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async DB session."""
    async with _AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
