from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID, uuid4

from .tag import Tag, TagCreate

class ContentBase(BaseModel):
    title: Optional[str] = None
    text_content: str
    markdown_content: Optional[str] = None
    html_content: Optional[str] = None
    url: Optional[str] = None

class ContentCreate(ContentBase):
    tags: Optional[List[TagCreate]] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    text_content: Optional[str] = None
    markdown_content: Optional[str] = None
    html_content: Optional[str] = None
    url: Optional[str] = None
    tags: Optional[List[TagCreate]] = None

class ContentInDB(ContentBase):
    id: str
    box_id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Content(ContentInDB):
    tags: List[Tag] = []
    
    class Config:
        from_attributes = True

class ContentBrief(BaseModel):
    id: str
    title: Optional[str] = None
    text_preview: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tag_count: int = 0
    
    class Config:
        from_attributes = True

class TagRecommendRequest(BaseModel):
    text: str
    count: Optional[int] = 5
    min_score: Optional[float] = 0.1

class TagRecommendResponse(BaseModel):
    tags: List[TagCreate]
    analysis: Optional[Any] = None
