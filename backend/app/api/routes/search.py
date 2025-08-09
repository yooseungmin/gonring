from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import random

from app.schemas.search import SearchQuery, SearchResponse, SearchResultItem, TagCloudResponse, TagCloudItem
from app.models.content import Content
from app.models.box import Box
from app.models.tag import Tag
from app.models.user import User
from app.database import get_db
from app.auth import get_current_user

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search_contents(
    query: SearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    컨텐츠 검색 API
    - 키워드 검색 (제목, 본문)
    - 태그 기반 필터링
    - 특정 박스 내 검색
    - 정렬 및 페이지네이션
    """
    # 실제 데이터베이스에서는 여기서 쿼리를 구성하여 검색 결과를 가져옵니다.
    # 현재는 목업 데이터로 검색 기능을 시뮬레이션합니다.

    # 페이지네이션 계산
    skip = (query.page - 1) * query.limit
    
    # 목업 검색 결과 생성
    mock_results = []
    total_results = random.randint(5, 30)  # 랜덤한 총 결과 수
    
    # 태그 목록 생성
    available_tags = [
        {"id": "tag1", "name": "연구방법론", "count": 15},
        {"id": "tag2", "name": "데이터분석", "count": 23},
        {"id": "tag3", "name": "인공지능", "count": 18},
        {"id": "tag4", "name": "머신러닝", "count": 12},
        {"id": "tag5", "name": "논문요약", "count": 8},
        {"id": "tag6", "name": "학습노트", "count": 20},
        {"id": "tag7", "name": "프로젝트", "count": 14},
        {"id": "tag8", "name": "실험결과", "count": 9},
        {"id": "tag9", "name": "참고문헌", "count": 7},
        {"id": "tag10", "name": "리뷰", "count": 11}
    ]
    
    # 각 결과에 사용할 태그 선택
    for i in range(min(query.limit, total_results - skip)):
        # 각 결과에 2-4개의 랜덤 태그 할당
        num_tags = random.randint(2, 4)
        selected_tags = random.sample(available_tags, num_tags)
        
        # 검색어가 있으면 미리보기 텍스트에 하이라이팅
        preview_text = "이 콘텐츠는 연구 프로젝트에 관한 내용을 담고 있습니다. 데이터 분석 결과와 관련 논문 참고자료가 포함되어 있습니다."
        if query.keyword:
            # 실제로는 더 정교한 하이라이팅 로직이 필요합니다
            preview_text = preview_text.replace(query.keyword, f"<mark>{query.keyword}</mark>")
        
        # 태그 필터링 적용
        if query.tags and not any(tag["name"] in query.tags for tag in selected_tags):
            continue
            
        # 박스 필터링
        if query.box_id and f"box{i % 5 + 1}" != query.box_id:
            continue
            
        # 검색 결과 아이템 생성
        mock_results.append(
            SearchResultItem(
                id=f"content{i + skip + 1}",
                title=f"연구 콘텐츠 {i + skip + 1}: {''.join(random.sample([t['name'] for t in selected_tags], min(2, len(selected_tags))))}",
                text_preview=preview_text,
                created_at=datetime.now() - timedelta(days=random.randint(1, 30)),
                updated_at=datetime.now() - timedelta(days=random.randint(0, 10)),
                tags=selected_tags,
                box_id=f"box{i % 5 + 1}",
                box_name=f"연구 박스 {i % 5 + 1}",
                relevance_score=random.uniform(0.6, 0.99)
            )
        )
    
    # 정렬 적용
    if query.sort_by == "created_at":
        mock_results.sort(key=lambda x: x.created_at, reverse=(query.sort_order == "desc"))
    elif query.sort_by == "updated_at":
        mock_results.sort(key=lambda x: x.updated_at or datetime.min, reverse=(query.sort_order == "desc"))
    else:  # relevance
        mock_results.sort(key=lambda x: x.relevance_score or 0, reverse=True)
    
    # 검색 응답 생성
    response = SearchResponse(
        items=mock_results,
        total=total_results,
        page=query.page,
        limit=query.limit,
        has_more=(skip + len(mock_results)) < total_results
    )
    
    return response


@router.get("/tags/cloud", response_model=TagCloudResponse)
async def get_tag_cloud(
    limit: int = Query(20, description="태그 클라우드에 표시할 최대 태그 수"),
    box_id: Optional[str] = Query(None, description="특정 박스의 태그만 표시"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    태그 클라우드 API
    - 사용 빈도가 높은 태그 목록을 반환
    - 특정 박스 내 태그로 필터링 가능
    """
    # 목업 태그 클라우드 데이터
    mock_tags = [
        TagCloudItem(id="tag1", name="연구방법론", count=15),
        TagCloudItem(id="tag2", name="데이터분석", count=23),
        TagCloudItem(id="tag3", name="인공지능", count=18),
        TagCloudItem(id="tag4", name="머신러닝", count=12),
        TagCloudItem(id="tag5", name="논문요약", count=8),
        TagCloudItem(id="tag6", name="학습노트", count=20),
        TagCloudItem(id="tag7", name="프로젝트", count=14),
        TagCloudItem(id="tag8", name="실험결과", count=9),
        TagCloudItem(id="tag9", name="참고문헌", count=7),
        TagCloudItem(id="tag10", name="리뷰", count=11),
        TagCloudItem(id="tag11", name="딥러닝", count=16),
        TagCloudItem(id="tag12", name="논문작성", count=13),
        TagCloudItem(id="tag13", name="학회발표", count=6),
        TagCloudItem(id="tag14", name="연구계획", count=19),
        TagCloudItem(id="tag15", name="통계분석", count=17)
    ]
    
    # 박스 필터링 (실제로는 데이터베이스 쿼리)
    if box_id:
        # 목업: 랜덤하게 일부 태그만 선택
        filtered_tags = random.sample(mock_tags, min(limit, len(mock_tags) // 2))
    else:
        # 사용 빈도순 정렬
        filtered_tags = sorted(mock_tags, key=lambda x: x.count, reverse=True)[:limit]
    
    return TagCloudResponse(tags=filtered_tags)


@router.get("/tags/related/{tag_name}", response_model=List[TagCloudItem])
async def get_related_tags(
    tag_name: str,
    limit: int = Query(10, description="반환할 관련 태그 최대 수"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    관련 태그 API
    - 특정 태그와 함께 자주 사용되는 태그 목록 반환
    """
    # 목업 관련 태그 (실제로는 데이터베이스에서 태그 상관관계 분석)
    related_tag_map = {
        "연구방법론": ["통계분석", "실험설계", "데이터수집", "질적연구"],
        "데이터분석": ["통계분석", "머신러닝", "시각화", "데이터전처리", "R", "Python"],
        "인공지능": ["머신러닝", "딥러닝", "자연어처리", "컴퓨터비전", "강화학습"],
        "머신러닝": ["인공지능", "지도학습", "비지도학습", "모델평가", "파라미터튜닝"],
        "논문요약": ["논문리뷰", "연구동향", "문헌조사", "핵심개념"],
        "학습노트": ["수업내용", "실습", "퀴즈", "과제"],
        "프로젝트": ["팀워크", "일정관리", "요구사항", "설계", "구현"],
    }
    
    # 입력된 태그에 대한 관련 태그가 있는지 확인
    if tag_name in related_tag_map:
        related_names = related_tag_map[tag_name]
    else:
        # 기본 태그 목록에서 랜덤 선택
        base_tags = ["연구방법론", "데이터분석", "인공지능", "머신러닝", "논문요약"]
        related_names = random.sample(base_tags, min(limit, len(base_tags)))
    
    # 관련 태그 아이템 생성
    related_tags = [
        TagCloudItem(
            id=f"related_tag_{i}",
            name=name,
            count=random.randint(5, 25)
        )
        for i, name in enumerate(related_names[:limit])
    ]
    
    return related_tags
