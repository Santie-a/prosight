from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from typing import Generator

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    # Only relevant for SQLite — prevents "check same thread" error
    # when SQLAlchemy hands connections across threads in FastAPI
    connect_args={"check_same_thread": False},
    # Echo SQL statements in development for easier debugging
    echo=settings.is_development,
)


# Enable WAL mode for SQLite — allows concurrent reads during a write,
# which matters once the mobile app is making overlapping requests
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all tables. Called once at application startup."""
    # Import models here so Base is aware of them before create_all
    import app.db.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    

def get_db() -> Generator[Session, None, None]:
    """
    Dependency function — yields a session and guarantees cleanup.
    Used via FastAPI's Depends() in routers and dependencies.py.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()