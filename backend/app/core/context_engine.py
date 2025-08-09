from datetime import datetime
from typing import List, Dict, Optional, Any
import logging
import re
from collections import Counter
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.llm_context import (
    QueryKeyword,
    RelatedTag,
    RelatedContent,
    LLMContext,
    ContextSettings
)
from app.core.relationship_engine import TagRelationshipEngine

logger = logging.getLogger(__name__)

class PersonalizedContextEngine:
    """TB Engine 결과 + 관계성 데이터로 LLM 컨텍스트 생성"""
    
    def __init__(self):
        self.relationship_engine = TagRelationshipEngine()
    
    async def analyze_query_keywords(self, query: str) -> List[QueryKeyword]:
        """쿼리에서 키워드 추출 (TB Engine 호출 금지)
        
        간단한 빈도 기반 키워드 추출 (실제로는 더 정교한 알고리즘 필요)
        """
        logger.info(f"Analyzing keywords from query: {query}")
        
        # 1. 쿼리 전처리
        query = query.lower()
        
        # 2. 불용어 제거 (간단한 영어/한국어 불용어 목록)
        stopwords = {
            "a", "an", "the", "and", "or", "but", "if", "because", "as", "what",
            "which", "this", "that", "these", "those", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "of", "at", "by", "for", "with", "about", "against", "between", "into",
            "through", "during", "before", "after", "above", "below", "to", "from",
            "up", "down", "in", "out", "on", "off", "over", "under", "again",
            "further", "then", "once", "here", "there", "when", "where", "why",
            "how", "all", "any", "both", "each", "few", "more", "most", "other",
            "some", "such", "no", "nor", "not", "only", "own", "same", "so",
            "than", "too", "very", "s", "t", "can", "will", "just", "don", "should",
            "now", "i", "me", "my", "myself", "we", "our", "ours", "ourselves",
            "you", "your", "yours", "yourself", "yourselves", "he", "him", "his",
            "himself", "she", "her", "hers", "herself", "it", "its", "itself",
            "they", "them", "their", "theirs", "themselves", "who", "whom",
            # 한국어 불용어
            "그", "이", "저", "것", "무엇", "어느", "하다", "있다", "되다", "이다",
            "아니다", "등", "들", "에", "에서", "을", "를", "이", "가", "은", "는",
            "와", "과", "로", "으로", "에게", "뿐", "의", "도", "만", "에서", "부터",
            "까지", "이나", "나", "이라도", "라도", "라면", "이면", "면", "이므로",
            "으므로", "이라는", "라는"
        }
        
        # 3. 토큰화 (단어 분리)
        tokens = re.findall(r'\b\w+\b', query)
        tokens = [token for token in tokens if token not in stopwords and len(token) > 1]
        
        # 4. 단어 빈도 계산
        word_count = Counter(tokens)
        total_words = len(tokens)
        
        # 5. 키워드 추출 (빈도 기반)
        keywords = []
        for word, count in word_count.most_common(5):  # 상위 5개 키워드
            importance = min(1.0, count / max(1, total_words / 2))  # 중요도 점수 계산
            keywords.append(QueryKeyword(keyword=word, importance=importance))
        
        logger.info(f"Extracted {len(keywords)} keywords from query")
        return keywords
    
    async def find_related_tags(
        self, 
        keywords: List[str], 
        box_id: str, 
        db: AsyncSession,
        settings: ContextSettings = ContextSettings()
    ) -> List[RelatedTag]:
        """키워드와 관련된 태그들을 관계성 DB에서 추출"""
        from app.crud.tag import tag as tag_crud
        
        logger.info(f"Finding related tags for keywords: {keywords} in box {box_id}")
        
        # 1. 박스의 모든 태그 가져오기
        all_tags = await tag_crud.get_tags_by_box(db, box_id=box_id)
        if not all_tags:
            logger.info(f"No tags found in box {box_id}")
            return []
        
        # 2. 키워드와 태그 이름 간 유사도 계산
        # 간단한 구현: 태그 이름에 키워드가 포함되면 관련성 높음
        related_tags = []
        
        for tag in all_tags:
            tag_name_lower = tag.name.lower()
            max_relevance = 0.0
            
            for keyword in keywords:
                keyword_lower = keyword.lower()
                
                # 태그 이름에 키워드가 정확히 포함되면 높은 점수
                if keyword_lower == tag_name_lower:
                    relevance = 1.0
                elif keyword_lower in tag_name_lower:
                    relevance = 0.8
                # 일부만 포함되면 더 낮은 점수
                elif len(keyword_lower) > 3 and keyword_lower[:4] in tag_name_lower:
                    relevance = 0.5
                else:
                    relevance = 0.0
                
                max_relevance = max(max_relevance, relevance)
            
            # 최소 관련성 점수 이상인 태그만 추가
            if max_relevance >= settings.min_relevance_score:
                related_tags.append(
                    RelatedTag(
                        tag_id=tag.id,
                        tag_name=tag.name,
                        relevance_score=max_relevance
                    )
                )
        
        # 3. 관련성 점수로 정렬하고 상위 N개만 선택
        related_tags.sort(key=lambda x: x.relevance_score, reverse=True)
        related_tags = related_tags[:settings.max_tags]
        
        logger.info(f"Found {len(related_tags)} related tags")
        return related_tags
    
    async def collect_related_contents(
        self,
        related_tags: List[RelatedTag],
        box_id: str,
        db: AsyncSession,
        settings: ContextSettings = ContextSettings()
    ) -> List[RelatedContent]:
        """관련 태그의 메모들 + tB Score 수집"""
        from app.crud.content import content as content_crud
        from app.crud.tag import tag as tag_crud
        
        logger.info(f"Collecting related contents for {len(related_tags)} tags in box {box_id}")
        
        all_related_contents = []
        seen_content_ids = set()  # 중복 방지
        
        for tag in related_tags:
            # 태그의 콘텐츠 가져오기
            contents = await content_crud.get_contents_by_tag_and_box(
                db, tag_id=tag.tag_id, box_id=box_id, limit=10
            )
            
            # 각 콘텐츠의 tB Score 계산 (여기서는 간단히 구현)
            related_contents_for_tag = []
            
            for content in contents:
                # 이미 처리한 콘텐츠는 건너뛰기
                if content.id in seen_content_ids:
                    continue
                
                # 콘텐츠의 모든 태그 가져오기
                content_tags = await tag_crud.get_tags_by_content(db, content_id=content.id)
                tag_names = [t.name for t in content_tags]
                
                # tB Score 계산 (간단한 구현)
                # 실제로는 TB Engine에서 계산된 점수 사용
                # 여기서는 관련 태그의 relevance_score와 태그 수에 비례하도록 계산
                tb_score = tag.relevance_score * min(1.0, len(content_tags) / 10)
                
                # 관련 콘텐츠 추가
                related_contents_for_tag.append(
                    RelatedContent(
                        content_id=content.id,
                        title=content.title,
                        text_preview=content.text[:200] if content.text else "",
                        tags=tag_names,
                        tb_score=tb_score
                    )
                )
                
                seen_content_ids.add(content.id)
            
            # tB Score로 정렬하고 상위 N개만 선택
            related_contents_for_tag.sort(key=lambda x: x.tb_score, reverse=True)
            all_related_contents.extend(related_contents_for_tag[:settings.max_contents_per_tag])
        
        # 전체 목록에서 tB Score로 다시 정렬
        all_related_contents.sort(key=lambda x: x.tb_score, reverse=True)
        
        logger.info(f"Collected {len(all_related_contents)} related contents")
        return all_related_contents
    
    async def build_llm_context(
        self,
        query: str,
        related_tags: List[RelatedTag],
        related_contents: List[RelatedContent],
        max_tokens: int = 1000
    ) -> str:
        """관련 태그의 메모들 + tB Score로 LLM 컨텍스트 구성"""
        logger.info(f"Building LLM context for query: {query}")
        
        # 1. 컨텍스트 헤더 구성
        context = "# 사용자 지식 컨텍스트\n\n"
        
        # 2. 쿼리 관련 태그 정보 추가
        context += "## 관련 태그\n"
        for tag in related_tags:
            context += f"- {tag.tag_name} (관련성: {tag.relevance_score:.2f})\n"
        
        context += "\n## 관련 콘텐츠\n\n"
        
        # 3. 관련 콘텐츠 정보 추가 (tB Score 순)
        for content in related_contents:
            content_section = f"### {content.title} (tB Score: {content.tb_score:.2f})\n"
            content_section += f"태그: {', '.join(content.tags)}\n\n"
            content_section += f"{content.text_preview}\n\n"
            
            # 토큰 수 제한 (간단한 구현)
            # 실제로는 정확한 토큰 계산 필요
            if len(context + content_section) > max_tokens * 4:  # 대략 1토큰 = 4자
                break
                
            context += content_section
        
        # 4. 컨텍스트 사용 지침 추가
        context += "\n# 지침\n"
        context += "- 위 컨텍스트를 활용하여 사용자 질문에 답변하세요.\n"
        context += "- 컨텍스트에서 정보를 찾을 수 없는 경우, 일반적인 지식에 기반하여 답변하세요.\n"
        context += "- 사용자의 개인화된 지식을 활용하는 것이 중요합니다.\n"
        
        logger.info(f"Built context with {len(context)} characters")
        return context
    
    async def generate_personalized_context(
        self, 
        query: str, 
        box_id: str, 
        db: AsyncSession,
        settings: ContextSettings = ContextSettings(),
        max_tokens: int = 1000
    ) -> LLMContext:
        """전체 개인화 컨텍스트 생성 프로세스"""
        logger.info(f"Generating personalized context for query: {query} in box: {box_id}")
        
        # 1. 쿼리 키워드 추출
        keywords = await self.analyze_query_keywords(query)
        keyword_strings = [k.keyword for k in keywords]
        
        # 2. 관련 태그 찾기
        related_tags = await self.find_related_tags(
            keyword_strings, box_id, db, settings
        )
        
        # 3. 관련 콘텐츠 수집
        related_contents = await self.collect_related_contents(
            related_tags, box_id, db, settings
        )
        
        # 4. LLM 컨텍스트 구성
        context_text = await self.build_llm_context(
            query, related_tags, related_contents, max_tokens
        )
        
        # 5. 전체 컨텍스트 객체 반환
        llm_context = LLMContext(
            query=query,
            keywords=keywords,
            related_tags=related_tags,
            related_contents=related_contents,
            context_text=context_text
        )
        
        logger.info(f"Generated personalized context with {len(related_tags)} tags and {len(related_contents)} contents")
        return llm_context
