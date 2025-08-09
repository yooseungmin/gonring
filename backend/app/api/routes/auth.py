from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, validator
from jose import JWTError, jwt
from datetime import datetime, timedelta
import httpx
from typing import Dict, Any, Optional

from ...core.config import settings
from ...schemas.user import User, UserProfile, SocialProvider, Token
from ...auth import create_access_token, get_current_user, MOCK_USERS, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
    responses={401: {"description": "Unauthorized"}},
)

# 소셜 로그인 요청 모델
class SocialLoginRequest(BaseModel):
    provider: SocialProvider
    access_token: str
    id_token: Optional[str] = None  # Apple의 경우 필요

    @validator('provider')
    def validate_provider(cls, v):
        if v not in ['google', 'facebook', 'apple']:
            raise ValueError('지원하지 않는 로그인 제공자입니다')
        return v

@router.post("/social-login", response_model=Dict[str, Any])
async def social_login(request: SocialLoginRequest):
    """소셜 로그인 처리 (Google, Apple, Facebook)"""
    try:
        # 각 제공업체별 사용자 정보 검증
        user_info = None
        
        if request.provider == "google":
            user_info = await verify_google_token(request.access_token)
        elif request.provider == "facebook":
            user_info = await verify_facebook_token(request.access_token)
        elif request.provider == "apple":
            if not request.id_token:
                raise HTTPException(status_code=400, detail="Apple 로그인에는 id_token이 필요합니다")
            user_info = await verify_apple_token(request.id_token)
        
        if not user_info:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
            
        # 사용자 조회 또는 생성
        user = await get_or_create_social_user(user_info)
        
        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["id"]}, expires_delta=access_token_expires
        )
        
        # 필요 없는 민감 정보 제거
        if "password" in user:
            del user["password"]
        
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user
            },
            "message": "로그인 성공"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"로그인 처리 중 오류가 발생했습니다: {str(e)}"
        )

# Google 토큰 검증
async def verify_google_token(access_token: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=401, 
                    detail=f"Google 토큰 검증 실패: {response.text}"
                )
            
            data = response.json()
            return {
                "email": data["email"],
                "name": data.get("name", ""),
                "picture": data.get("picture", ""),
                "provider": "google",
                "provider_id": data["sub"]
            }
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Google API 연결 오류")

# Facebook 토큰 검증
async def verify_facebook_token(access_token: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.facebook.com/me",
                params={
                    "fields": "id,name,email,picture",
                    "access_token": access_token
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=401, 
                    detail=f"Facebook 토큰 검증 실패: {response.text}"
                )
            
            data = response.json()
            
            # 이메일이 없는 경우 처리
            if "email" not in data:
                raise HTTPException(
                    status_code=400,
                    detail="Facebook 계정에 이메일이 없습니다. 이메일 권한을 허용해주세요."
                )
                
            return {
                "email": data["email"],
                "name": data.get("name", ""),
                "picture": data.get("picture", {}).get("data", {}).get("url", ""),
                "provider": "facebook",
                "provider_id": data["id"]
            }
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Facebook API 연결 오류")

# Apple 토큰 검증
async def verify_apple_token(id_token: str) -> Dict[str, Any]:
    try:
        # Apple JWT 검증 로직
        # 여기서는 jwt 라이브러리를 사용하여 간단히 디코딩만 합니다.
        # 실제 구현에서는 Apple의 public key로 검증해야 합니다.
        try:
            # 간단한 디코딩 (실제 검증은 아님)
            payload = jwt.decode(id_token, options={"verify_signature": False})
            
            # 필수 필드 확인
            if "sub" not in payload or "email" not in payload:
                raise HTTPException(
                    status_code=401,
                    detail="Apple ID 토큰에 필요한 정보가 없습니다"
                )
                
            return {
                "email": payload["email"],
                "name": payload.get("name", "Apple User"),  # Apple은 이름이 없을 수 있음
                "picture": "",  # Apple은 프로필 사진 제공 안함
                "provider": "apple",
                "provider_id": payload["sub"]
            }
        except JWTError:
            raise HTTPException(status_code=401, detail="잘못된 Apple ID 토큰")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apple 토큰 검증 중 오류: {str(e)}")

# 사용자 조회 또는 생성
async def get_or_create_social_user(user_info: Dict[str, Any]) -> Dict[str, Any]:
    # 이메일로 기존 사용자 찾기
    for user_id, user in MOCK_USERS.items():
        if user.get("email") == user_info["email"]:
            # 기존 사용자 정보 업데이트
            user.update({
                "name": user_info["name"],
                "picture": user_info.get("picture", ""),
                "last_login": datetime.utcnow().isoformat()
            })
            return user
    
    # 새 사용자 생성
    user_id = f"user_{len(MOCK_USERS) + 1}"
    new_user = {
        "id": user_id,
        "email": user_info["email"],
        "username": user_info["email"].split("@")[0],  # 이메일에서 유저네임 생성
        "name": user_info["name"],
        "picture": user_info.get("picture", ""),
        "provider": user_info["provider"],
        "provider_id": user_info["provider_id"],
        "is_active": True,
        "is_superuser": False,
        "created_at": datetime.utcnow().isoformat(),
        "last_login": datetime.utcnow().isoformat()
    }
    
    MOCK_USERS[user_id] = new_user
    return new_user
