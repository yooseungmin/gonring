"""
Test configuration utilities.
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import database_exists, create_database, drop_database
import uuid

# Add the parent directory to path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.models import User, VirtualUser, Box, Content, Tag, Attachment
from app.auth import get_current_virtual_user
from app.core.config import settings
from main import app

# Create test database URL
TEST_DB_URL = f"{settings.get_database_uri}_test"

# Create test engine and session
engine = create_engine(TEST_DB_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Test user data
TEST_USER = {
    "id": uuid.uuid4(),
    "email": "test@example.com",
    "username": "testuser",
    "hashed_password": "$2b$12$S6IfRjTKh0PFzTqUtevyGOgl6kP5TrfHYO9TY3OdZcNbvpNbfcjnK",  # hashed 'testpassword'
    "is_active": True,
    "is_superuser": False
}

# Test virtual user data
TEST_VIRTUAL_USER = {
    "id": uuid.uuid4(),
    "user_id": None,  # Will be set during setup
    "description": "Test Virtual User"
}

# Test box data
TEST_BOX = {
    "id": uuid.uuid4(),
    "name": "Test Box",
    "description": "Test Box Description",
    "is_public": False,
    "owner_id": None  # Will be set during setup
}

# Override the dependency to get the test database session
def override_get_db():
    try:
        db = TestSessionLocal()
        yield db
    finally:
        db.close()

# Override the authentication to use a test user
def override_get_current_virtual_user():
    db = TestSessionLocal()
    virtual_user = db.query(VirtualUser).filter(VirtualUser.id == TEST_VIRTUAL_USER["id"]).first()
    db.close()
    return virtual_user

# Replace the app dependencies
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_virtual_user] = override_get_current_virtual_user

# Create test client
client = TestClient(app)

@pytest.fixture(scope="module")
def setup_test_db():
    # Create test database if it doesn't exist
    if not database_exists(TEST_DB_URL):
        create_database(TEST_DB_URL)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create test user and virtual user
    db = TestSessionLocal()
    
    # Add test user
    TEST_USER["id"] = uuid.uuid4()
    user = User(**TEST_USER)
    db.add(user)
    db.flush()
    
    # Link virtual user to test user
    TEST_VIRTUAL_USER["user_id"] = TEST_USER["id"]
    TEST_VIRTUAL_USER["id"] = uuid.uuid4()
    virtual_user = VirtualUser(**TEST_VIRTUAL_USER)
    db.add(virtual_user)
    db.flush()
    
    # Create test box
    TEST_BOX["id"] = uuid.uuid4()
    TEST_BOX["owner_id"] = TEST_VIRTUAL_USER["id"]
    box = Box(**TEST_BOX)
    db.add(box)
    
    db.commit()
    db.close()
    
    # Create upload directory for tests
    os.makedirs(f"{settings.LOCAL_STORAGE_PATH}/test_uploads", exist_ok=True)
    
    yield
    
    # Cleanup
    drop_database(TEST_DB_URL)
    
    # Clean test uploads
    import shutil
    test_upload_dir = f"{settings.LOCAL_STORAGE_PATH}/test_uploads"
    if os.path.exists(test_upload_dir):
        shutil.rmtree(test_upload_dir)

@pytest.fixture(scope="function")
def clean_test_data():
    db = TestSessionLocal()
    # Clean any existing test content
    db.query(Attachment).delete()
    db.query(Tag).delete()
    db.query(Content).delete()
    db.commit()
    db.close()
    
    yield
    
    # Clean again after test
    db = TestSessionLocal()
    db.query(Attachment).delete()
    db.query(Tag).delete()
    db.query(Content).delete()
    db.commit()
    db.close()
