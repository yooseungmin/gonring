from typing import List, Optional
from pydantic import BaseModel

class TagBase(BaseModel):
    name: str
    score: float
    category: Optional[str] = None

class TagRecommendationRequest(BaseModel):
    content: str
    max_tags: Optional[int] = 10
    categories: Optional[List[str]] = None

class TagRecommendationResponse(BaseModel):
    tags: List[TagBase]
    
class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 20
    include_tags: Optional[List[str]] = None
    exclude_tags: Optional[List[str]] = None
    
class SearchResultItem(BaseModel):
    id: str
    title: str
    excerpt: str
    score: float
    tags: List[str]
    url: Optional[str] = None
    
class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total_count: int
    page: int
    total_pages: int
