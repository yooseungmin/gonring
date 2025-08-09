"""
테스트 케이스 2: 외부 AI 엔진 API 연동 테스트
"""
import pytest
import json
import uuid
from unittest.mock import patch, MagicMock

from tests.conftest import client, setup_test_db, clean_test_data

# Create a mock for the AIEngineClient
class MockResponse:
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self.json_data = json_data
        self.text = json.dumps(json_data)
    
    def json(self):
        return self.json_data

# Create the AI Engine utility module if it doesn't exist
@pytest.fixture(scope="module")
def create_ai_engine_module():
    # Create AI engine utility file if it doesn't exist yet
    try:
        import app.utils.ai_engine
    except ImportError:
        # Define AIEngineClient class
        code = """
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status

class AIEngineClient:
    """AI 엔진과 연동하기 위한 클라이언트"""
    
    BASE_URL = "https://api.textway-ai.example.com"  # Replace with actual AI engine URL
    API_KEY = None  # Should be loaded from environment or settings
    
    @classmethod
    async def check_engine_health(cls) -> bool:
        """AI 엔진 상태 확인"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{cls.BASE_URL}/health",
                    headers=cls._get_headers(),
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception:
            return False
    
    @classmethod
    async def recommend_tags(
        cls, 
        text_content: str, 
        html_content: Optional[str] = None, 
        max_tags: int = 6
    ) -> List[Dict[str, Any]]:
        """
        콘텐츠 분석하여 태그 추천
        
        Returns:
            List[Dict[str, Any]]: List of tag objects with name and relevance score
        """
        try:
            payload = {
                "text_content": text_content,
                "html_content": html_content,
                "max_tags": max_tags
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{cls.BASE_URL}/analyze/tags",
                    headers=cls._get_headers(),
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"AI Engine returned an error: {response.text}"
                    )
                
                result = response.json()
                return result.get("tags", [])
                
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI Engine request timed out"
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to AI Engine: {str(e)}"
            )
    
    @classmethod
    async def search_content(
        cls,
        query: str,
        content_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        콘텐츠 검색
        
        Args:
            query: Search query string
            content_data: User's content data to search through
            
        Returns:
            Dict containing search results and message
        """
        try:
            payload = {
                "query": query,
                "content": content_data
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{cls.BASE_URL}/search",
                    headers=cls._get_headers(),
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"AI Engine returned an error: {response.text}"
                    )
                
                return response.json()
                
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI Engine request timed out"
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to AI Engine: {str(e)}"
            )
    
    @classmethod
    def _get_headers(cls) -> Dict[str, str]:
        """API 요청 헤더 생성"""
        headers = {
            "Content-Type": "application/json",
        }
        
        if cls.API_KEY:
            headers["Authorization"] = f"Bearer {cls.API_KEY}"
            
        return headers
"""
        
        # Create the directory if it doesn't exist
        import os
        os.makedirs("app/utils", exist_ok=True)
        
        # Save the code
        with open("app/utils/ai_engine.py", "w") as f:
            f.write(code)

@pytest.mark.usefixtures("setup_test_db", "create_ai_engine_module")
class TestAIEngineIntegration:
    """외부 AI 엔진 API 연동에 대한 테스트"""
    
    @patch('app.utils.ai_engine.httpx.AsyncClient')
    def test_tag_recommendation(self, mock_client):
        """
        태그 추천 API 테스트:
        - 텍스트 데이터로 AI 엔진에 태그 추천 요청
        - AI 엔진의 응답을 클라이언트에 전달
        """
        # Mock the AI engine response
        mock_async_client = MagicMock()
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        # Sample response from AI engine
        mock_response = MockResponse(200, {
            "tags": [
                {"name": "artificial intelligence", "relevance_score": "0.95"},
                {"name": "machine learning", "relevance_score": "0.89"},
                {"name": "data science", "relevance_score": "0.78"},
                {"name": "neural networks", "relevance_score": "0.75"},
                {"name": "deep learning", "relevance_score": "0.72"},
                {"name": "technology", "relevance_score": "0.65"}
            ]
        })
        
        mock_async_client.post.return_value = mock_response
        
        # Test data
        request_data = {
            "text_content": "Artificial intelligence is transforming how we interact with technology. Machine learning models can analyze data and make predictions.",
            "max_tags": 6
        }
        
        # Send request to our API
        response = client.post(
            "/api/v1/ai/recommend-tags",
            json=request_data
        )
        
        # Test results
        test_results = {
            "API response is successful": False,
            "AI engine was called with correct parameters": False,
            "API returned AI engine's response": False
        }
        
        # Check response
        print(f"Tag API Response Status: {response.status_code}")
        print(f"Tag API Response Body: {response.json() if response.status_code < 400 else response.text}")
        
        # 1. API response is successful
        if response.status_code == 200:
            test_results["API response is successful"] = True
        
        # 2. AI engine was called with correct parameters
        mock_call_args = mock_async_client.post.call_args
        if mock_call_args:
            _, kwargs = mock_call_args
            json_data = kwargs.get('json', {})
            if (json_data.get('text_content') == request_data['text_content'] and 
                json_data.get('max_tags') == request_data['max_tags']):
                test_results["AI engine was called with correct parameters"] = True
        
        # 3. API returned AI engine's response
        if response.status_code == 200:
            api_tags = response.json().get('tags', [])
            mock_tags = mock_response.json_data.get('tags', [])
            if len(api_tags) == len(mock_tags) and all(
                api_tag['name'] == mock_tag['name'] 
                for api_tag, mock_tag in zip(api_tags, mock_tags)
            ):
                test_results["API returned AI engine's response"] = True
        
        # Print test results
        print("\n=== TEST RESULTS: AI Engine Tag Recommendation ===")
        for test_name, result in test_results.items():
            status = "Pass" if result else "Fail"
            print(f"{test_name}: {status}")
        
        # Assert all tests passed
        assert all(test_results.values()), "Not all AI Engine tests passed"
