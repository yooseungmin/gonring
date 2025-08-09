"""
인증 토큰 스키마
"""

from typing import Optional
from pydantic import BaseModel

class Token(BaseModel):
    """
    OAuth2 호환 토큰 응답
    """
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

class TokenPayload(BaseModel):
    """
    JWT 토큰 페이로드
    """
    sub: str  # 사용자 ID
    exp: int  # 만료 시간 (UNIX 타임스탬프)
    
class RefreshToken(BaseModel):
    """
    토큰 갱신 요청
    """
    refresh_token: str
