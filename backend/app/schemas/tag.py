from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4

class TagBase(BaseModel):
    name: str
    scope: Optional[str] = "default"  # 태그 범위 (기본/사용자 정의/시스템 등)
    score: Optional[float] = None     # 추천 점수 (태그 추천에 사용)

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    score: Optional[float] = None

class Tag(TagBase):
    id: str
    content_id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
