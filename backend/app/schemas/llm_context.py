from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class QueryKeyword(BaseModel):
    """쿼리에서 추출된 키워드"""
    keyword: str
    importance: float = Field(ge=0.0, le=1.0, description="키워드 중요도 점수")

class RelatedTag(BaseModel):
    """쿼리 키워드와 관련된 태그"""
    tag_id: str
    tag_name: str
    relevance_score: float = Field(ge=0.0, le=1.0, description="쿼리 키워드와의 관련성 점수")
    
class RelatedContent(BaseModel):
    """관련 태그에 연결된 콘텐츠"""
    content_id: str
    title: str
    text_preview: str
    tags: List[str]
    tb_score: float = Field(ge=0.0, description="tB Engine에서 계산된 관련성 점수")
    
class LLMContext(BaseModel):
    """LLM에 제공할 개인화된 컨텍스트"""
    query: str
    keywords: List[QueryKeyword]
    related_tags: List[RelatedTag]
    related_contents: List[RelatedContent]
    context_text: str = Field(description="LLM에 전달할 최종 컨텍스트 텍스트")
    
class ChatQuery(BaseModel):
    """사용자 채팅 쿼리"""
    query: str
    include_context_details: bool = True  # 응답에 사용된 컨텍스트 정보 포함 여부
    max_context_tokens: int = Field(1000, ge=100, le=4000, description="최대 컨텍스트 토큰 수")
    
class ChatResponse(BaseModel):
    """개인화된 LLM 응답"""
    query: str
    response: str
    context_used: Optional[LLMContext] = None  # include_context_details=True인 경우만 포함
    
class ContextSettings(BaseModel):
    """컨텍스트 생성 설정"""
    max_tags: int = Field(5, ge=1, le=20, description="최대 관련 태그 수")
    max_contents_per_tag: int = Field(2, ge=1, le=5, description="태그당 최대 관련 콘텐츠 수")
    min_relevance_score: float = Field(0.3, ge=0.0, le=1.0, description="최소 관련성 점수")
