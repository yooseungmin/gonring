from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

from .schemas.user import User

# OAuth2 configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET", "your_default_secret_key_change_this_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Mock user database for development
# In production, this would be replaced with actual database queries
MOCK_USERS = {
    "user123": {
        "id": "user123",
        "email": "user@example.com",
        "username": "testuser",
        "password": "$2b$12$3oCXUSJ3Xg.0PdQGuAzA6eAqhxQglN3lZaTmPm3Bj5y3WLf1QAyTC",  # hashed "password"
        "is_active": True,
        "is_superuser": False
    }
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = MOCK_USERS.get(user_id)
    if user is None:
        raise credentials_exception
        
    return User(**user)
