import logging
import httpx
from typing import Dict, List, Optional, Any

from ..core.config import settings

logger = logging.getLogger(__name__)

class TBEngineService:
    """
    TB Engine API 서비스 클래스
    TB Mini API를 활용하여 태그 추천 및 RAG 검색 기능을 제공합니다.
    """
    def __init__(self):
        self.base_url = settings.TB_ENGINE_API_URL
        self.api_key = settings.TB_ENGINE_API_KEY
        self.timeout = 10.0  # 10초 타임아웃
        
    async def recommend_tags(self, content: str, max_tags: int = 10) -> Dict[str, Any]:
        """
        TB Engine API를 호출하여 콘텐츠에서 태그를 추천받습니다.
        
        Args:
            content: 분석할 텍스트 컨텐츠
            max_tags: 최대 태그 개수
            
        Returns:
            태그 추천 결과 (태그 목록 등)
        """
        try:
            # API 엔드포인트 설정 (TB Mini 문서 기반)
            endpoint = "/sdk_api/v1/tag/recommend"
            
            # 요청 데이터 구성
            data = {
                "content": content,
                "max_tags": max_tags
            }
            
            # API 헤더 구성
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # API 호출
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}{endpoint}", 
                    json=data,
                    headers=headers
                )
                
                # 응답 상태 코드 확인
                response.raise_for_status()
                
                # JSON 응답 파싱
                result = response.json()
                
                # 응답 로깅 (태그 수만)
                tag_count = len(result.get("tags", []))
                logger.info(f"TB Engine tag recommendation successful: {tag_count} tags returned")
                
                # 태그 변환 및 반환
                return {
                    "tags": [
                        {"name": tag.get("name", ""), "score": tag.get("score", 0.0)}
                        for tag in result.get("tags", [])
                    ]
                }
                
        except httpx.TimeoutException:
            logger.error("TB Engine API timeout after %s seconds", self.timeout)
            return self._get_fallback_tags()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"TB Engine API HTTP error: {e.response.status_code} - {e.response.text}")
            return self._get_fallback_tags()
            
        except Exception as e:
            logger.error(f"Unexpected error in TB Engine tag recommendation: {str(e)}")
            return self._get_fallback_tags()
    
    async def search_content(self, query: str, max_results: int = 20, include_tags: List[str] = None) -> Dict[str, Any]:
        """
        TB Engine RAG 검색 API를 호출하여 콘텐츠를 검색합니다.
        
        Args:
            query: 검색 쿼리
            max_results: 최대 결과 수
            include_tags: 포함할 태그 목록
            
        Returns:
            검색 결과
        """
        try:
            # API 엔드포인트 설정
            endpoint = "/sdk_api/v1/rag/search"
            
            # 요청 데이터 구성
            data = {
                "query": query,
                "max_results": max_results
            }
            
            # 태그 필터 추가
            if include_tags and len(include_tags) > 0:
                data["include_tags"] = include_tags
                
            # API 헤더 구성
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # API 호출
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}{endpoint}", 
                    json=data,
                    headers=headers
                )
                
                # 응답 상태 코드 확인
                response.raise_for_status()
                
                # JSON 응답 파싱
                result = response.json()
                
                # 응답 로깅
                result_count = len(result.get("results", []))
                logger.info(f"TB Engine search successful: {result_count} results found")
                
                # 검색 결과 변환 및 반환
                return {
                    "results": result.get("results", []),
                    "total_count": result.get("total_count", 0),
                    "page": result.get("page", 1),
                    "total_pages": result.get("total_pages", 1)
                }
                
        except httpx.TimeoutException:
            logger.error("TB Engine search API timeout after %s seconds", self.timeout)
            return self._get_fallback_search_results()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"TB Engine search API HTTP error: {e.response.status_code} - {e.response.text}")
            return self._get_fallback_search_results()
            
        except Exception as e:
            logger.error(f"Unexpected error in TB Engine search: {str(e)}")
            return self._get_fallback_search_results()
    
    def _get_fallback_tags(self) -> Dict[str, Any]:
        """API 호출 실패 시 폴백 태그 목록 반환"""
        return {
            "tags": [
                {"name": "TB", "score": 0.95},
                {"name": "태그", "score": 0.85},
                {"name": "fallback", "score": 0.75}
            ]
        }
    
    def _get_fallback_search_results(self) -> Dict[str, Any]:
        """API 호출 실패 시 폴백 검색 결과 반환"""
        return {
            "results": [],
            "total_count": 0,
            "page": 1,
            "total_pages": 1
        }

# 서비스 인스턴스 생성
tb_engine_service = TBEngineService()
