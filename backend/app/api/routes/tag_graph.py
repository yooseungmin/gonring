from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas.tag_relationship import TagGraphData, TagGraphQueryParams
from app.services.gnn_service import (
    calculate_tag_relationships,
    get_tag_coordinates,
    get_tag_graph_data,
    update_tag_coordinates
)
from app.models.user import User

router = APIRouter()

@router.get("/graph", response_model=TagGraphData)
def get_tag_graph(
    params: TagGraphQueryParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    태그 관계도 데이터를 조회합니다.
    
    - box_id가 제공되면 해당 Box 내 태그 관계만 반환
    - user_id가 제공되면 해당 사용자의 모든 태그 관계 반환
    - 둘 다 제공되지 않으면 모든 공개 태그 관계 반환
    """
    # 사용자 권한 확인
    if params.user_id and params.user_id != current_user.id:
        # 관리자 체크 로직 필요
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 태그 그래프를 볼 권한이 없습니다."
        )
    
    # 실제 사용할 user_id 설정
    user_id = params.user_id or current_user.id
    
    # 서비스 호출
    try:
        graph_data = get_tag_graph_data(
            db=db,
            user_id=user_id,
            box_id=params.box_id,
            min_correlation=params.min_correlation,
            max_nodes=params.max_nodes,
            include_clusters=params.include_clusters
        )
        return graph_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"태그 그래프 데이터 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/graph/calculate", status_code=status.HTTP_202_ACCEPTED)
def calculate_graph(
    box_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    태그 관계를 새로 계산하는 작업을 트리거합니다.
    백그라운드 작업으로 실행되며, 계산이 완료되면 데이터베이스에 저장됩니다.
    """
    try:
        # 태그 관계 계산 서비스 호출
        calculate_tag_relationships(db=db, user_id=current_user.id, box_id=box_id)
        return {"message": "태그 관계 계산이 시작되었습니다."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"태그 관계 계산 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/coordinates", response_model=List[Dict[str, Any]])
def get_coordinates(
    box_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    태그의 3차원 좌표를 조회합니다.
    """
    try:
        coordinates = get_tag_coordinates(db=db, user_id=current_user.id, box_id=box_id)
        return coordinates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"태그 좌표 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/coordinates/update", status_code=status.HTTP_202_ACCEPTED)
def update_coordinates(
    box_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    태그의 3차원 좌표를 새로 계산하여 업데이트합니다.
    """
    try:
        update_tag_coordinates(db=db, user_id=current_user.id, box_id=box_id)
        return {"message": "태그 좌표 업데이트가 시작되었습니다."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"태그 좌표 업데이트 중 오류가 발생했습니다: {str(e)}"
        )
