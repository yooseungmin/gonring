#!/usr/bin/env python
"""
TB Engine API 서비스 테스트 스크립트
pytest 의존성 없이 직접 실행 가능
"""
import os
import sys
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock

# 필요한 환경 변수 설정
os.environ["TB_ENGINE_API_URL"] = "http://module.tbmini.im:8080/api/v1"
os.environ["TB_ENGINE_API_KEY"] = "devteam_access_token_2025"

# 상위 디렉토리를 import path에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# TB Engine 서비스 import
from app.services.tb_engine_service import tb_engine_service

async def test_recommend_tags():
    """TB Engine의 태그 추천 API 테스트"""
    print("\n🧪 태그 추천 API 테스트 실행 중...")
    
    # 테스트용 콘텐츠
    test_content = """
    머신러닝을 활용한 자연어 처리 연구에서 BERT와 GPT 모델의 성능을 비교 분석하였다.
    특히 토큰화 방식과 attention 메커니즘의 차이가 다양한 태스크에서 어떤 영향을 미치는지 살펴보았다.
    실험 결과, 특정 도메인에 특화된 태스크에서는 추가 학습을 통한 성능 향상이 가능함을 확인하였다.
    """
    
    # Mock Response 설정
    mock_response = {
        "tags": [
            {"name": "머신러닝", "score": 0.95},
            {"name": "자연어처리", "score": 0.92},
            {"name": "BERT", "score": 0.89},
            {"name": "GPT", "score": 0.87},
            {"name": "딥러닝", "score": 0.85},
            {"name": "토큰화", "score": 0.82},
            {"name": "어텐션", "score": 0.79}
        ]
    }
    
    # httpx.AsyncClient를 모킹
    mock_client = AsyncMock()
    mock_response_obj = AsyncMock()
    mock_response_obj.status_code = 200
    mock_response_obj.json.return_value = mock_response
    mock_response_obj.raise_for_status = AsyncMock()
    
    mock_client.post.return_value = mock_response_obj
    
    # AsyncClient 생성자를 패치하여 mock_client를 반환하도록 설정
    with patch('httpx.AsyncClient') as MockClient:
        MockClient.return_value.__aenter__.return_value = mock_client
        
        try:
            # TB Engine 서비스의 recommend_tags 메서드 호출
            result = await tb_engine_service.recommend_tags(test_content, max_tags=10)
            
            # 결과 검증
            assert "tags" in result, "결과에 tags가 없습니다."
            assert len(result["tags"]) == 7, f"태그 수가 예상과 다릅니다. 예상: 7, 실제: {len(result['tags'])}"
            assert result["tags"][0]["name"] == "머신러닝", f"첫 번째 태그가 예상과 다릅니다. 예상: 머신러닝, 실제: {result['tags'][0]['name']}"
            
            # API 호출 검증
            mock_client.post.assert_called_once()
            args, kwargs = mock_client.post.call_args
            assert kwargs["json"]["content"] == test_content
            assert kwargs["json"]["max_tags"] == 10
            
            print("✅ 태그 추천 테스트 성공")
            return True
        except AssertionError as e:
            print(f"❌ 테스트 실패: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {str(e)}")
            return False

