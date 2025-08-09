import aiohttp
import logging
import os
import random
from typing import Dict, List, Optional, Any

from ..schemas.analysis import (
    TagRecommendationRequest, 
    TagRecommendationResponse,
    SearchRequest,
    SearchResponse
)
from .tb_engine_service import tb_engine_service

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self):
        self.base_url = os.getenv("ANALYSIS_API_URL", "http://analysis-service:8000")
        self.api_key = os.getenv("ANALYSIS_API_KEY", "")
        self.timeout = aiohttp.ClientTimeout(total=30)  # 30 seconds timeout
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a request to the analysis API"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                if method.lower() == "get":
                    async with session.get(url, headers=headers, params=data) as response:
                        response.raise_for_status()
                        return await response.json()
                elif method.lower() == "post":
                    async with session.post(url, headers=headers, json=data) as response:
                        response.raise_for_status()
                        return await response.json()
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                    
        except aiohttp.ClientResponseError as e:
            logger.error(f"Analysis API error: {e.status} - {e.message}")
            raise
        except aiohttp.ClientError as e:
            logger.error(f"Analysis API connection error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in analysis service: {str(e)}")
            raise
    
    async def recommend_tags(self, request: TagRecommendationRequest) -> TagRecommendationResponse:
        """Get tag recommendations for content"""
        try:
            # TB Engine 서비스를 통해 태그 추천 받기
            result = await tb_engine_service.recommend_tags(
                content=request.content,
                max_tags=request.max_tags
            )
            return TagRecommendationResponse(**result)
        except Exception as e:
            logger.error(f"Error getting tag recommendations: {str(e)}")
            # In case of error, return empty results instead of failing
            return TagRecommendationResponse(tags=[])
    
    async def search_content(self, request: SearchRequest) -> SearchResponse:
        """Search for content based on query and tags"""
        try:
            # TB Engine 서비스를 통해 검색 수행
            result = await tb_engine_service.search_content(
                query=request.query,
                max_results=request.max_results,
                include_tags=request.include_tags
            )
            return SearchResponse(**result)
        except Exception as e:
            logger.error(f"Error searching content: {str(e)}")
            # Return empty search results
            return SearchResponse(results=[], total_count=0, page=1, total_pages=1)

# Singleton instance to be used across the application
analysis_service = AnalysisService()

# 동기 버전의 태그 추천 함수 (non-async)
def get_tag_recommendations(text: str, count: int = 5, min_score: float = 0.1) -> Dict[str, Any]:
    """
    텍스트 분석을 통한 태그 추천 (동기 버전)
    
    TB Engine API를 동기적으로 호출하여 태그를 추천받습니다.
    """
    import httpx
    import asyncio
    from ..core.config import settings
    
    # 텍스트 길이 확인
    text_length = len(text)
    
    if text_length < 10:
        # 텍스트가 너무 짧은 경우 태그 추천 불가
        return {
            "tags": [],
            "analysis": {
                "error": "텍스트가 너무 짧습니다. 더 긴 텍스트를 입력해주세요.",
                "text_length": text_length
            }
        }
    
    # 동기 코드에서 비동기 함수 호출 처리
    try:
        # 루프 생성 및 비동기 태그 추천 함수 실행
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(tb_engine_service.recommend_tags(
            content=text,
            max_tags=count
        ))
        loop.close()
        
        # 결과에 분석 정보 추가
        if "analysis" not in result:
            result["analysis"] = {
                "text_length": text_length,
                "confidence": 0.9
            }
        
        # min_score 이상의 태그만 필터링
        result["tags"] = [tag for tag in result["tags"] if tag["score"] >= min_score]
        
        return result
        
    except Exception as e:
        logger.error(f"Synchronous tag recommendation failed: {str(e)}")
        
        # 에러 발생시 폴백 태그 반환
        fallback_tags = [
            {"name": "인공지능", "score": 0.95},
            {"name": "머신러닝", "score": 0.92},
            {"name": "데이터", "score": 0.85}
        ]
        
        return {
            "tags": fallback_tags[:count],
            "analysis": {
                "text_length": text_length,
                "confidence": 0.7,
                "note": "에러로 인한 폴백 태그 반환"
            }
        }
