from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class SearchQuery(BaseModel):
    """검색 쿼리 스키마"""
    keyword: Optional[str] = None
    tags: Optional[List[str]] = None
    box_id: Optional[str] = None  # 특정 박스 내에서만 검색
    user_id: Optional[str] = None  # 특정 사용자의 컨텐츠만 검색
    page: int = 1
    limit: int = 20
    sort_by: str = "relevance"  # 'relevance', 'created_at', 'updated_at'
    sort_order: str = "desc"  # 'asc', 'desc'


class SearchResultItem(BaseModel):
    """검색 결과 아이템 스키마"""
    id: str
    title: str
    text_preview: str  # 하이라이팅된 텍스트 미리보기
    html_content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: List[Any]  # Tag 객체 목록
    box_id: str
    box_name: str
    relevance_score: Optional[float] = None  # 관련성 점수


class SearchResponse(BaseModel):
    """검색 응답 스키마"""
    items: List[SearchResultItem]
    total: int
    page: int
    limit: int
    has_more: bool


class TagCloudItem(BaseModel):
    """태그 클라우드 아이템 스키마"""
    id: str
    name: str
    count: int  # 태그 사용 횟수


class TagCloudResponse(BaseModel):
    """태그 클라우드 응답 스키마"""
    tags: List[TagCloudItem]
