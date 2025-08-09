# 통합 콘텐츠 시스템 테스트 안내서

이 문서는 TaggingBox의 '통합 콘텐츠' 시스템에 대한 테스트 실행 방법과 테스트 시나리오를 설명합니다.

## 테스트 준비

1. 필수 패키지 설치:
   ```bash
   cd /Users/seungmin/Desktop/tb-hub-clean/backend
   pip install -r requirements.txt
   ```

2. 테스트 데이터베이스 설정:
   - PostgreSQL이 실행 중인지 확인하세요.
   - 기본 설정은 `taggingbox_test` 데이터베이스를 사용합니다. (자동으로 생성됩니다)

## 테스트 실행 방법

### 모든 테스트 실행
```bash
cd /Users/seungmin/Desktop/tb-hub-clean/backend
python run_tests.py
```

### 개별 테스트 실행
```bash
# 콘텐츠 생성 API 테스트만 실행
pytest tests/test_content_api.py -v

# AI 엔진 연동 테스트만 실행
pytest tests/test_ai_engine_api.py -v
```

## 테스트 시나리오

### 1. 통합 콘텐츠 생성 API 테스트

#### 1.1 성공 시나리오 (Happy Path)
- 텍스트, HTML, 마크다운, 태그, 파일을 포함한 요청 처리
- 모든 데이터가 정확히 저장되는지 확인
- 파일이 물리적으로 업로드되었는지 확인

#### 1.2 트랜잭션 롤백 시나리오
- 파일 업로드 후 DB 저장 중 에러 발생
- 모든 데이터가 롤백되었는지 확인
- 업로드된 파일이 삭제되었는지 확인

### 2. AI 엔진 연동 테스트

- 태그 추천 API가 외부 AI 엔진과 올바르게 연동되는지 확인
- 외부 AI 엔진의 응답이 클라이언트에게 정확히 전달되는지 확인

## 테스트 결과 해석

테스트 실행 후 다음과 같은 결과가 표시됩니다:

- `Pass`: 테스트 성공
- `Fail`: 테스트 실패

모든 테스트가 성공하면 "All tests PASSED" 메시지가 표시됩니다.

## 문제 해결

1. 데이터베이스 연결 오류:
   - PostgreSQL이 실행 중인지 확인
   - `.env` 파일의 데이터베이스 설정 확인

2. 파일 업로드 관련 오류:
   - `LOCAL_STORAGE_PATH` 디렉토리가 존재하고 쓰기 권한이 있는지 확인

3. AI 엔진 모킹 관련 오류:
   - `pytest-mock` 패키지가 설치되었는지 확인
