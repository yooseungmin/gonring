from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.services.llm_context import generate_personalized_response
from app.models.user import User

router = APIRouter()

@router.post("/chat", response_model=Dict[str, Any])
def personalized_chat(
    query: str = Body(..., description="User's query to the LLM"),
    box_id: Optional[str] = Body(None, description="Optional box ID to limit context to"),
    model: str = Body("gpt-3.5-turbo", description="LLM model to use"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    개인화된 LLM 채팅 응답을 생성합니다.
    
    - 사용자의 태그 그래프와 메모 내용을 컨텍스트로 활용
    - 쿼리 관련 태그를 자동으로 식별하고 tB Score 기반 가중치 적용
    - box_id가 제공되면 해당 Box 내 컨텐츠로 컨텍스트 제한
    """
    try:
        response = generate_personalized_response(
            db=db,
            query=query,
            user_id=current_user.id,
            box_id=box_id,
            model=model
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"채팅 응답 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/analyze-query", response_model=Dict[str, Any])
def analyze_query(
    query: str = Body(..., description="User's query to analyze"),
    box_id: Optional[str] = Body(None, description="Optional box ID to limit context to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    사용자의 쿼리를 분석하여 관련 태그와 컨텍스트 정보를 반환합니다.
    실제 LLM 응답은 생성하지 않고 분석 결과만 반환합니다.
    """
    from app.services.llm_context import extract_query_keywords, find_related_tags, collect_context_from_tags
    
    try:
        # 쿼리에서 키워드 추출
        keywords = extract_query_keywords(query)
        
        # 관련 태그 찾기
        related_tags = find_related_tags(db, keywords, current_user.id)
        tag_ids = [tag["id"] for tag in related_tags]
        
        # 태그 기반 컨텍스트 미리보기
        contexts = collect_context_from_tags(db, tag_ids, current_user.id)
        
        return {
            "query": query,
            "keywords_extracted": keywords,
            "related_tags": related_tags,
            "context_preview": [
                {"id": ctx["id"], "title": ctx["title"], "relevance": ctx["relevance"]}
                for ctx in contexts
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"쿼리 분석 중 오류가 발생했습니다: {str(e)}"
        )
