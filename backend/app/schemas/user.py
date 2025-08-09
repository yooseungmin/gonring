from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Literal
from datetime import datetime

# 소셜 로그인 제공자 타입
SocialProvider = Literal["google", "facebook", "apple"]

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str  # 이메일 주소나 사용자명
    password: str

class UserProfile(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None
    provider: SocialProvider
    provider_id: str

class User(UserBase):
    id: str
    is_active: bool
    is_superuser: Optional[bool] = False
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: Optional[SocialProvider] = None
    provider_id: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str
