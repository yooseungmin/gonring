from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4

class BoxBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False
    parent_id: Optional[str] = None  # 계층 구조를 위한 필드

class BoxCreate(BoxBase):
    pass

class BoxUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    parent_id: Optional[str] = None

class Box(BoxBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    content_count: int = 0
    child_box_count: int = 0  # 하위 Box 개수
    tag_count: int = 0  # 박스에 포함된 고유 태그 수

    class Config:
        from_attributes = True

class BoxInList(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_public: bool
    owner_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    content_count: int
    child_box_count: int
    parent_id: Optional[str] = None
    tag_count: int = 0  # 박스에 포함된 고유 태그 수

    class Config:
        from_attributes = True
