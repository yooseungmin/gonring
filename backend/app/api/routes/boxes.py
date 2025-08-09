from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from ...schemas.box import Box, BoxCreate, BoxUpdate, BoxInList
from ...schemas.user import User
from ...auth import get_current_user

# 목업 데이터베이스 (실제로는 DB 사용)
MOCK_BOXES = {}

router = APIRouter(
    prefix="/api/boxes",
    tags=["boxes"],
    responses={401: {"description": "Unauthorized"}},
)

@router.post("", response_model=Dict[str, Any])
async def create_box(
    box_data: BoxCreate,
    current_user: User = Depends(get_current_user)
):
    """새로운 Box 생성"""
    try:
        box_id = f"box_{uuid.uuid4()}"
        
        # 상위 Box 존재 여부 확인 (계층 구조)
        if box_data.parent_id:
            if box_data.parent_id not in MOCK_BOXES:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="상위 Box를 찾을 수 없습니다"
                )
            
            # 상위 Box 소유자 확인
            parent_box = MOCK_BOXES[box_data.parent_id]
            if parent_box["owner_id"] != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="상위 Box에 대한 권한이 없습니다"
                )
        
        # 새 Box 생성
        now = datetime.utcnow()
        new_box = {
            "id": box_id,
            "name": box_data.name,
            "description": box_data.description,
            "is_public": box_data.is_public,
            "parent_id": box_data.parent_id,
            "owner_id": current_user.id,
            "created_at": now.isoformat(),
            "updated_at": None,
            "content_count": 0,
            "child_box_count": 0
        }
        
        MOCK_BOXES[box_id] = new_box
        
        # 상위 Box가 있으면 child_box_count 증가
        if box_data.parent_id:
            MOCK_BOXES[box_data.parent_id]["child_box_count"] += 1
        
        return {
            "success": True,
            "data": new_box,
            "message": "Box가 성공적으로 생성되었습니다"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Box 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/me", response_model=Dict[str, Any])
async def get_my_boxes(
    parent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """현재 사용자의 Box 목록 가져오기"""
    try:
        # 사용자의 Box 필터링 (계층 구조 지원)
        user_boxes = [
            box for box in MOCK_BOXES.values()
            if box["owner_id"] == current_user.id and box["parent_id"] == parent_id
        ]
        
        return {
            "success": True,
            "data": user_boxes,
            "message": f"{len(user_boxes)}개의 Box를 찾았습니다"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Box 목록을 가져오는 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{box_id}", response_model=Dict[str, Any])
async def get_box(
    box_id: str = Path(..., description="가져올 Box의 ID"),
    current_user: User = Depends(get_current_user)
):
    """특정 Box 정보 가져오기"""
    try:
        if box_id not in MOCK_BOXES:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box를 찾을 수 없습니다"
            )
        
        box = MOCK_BOXES[box_id]
        
        # 비공개 Box인 경우 소유자만 접근 가능
        if not box["is_public"] and box["owner_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 Box에 접근할 권한이 없습니다"
            )
        
        return {
            "success": True,
            "data": box,
            "message": "Box 정보를 성공적으로 가져왔습니다"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Box 정보를 가져오는 중 오류가 발생했습니다: {str(e)}"
        )

@router.patch("/{box_id}", response_model=Dict[str, Any])
async def update_box(
    box_data: BoxUpdate,
    box_id: str = Path(..., description="수정할 Box의 ID"),
    current_user: User = Depends(get_current_user)
):
    """Box 정보 업데이트"""
    try:
        if box_id not in MOCK_BOXES:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box를 찾을 수 없습니다"
            )
        
        box = MOCK_BOXES[box_id]
        
        # 소유자만 수정 가능
        if box["owner_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 Box를 수정할 권한이 없습니다"
            )
        
        # 필드 업데이트
        if box_data.name is not None:
            box["name"] = box_data.name
        if box_data.description is not None:
            box["description"] = box_data.description
        if box_data.is_public is not None:
            box["is_public"] = box_data.is_public
            
        # 상위 Box 변경 (계층 구조)
        if box_data.parent_id is not None and box_data.parent_id != box["parent_id"]:
            # 기존 상위 Box의 child_box_count 감소
            if box["parent_id"]:
                MOCK_BOXES[box["parent_id"]]["child_box_count"] -= 1
                
            # 새 상위 Box가 있으면 확인 후 child_box_count 증가
            if box_data.parent_id:
                if box_data.parent_id not in MOCK_BOXES:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="상위 Box를 찾을 수 없습니다"
                    )
                
                # 자기 자신이 상위 Box가 될 수 없음
                if box_data.parent_id == box_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Box는 자기 자신을 상위 Box로 가질 수 없습니다"
                    )
                
                # 상위 Box 소유자 확인
                parent_box = MOCK_BOXES[box_data.parent_id]
                if parent_box["owner_id"] != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="상위 Box에 대한 권한이 없습니다"
                    )
                
                # 순환 참조 방지 (A → B → A)
                temp_parent_id = parent_box["parent_id"]
                while temp_parent_id:
                    if temp_parent_id == box_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="순환 참조는 허용되지 않습니다"
                        )
                    if temp_parent_id not in MOCK_BOXES:
                        break
                    temp_parent_id = MOCK_BOXES[temp_parent_id]["parent_id"]
                
                MOCK_BOXES[box_data.parent_id]["child_box_count"] += 1
            
            # 상위 Box 업데이트
            box["parent_id"] = box_data.parent_id
        
        # 업데이트 시간 기록
        box["updated_at"] = datetime.utcnow().isoformat()
        
        return {
            "success": True,
            "data": box,
            "message": "Box가 성공적으로 업데이트되었습니다"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Box 업데이트 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/{box_id}", response_model=Dict[str, Any])
async def delete_box(
    box_id: str = Path(..., description="삭제할 Box의 ID"),
    current_user: User = Depends(get_current_user)
):
    """Box 삭제"""
    try:
        if box_id not in MOCK_BOXES:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Box를 찾을 수 없습니다"
            )
        
        box = MOCK_BOXES[box_id]
        
        # 소유자만 삭제 가능
        if box["owner_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 Box를 삭제할 권한이 없습니다"
            )
        
        # 하위 Box가 있는지 확인
        if box["child_box_count"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="하위 Box가 있는 Box는 삭제할 수 없습니다. 먼저 하위 Box를 삭제하세요."
            )
        
        # Box 삭제
        del MOCK_BOXES[box_id]
        
        # 상위 Box가 있으면 child_box_count 감소
        if box["parent_id"] and box["parent_id"] in MOCK_BOXES:
            MOCK_BOXES[box["parent_id"]]["child_box_count"] -= 1
        
        return {
            "success": True,
            "data": None,
            "message": "Box가 성공적으로 삭제되었습니다"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Box 삭제 중 오류가 발생했습니다: {str(e)}"
        )
