# TB Engine API 통합 가이드

TB Engine API는 TaggingBox의 핵심 기능인 태그 추천과 검색 기능을 제공하는 외부 API 서비스입니다. 이 문서는 TB Engine API를 통합하는 방법을 설명합니다.

## 설정 방법

1. 환경 변수 설정
`.env` 파일을 생성하고 다음 환경 변수를 설정합니다:

```
TB_ENGINE_API_URL=http://module.tbmini.im:8080/api/v1
TB_ENGINE_API_KEY=your_tb_engine_api_key
```

## 주요 API 엔드포인트

TB Engine은 다음과 같은 주요 API 엔드포인트를 제공합니다:

1. **태그 추천 API**
   - 엔드포인트: `/sdk_api/v1/tag/recommend`
   - 메서드: POST
   - 요청 파라미터:
     - content: 태그 추천을 위한 텍스트 내용
     - max_tags: 최대 태그 수
   
2. **RAG 검색 API**
   - 엔드포인트: `/sdk_api/v1/rag/search`
   - 메서드: POST
   - 요청 파라미터:
     - query: 검색 쿼리
     - max_results: 최대 결과 수
     - include_tags: 포함할 태그 목록

## 오류 처리

TB Engine API 연동 시 발생할 수 있는 오류는 다음과 같습니다:

1. **시간 초과**: API 호출이 10초 이내에 응답하지 않을 경우
   - 대응: 폴백 데이터 반환

2. **인증 오류**: API 키가 잘못되었거나 만료된 경우
   - 대응: 로그에 오류 기록 및 폴백 데이터 반환
   
3. **서버 오류**: TB Engine 서버에 문제가 있는 경우
   - 대응: 로그에 오류 기록 및 폴백 데이터 반환

## 서비스 테스트

TB Engine API 연동을 테스트하려면:

```bash
# TB Engine API 연동 테스트
pytest tests/test_tb_engine_api.py

# 태그 추천 기능 테스트
pytest tests/test_tb_engine_api.py::test_recommend_tags

# 검색 기능 테스트
pytest tests/test_tb_engine_api.py::test_search_content
```
