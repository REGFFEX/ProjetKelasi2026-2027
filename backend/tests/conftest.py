import os

os.environ.setdefault("DATABASE_URL", "mysql+pymysql://kelasi:kelasi_pw@localhost:3306/kelasi_test")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pymysql
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.db import get_db
from app.main import app
from app.models.base import Base


def _ensure_test_database():
    root_conn = pymysql.connect(host="localhost", port=3306, user="root", password="kelasi_root_pw")
    try:
        with root_conn.cursor() as cur:
            cur.execute("CREATE DATABASE IF NOT EXISTS kelasi_test")
            cur.execute("GRANT ALL PRIVILEGES ON kelasi_test.* TO 'kelasi'@'%'")
            cur.execute("FLUSH PRIVILEGES")
        root_conn.commit()
    finally:
        root_conn.close()


@pytest.fixture(scope="session")
def engine():
    _ensure_test_database()
    eng = create_engine(settings.DATABASE_URL)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
