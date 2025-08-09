from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from ...schemas.analysis import (
    TagRecommendationRequest,
    TagRecommendationResponse,
    SearchRequest,
    SearchResponse
)
from ...services.analysis_service import analysis_service
from ...auth import get_current_user
from ...schemas.user import User

router = APIRouter(
    prefix="/api/analysis",
    tags=["analysis"],
    responses={404: {"description": "Not found"}},
)

@router.post("/recommend-tags", response_model=TagRecommendationResponse)
async def recommend_tags(
    request: TagRecommendationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Recommends tags based on content.
    """
    try:
        result = await analysis_service.recommend_tags(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tag recommendations: {str(e)}"
        )

@router.post("/search", response_model=SearchResponse)
async def search_content(
    request: SearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Search for content based on query and optional tags.
    """
    try:
        result = await analysis_service.search_content(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search content: {str(e)}"
        )
