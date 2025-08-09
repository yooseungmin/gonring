"""
개인화 LLM 컨텍스트 서비스 - 사용자의 컨텐츠와 태그를 기반으로 개인화된 LLM 컨텍스트 생성
"""

from typing import List, Dict, Optional, Any
import logging
from sqlalchemy.orm import Session

from app.core.context_engine import PersonalizedContextEngine
from app.models.user import User
from app.models.tag import Tag
from app.models.content import Content
from app.schemas.llm_context import (
    ContextItem, 
    QueryKeywords, 
    ChatQuery,
    ChatResponse
)
from app.crud import tag as tag_crud
from app.crud import content as content_crud
from app.crud import tag_relationship as tag_relationship_crud
from app.services.tag_relationship_service import TagRelationshipService

logger = logging.getLogger(__name__)

class PersonalizedLLMService:
    """
    개인화 LLM 서비스 - 사용자의 컨텐츠와 태그를 기반으로 개인화된 LLM 컨텍스트 생성
    """
    
    def __init__(self, db: Session):
        """
        개인화 LLM 서비스 초기화
        
        Args:
            db: 데이터베이스 세션
        """
        self.db = db
        self.context_engine = PersonalizedContextEngine()
        self.tag_relationship_service = TagRelationshipService(db)
    
    def generate_context_for_query(self, 
                                 query: str,
                                 user_id: Optional[int] = None,
                                 max_items: int = 5) -> List[ContextItem]:
        """
        쿼리에 대한 개인화된 컨텍스트 생성
        
        Args:
            query: 사용자 쿼리
            user_id: 사용자 ID (None이면 개인화하지 않음)
            max_items: 최대 컨텍스트 아이템 수
            
        Returns:
            List[ContextItem]: 개인화된 컨텍스트 아이템 목록
        """
        # 쿼리 키워드 추출
        query_keywords = self.context_engine.extract_query_keywords(query)
        
        # 사용자 태그 가져오기
        user_tags = {}
        if user_id:
            tags = tag_crud.get_user_tags(self.db, user_id)
            user_tags = {tag.id: tag for tag in tags}
        
        # 사용자 태그가 없으면 전체 태그 사용
        if not user_tags:
            tags = tag_crud.get_tags(self.db, 0, 100)
            user_tags = {tag.id: tag for tag in tags}
        
        # 태그 관계 가져오기
        tag_relationships = []
        if user_id:
            tag_relationships = tag_relationship_crud.get_tag_relationships_by_user(
                self.db, user_id, 0, 500
            )
        else:
            tag_relationships = tag_relationship_crud.get_tag_relationships_by_user(
                self.db, None, 0, 500  # 전체 통계
            )
        
        # 사용자 컨텐츠 가져오기
        user_contents = []
        if user_id:
            # 사용자가 작성한 컨텐츠
            user_contents = content_crud.get_contents_by_user(self.db, user_id, 0, 100)
            
            # 사용자가 본 컨텐츠 (구현 필요)
            # viewed_contents = content_crud.get_viewed_contents_by_user(self.db, user_id, 0, 100)
            # user_contents.extend(viewed_contents)
            
        # 사용자 컨텐츠가 부족하면 인기 컨텐츠 추가
        if len(user_contents) < 20:
            popular_contents = content_crud.get_popular_contents(self.db, 0, 50)
            user_contents.extend(popular_contents)
        
        # 컨텍스트 생성
        context_items = self.context_engine.generate_context(
            user_id,
            query,
            user_tags,
            user_contents,
            tag_relationships
        )
        
        return context_items[:max_items]
    
    def process_chat_query(self, chat_query: ChatQuery) -> ChatResponse:
        """
        채팅 쿼리 처리
        
        Args:
            chat_query: 채팅 쿼리 정보
            
        Returns:
            ChatResponse: 채팅 응답
        """
        # 컨텍스트 아이템이 없으면 생성
        context_items = chat_query.context_items or []
        
        if not context_items:
            context_items = self.generate_context_for_query(
                chat_query.query,
                chat_query.user_id
            )
        
        # LLM API 호출 (실제 구현은 별도 모듈에서)
        response, used_context, tokens_used = self._call_llm_api(
            chat_query.query,
            context_items,
            chat_query.max_tokens,
            chat_query.temperature
        )
        
        # 응답 생성
        chat_response = ChatResponse(
            response=response,
            context_items_used=used_context,
            tokens_used=tokens_used
        )
        
        return chat_response
    
    def _call_llm_api(self, 
                    query: str, 
                    context_items: List[ContextItem],
                    max_tokens: int,
                    temperature: float) -> tuple[str, List[ContextItem], int]:
        """
        LLM API 호출 (임시 구현)
        
        Args:
            query: 사용자 쿼리
            context_items: 컨텍스트 아이템 목록
            max_tokens: 최대 토큰 수
            temperature: 온도 설정
            
        Returns:
            tuple[str, List[ContextItem], int]: (응답 텍스트, 사용된 컨텍스트, 사용된 토큰 수)
        """
        # 실제 구현에서는 외부 LLM API 호출
        # 임시 구현: 단순히 쿼리와 컨텍스트를 반환
        
        # 컨텍스트 결합
        context_text = ""
        for item in context_items:
            context_text += f"{item.title}: {item.content[:100]}...\n\n"
        
        # 간단한 응답 생성
        response = f"쿼리: {query}\n\n컨텍스트 요약:\n{context_text}\n\n이것은 개인화된 LLM 응답 테스트입니다."
        
        # 토큰 수 계산 (간단한 추정)
        tokens_used = len(response) // 4
        
        return response, context_items, tokens_used
    
    def get_user_tag_recommendations(self, 
                                    user_id: int, 
                                    max_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        사용자에게 추천할 태그 가져오기
        
        Args:
            user_id: 사용자 ID
            max_recommendations: 최대 추천 수
            
        Returns:
            List[Dict[str, Any]]: 추천 태그 목록 (태그 ID, 이름, 점수)
        """
        # 사용자 태그 가져오기
        user_tags = tag_crud.get_user_tags(self.db, user_id)
        user_tag_ids = [tag.id for tag in user_tags]
        
        if not user_tag_ids:
            # 사용자 태그가 없으면 인기 태그 반환
            popular_tags = tag_crud.get_popular_tags(self.db, 0, max_recommendations)
            return [
                {
                    "id": tag.id,
                    "name": tag.name,
                    "score": 0.5,
                    "reason": "인기 태그"
                }
                for tag in popular_tags
            ]
        
        # 관련 태그 가져오기
        related_tags = self.tag_relationship_service.get_related_tags(
            user_tag_ids, user_id, max_recommendations
        )
        
        # 결과 포맷팅
        result = []
        for tag_id, score, tag_name in related_tags:
            # 이미 사용자가 가지고 있는 태그는 제외
            if tag_id not in user_tag_ids:
                result.append({
                    "id": tag_id,
                    "name": tag_name,
                    "score": score,
                    "reason": "관련 태그"
                })
                
        return result
