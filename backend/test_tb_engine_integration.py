#!/usr/bin/env python
"""
TB Engine API 통합 테스트 스크립트
실제 API를 호출하여 테스트합니다.
"""
import os
import sys
import asyncio
import json
from datetime import datetime

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
    
    try:
        # TB Engine 서비스의 recommend_tags 메서드 호출
        start_time = datetime.now()
        result = await tb_engine_service.recommend_tags(test_content, max_tags=10)
        end_time = datetime.now()
        
        # 결과 검증
        assert "tags" in result, "결과에 tags가 없습니다."
        assert len(result["tags"]) > 0, "태그가 반환되지 않았습니다."
        
        # 결과 출력
        print(f"⏱️ 응답 시간: {(end_time - start_time).total_seconds():.2f}초")
        print(f"📊 반환된 태그 수: {len(result['tags'])}")
        print("📋 상위 5개 태그:")
        for i, tag in enumerate(result["tags"][:5]):
            print(f"   {i+1}. {tag['name']} ({tag['score']:.2f})")
        
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
    
    try:
        # TB Engine 서비스의 search_content 메서드 호출
        start_time = datetime.now()
        result = await tb_engine_service.search_content(
            query=test_query,
            max_results=5,
            include_tags=test_include_tags
        )
        end_time = datetime.now()
        
        # 결과 검증
        assert "results" in result, "결과에 results가 없습니다."
        
        # 결과 출력
        print(f"⏱️ 응답 시간: {(end_time - start_time).total_seconds():.2f}초")
        print(f"📊 검색 결과 수: {len(result['results'])}")
        print(f"📊 총 결과 수: {result.get('total_count', 0)}")
        
        if result.get("results"):
            print("📋 상위 검색 결과:")
            for i, item in enumerate(result["results"][:3]):
                print(f"   {i+1}. {item.get('title', 'No Title')} (스코어: {item.get('score', 0):.2f})")
                print(f"      태그: {', '.join(item.get('tags', []))}")
                excerpt = item.get('excerpt', '')
                if len(excerpt) > 100:
                    excerpt = excerpt[:100] + "..."
                print(f"      내용: {excerpt}")
        
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
    
    # 잠시 API URL을 잘못된 값으로 변경
    original_url = tb_engine_service.base_url
    tb_engine_service.base_url = "http://invalid-url-that-doesnt-exist.com"
    
    try:
        # TB Engine 서비스의 recommend_tags 메서드 호출
        result = await tb_engine_service.recommend_tags(test_content, max_tags=5)
        
        # 폴백 결과 검증
        assert "tags" in result, "결과에 tags가 없습니다."
        assert len(result["tags"]) == 3, f"폴백 태그 수가 예상과 다릅니다. 예상: 3, 실제: {len(result['tags'])}"
        assert result["tags"][0]["name"] == "TB", f"첫 번째 폴백 태그가 예상과 다릅니다. 예상: TB, 실제: {result['tags'][0]['name']}"
        
        # 결과 출력
        print("📋 폴백 태그:")
        for i, tag in enumerate(result["tags"]):
            print(f"   {i+1}. {tag['name']} ({tag['score']:.2f})")
        
        print("✅ API 오류 처리 테스트 성공")
        return True
    except AssertionError as e:
        print(f"❌ 테스트 실패: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        return False
    finally:
        # API URL 복원
        tb_engine_service.base_url = original_url

async def run_tests():
    """모든 테스트 실행"""
    print("🚀 TB Engine API 테스트 시작...\n")
    print(f"📌 API URL: {tb_engine_service.base_url}")
    print(f"📌 API 키: {'설정됨' if tb_engine_service.api_key else '설정되지 않음'}\n")
    
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