async def test_search_content():
    """TB Engine의 RAG 검색 API 테스트"""
    print("\n🧪 콘텐츠 검색 API 테스트 실행 중...")
    
    # 테스트용 쿼리와 태그
    test_query = "머신러닝 자연어처리 기법"
    test_include_tags = ["AI", "NLP"]
    
    # Mock Response 설정
    mock_response = {
        "results": [
            {
                "id": "doc1",
                "title": "최신 자연어처리 기법 동향",
                "excerpt": "최근 BERT와 GPT 모델을 활용한 자연어처리 기법이 다양한 분야에서 적용되고 있습니다...",
                "score": 0.95,
                "tags": ["NLP", "AI", "BERT"]
            },
            {
                "id": "doc2",
                "title": "머신러닝을 활용한 언어 모델 학습",
                "excerpt": "언어 모델 학습에서 중요한 점은 데이터 전처리와 모델 파라미터의 최적화입니다...",
                "score": 0.87,
                "tags": ["AI", "머신러닝", "언어모델"]
            }
        ],
        "total_count": 2,
        "page": 1,
        "total_pages": 1
    }
    
    # httpx.AsyncClient를 모킹
    mock_client = AsyncMock()
    mock_response_obj = AsyncMock()
    mock_response_obj.status_code = 200
    mock_response_obj.json.return_value = mock_response
    mock_response_obj.raise_for_status = AsyncMock()
    
    mock_client.post.return_value = mock_response_obj
    
    # AsyncClient 생성자를 패치하여 mock_client를 반환하도록 설정
    with patch('httpx.AsyncClient') as MockClient:
        MockClient.return_value.__aenter__.return_value = mock_client
        
        try:
            # TB Engine 서비스의 search_content 메서드 호출
            result = await tb_engine_service.search_content(
                query=test_query,
                max_results=20,
                include_tags=test_include_tags
            )
            
            # 결과 검증
            assert "results" in result, "결과에 results가 없습니다."
            assert len(result["results"]) == 2, f"결과 수가 예상과 다릅니다. 예상: 2, 실제: {len(result['results'])}"
            assert result["results"][0]["title"] == "최신 자연어처리 기법 동향", f"첫 번째 결과의 제목이 예상과 다릅니다."
            
            # API 호출 검증
            mock_client.post.assert_called_once()
            args, kwargs = mock_client.post.call_args
            assert kwargs["json"]["query"] == test_query
            assert kwargs["json"]["include_tags"] == test_include_tags
            
            print("✅ 콘텐츠 검색 테스트 성공")
            return True
        except AssertionError as e:
            print(f"❌ 테스트 실패: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {str(e)}")
            return False

async def test_api_error_handling():
    """TB Engine API 오류 시 폴백 동작 테스트"""
    print("\n🧪 API 오류 처리 테스트 실행 중...")
    
    # 테스트용 콘텐츠
    test_content = "짧은 텍스트"
    
    # 오류를 발생시키는 mock 클라이언트 생성
    mock_client = AsyncMock()
    mock_client.post.side_effect = Exception("API 연결 오류")
    
    # AsyncClient 생성자를 패치
    with patch('httpx.AsyncClient') as MockClient:
        MockClient.return_value.__aenter__.return_value = mock_client
        
        try:
            # TB Engine 서비스의 recommend_tags 메서드 호출
            result = await tb_engine_service.recommend_tags(test_content, max_tags=5)
            
            # 폴백 결과 검증
            assert "tags" in result, "결과에 tags가 없습니다."
            assert len(result["tags"]) == 3, f"폴백 태그 수가 예상과 다릅니다. 예상: 3, 실제: {len(result['tags'])}"
            assert result["tags"][0]["name"] == "TB", f"첫 번째 폴백 태그가 예상과 다릅니다. 예상: TB, 실제: {result['tags'][0]['name']}"
            
            print("✅ API 오류 처리 테스트 성공")
            return True
        except AssertionError as e:
            print(f"❌ 테스트 실패: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ 예상치 못한 오류: {str(e)}")
            return False

async def run_tests():
    """모든 테스트 실행"""
    print("🚀 TB Engine API 테스트 시작...\n")
    
    results = []
    results.append(await test_recommend_tags())
    results.append(await test_search_content())
    results.append(await test_api_error_handling())
    
    total = len(results)
    passed = results.count(True)
    
    print(f"\n📊 테스트 결과: {passed}/{total} 성공")
    
    if all(results):
        print("\n✨ 모든 테스트 성공! TB Engine API 연동이 정상적으로 동작합니다.")
        return 0
    else:
        print("\n⚠️ 일부 테스트가 실패했습니다. 자세한 내용은 위 로그를 확인하세요.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(run_tests())
    sys.exit(exit_code)
