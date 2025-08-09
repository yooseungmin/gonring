from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.schemas.content import (
    ContentCreate, ContentUpdate, Content, ContentBrief,
    TagRecommendRequest, TagRecommendResponse
)
from app.schemas.tag import TagCreate, Tag
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.content import Content as ContentModel
from app.models.tag import Tag as TagModel
from app.models.box import Box as BoxModel
from app.services.analysis_service import get_tag_recommendations

router = APIRouter()

@router.post("/{box_id}/contents", response_model=Content)
def create_content(
    box_id: str,
    content_create: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    새로운 콘텐츠 생성
    """
    # 박스가 존재하는지 확인
    box = db.query(BoxModel).filter(
        BoxModel.id == box_id,
        BoxModel.user_id == current_user.id
    ).first()
    
    if not box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Box를 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # 콘텐츠 생성
    new_content = ContentModel(
        id=str(uuid.uuid4()),
        title=content_create.title,
        text_content=content_create.text_content,
        markdown_content=content_create.markdown_content,
        html_content=content_create.html_content,
        url=content_create.url,
        box_id=box_id,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_content)
    
    # 태그 처리
    tags = []
    if content_create.tags:
        for tag_create in content_create.tags:
            new_tag = TagModel(
                id=str(uuid.uuid4()),
                name=tag_create.name,
                scope=tag_create.scope or "default",
                score=tag_create.score,
                content_id=new_content.id,
                user_id=current_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_tag)
            tags.append(new_tag)
    
    # 박스의 콘텐츠 카운트 증가
    box.content_count += 1
    
    db.commit()
    db.refresh(new_content)
    
    # 응답 데이터 구성
    response_data = Content(
        id=new_content.id,
        title=new_content.title,
        text_content=new_content.text_content,
        markdown_content=new_content.markdown_content,
        html_content=new_content.html_content,
        url=new_content.url,
        box_id=new_content.box_id,
        user_id=new_content.user_id,
        created_at=new_content.created_at,
        updated_at=new_content.updated_at,
        tags=[
            Tag(
                id=tag.id,
                name=tag.name,
                scope=tag.scope,
                score=tag.score,
                content_id=tag.content_id,
                user_id=tag.user_id,
                created_at=tag.created_at,
                updated_at=tag.updated_at
            ) for tag in tags
        ]
    )
    
    return response_data


@router.get("/{box_id}/contents", response_model=List[ContentBrief])
def get_box_contents(
    box_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    박스 내 콘텐츠 목록 조회
    """
    # 박스가 존재하는지 확인
    box = db.query(BoxModel).filter(
        BoxModel.id == box_id,
        (BoxModel.user_id == current_user.id) | (BoxModel.is_public == True)
    ).first()
    
    if not box:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Box를 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # 콘텐츠 목록 조회
    contents = db.query(ContentModel).filter(
        ContentModel.box_id == box_id
    ).order_by(ContentModel.created_at.desc()).offset(skip).limit(limit).all()
    
    # 각 콘텐츠의 태그 수 계산
    result = []
    for content in contents:
        tag_count = db.query(TagModel).filter(TagModel.content_id == content.id).count()
        
        # 텍스트 미리보기 생성 (최대 100자)
        text_preview = content.text_content[:100] + "..." if len(content.text_content) > 100 else content.text_content
        
        result.append(ContentBrief(
            id=content.id,
            title=content.title,
            text_preview=text_preview,
            created_at=content.created_at,
            updated_at=content.updated_at,
            tag_count=tag_count
        ))
    
    return result


@router.get("/contents/{content_id}", response_model=Content)
def get_content(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    특정 콘텐츠 상세 조회
    """
    # 콘텐츠 조회
    content = db.query(ContentModel).filter(ContentModel.id == content_id).first()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="콘텐츠를 찾을 수 없습니다."
        )
    
    # 접근 권한 확인
    if content.user_id != current_user.id:
        # 해당 박스가 공개 박스인지 확인
        box = db.query(BoxModel).filter(BoxModel.id == content.box_id).first()
        if not box or not box.is_public:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 콘텐츠에 접근할 권한이 없습니다."
            )
    
    # 태그 조회
    tags = db.query(TagModel).filter(TagModel.content_id == content_id).all()
    
    # 응답 데이터 구성
    response_data = Content(
        id=content.id,
        title=content.title,
        text_content=content.text_content,
        markdown_content=content.markdown_content,
        html_content=content.html_content,
        url=content.url,
        box_id=content.box_id,
        user_id=content.user_id,
        created_at=content.created_at,
        updated_at=content.updated_at,
        tags=[
            Tag(
                id=tag.id,
                name=tag.name,
                scope=tag.scope,
                score=tag.score,
                content_id=tag.content_id,
                user_id=tag.user_id,
                created_at=tag.created_at,
                updated_at=tag.updated_at
            ) for tag in tags
        ]
    )
    
    return response_data


@router.put("/contents/{content_id}", response_model=Content)
def update_content(
    content_id: str,
    content_update: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    콘텐츠 업데이트
    """
    # 콘텐츠 조회
    content = db.query(ContentModel).filter(
        ContentModel.id == content_id,
        ContentModel.user_id == current_user.id
    ).first()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="콘텐츠를 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # 업데이트할 필드 설정
    update_data = content_update.dict(exclude_unset=True)
    if "tags" in update_data:
        del update_data["tags"]  # tags는 별도로 처리
    
    # 콘텐츠 업데이트
    for key, value in update_data.items():
        setattr(content, key, value)
    
    content.updated_at = datetime.utcnow()
    
    # 태그 처리
    if content_update.tags is not None:
        # 기존 태그 삭제
        db.query(TagModel).filter(TagModel.content_id == content_id).delete()
        
        # 새 태그 추가
        tags = []
        for tag_create in content_update.tags:
            new_tag = TagModel(
                id=str(uuid.uuid4()),
                name=tag_create.name,
                scope=tag_create.scope or "default",
                score=tag_create.score,
                content_id=content.id,
                user_id=current_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_tag)
            tags.append(new_tag)
    else:
        # 태그 업데이트가 없는 경우 기존 태그 조회
        tags = db.query(TagModel).filter(TagModel.content_id == content_id).all()
    
    db.commit()
    db.refresh(content)
    
    # 응답 데이터 구성
    response_data = Content(
        id=content.id,
        title=content.title,
        text_content=content.text_content,
        markdown_content=content.markdown_content,
        html_content=content.html_content,
        url=content.url,
        box_id=content.box_id,
        user_id=content.user_id,
        created_at=content.created_at,
        updated_at=content.updated_at,
        tags=[
            Tag(
                id=tag.id,
                name=tag.name,
                scope=tag.scope,
                score=tag.score,
                content_id=tag.content_id,
                user_id=tag.user_id,
                created_at=tag.created_at,
                updated_at=tag.updated_at
            ) for tag in tags
        ]
    )
    
    return response_data


@router.delete("/contents/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(
    content_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    콘텐츠 삭제
    """
    # 콘텐츠 조회
    content = db.query(ContentModel).filter(
        ContentModel.id == content_id,
        ContentModel.user_id == current_user.id
    ).first()
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="콘텐츠를 찾을 수 없거나 접근 권한이 없습니다."
        )
    
    # 박스 정보 조회 (콘텐츠 카운트 감소 목적)
    box = db.query(BoxModel).filter(BoxModel.id == content.box_id).first()
    
    # 태그 삭제
    db.query(TagModel).filter(TagModel.content_id == content_id).delete()
    
    # 콘텐츠 삭제
    db.delete(content)
    
    # 박스의 콘텐츠 카운트 감소
    if box and box.content_count > 0:
        box.content_count -= 1
    
    db.commit()
    
    return None


@router.post("/recommend-tags", response_model=TagRecommendResponse)
def recommend_tags(
    request: TagRecommendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    텍스트 분석을 통한 태그 추천
    """
    # TB 엔진 연동
    recommended_tags = get_tag_recommendations(
        text=request.text,
        count=request.count,
        min_score=request.min_score
    )
    
    tag_creates = []
    for tag in recommended_tags.get("tags", []):
        tag_creates.append(TagCreate(
            name=tag["name"],
            scope="recommended",
            score=tag.get("score", 0.0)
        ))
    
    return TagRecommendResponse(
        tags=tag_creates,
        analysis=recommended_tags.get("analysis")
    )
