# 태그 추천 및 검색 시스템 구현 가이드

이 문서는 태그 추천과 검색이 가능한 API 시스템을 구현하기 위한 단계별 가이드입니다.

## 시스템 아키텍처

이 시스템은 크게 두 부분으로 나뉩니다:

1. **백엔드 (Python FastAPI)**: 분석 모듈을 중계하는 API 서버
2. **프론트엔드 (Next.js)**: 태그 추천 및 검색 UI

## 시작하기

### 1. 환경 설정

먼저 환경 변수를 설정합니다:

```bash
# .env.local 파일 생성
cp .env.development .env.local

# .env.local 파일을 열어 필요한 값 설정
# 특히 아래 값들을 설정해야 합니다:
# - ANALYSIS_API_URL
# - ANALYSIS_API_KEY
```

### 2. 백엔드 서버 실행

```bash
# 백엔드 의존성 설치
cd backend
pip install -r requirements.txt
cd ..

# 백엔드 서버 실행
npm run dev:server
```

### 3. 프론트엔드 개발 서버 실행

```bash
# 프론트엔드 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 구현된 기능

### 백엔드 API

1. **태그 추천 API** (`/api/v1/analysis/recommend-tags`):
   - 입력된 콘텐츠를 분석하여 관련 태그를 추천합니다.
   - POST 요청을 통해 콘텐츠를 전송하면 관련 태그 목록이 반환됩니다.

2. **콘텐츠 검색 API** (`/api/v1/analysis/search`):
   - 쿼리와 태그를 기반으로 콘텐츠를 검색합니다.
   - 특정 태그를 포함하거나 제외할 수 있습니다.

### 프론트엔드 컴포넌트

1. **TagRecommender**: 콘텐츠를 분석하여 태그를 추천하는 컴포넌트
2. **TagManager**: 태그를 추가하고 관리할 수 있는 컴포넌트
3. **ContentSearch**: 콘텐츠를 검색할 수 있는 컴포넌트

### 페이지

1. **콘텐츠 생성 페이지** (`/contents/create/rich`):
   - 리치 에디터를 사용한 콘텐츠 작성
   - 작성한 콘텐츠에 대한 태그 추천 및 관리
   
2. **검색 페이지** (`/search`):
   - 키워드와 태그 기반 검색
   - 검색 결과 상세 보기

## API 사용 방법

### 태그 추천 API

**요청:**
```json
POST /api/v1/analysis/recommend-tags
{
  "content": "분석할 텍스트 내용입니다.",
  "max_tags": 10,
  "categories": ["기술", "문화"]
}
```

**응답:**
```json
{
  "tags": [
    {
      "name": "인공지능",
      "score": 0.95,
      "category": "기술"
    },
    {
      "name": "머신러닝",
      "score": 0.87,
      "category": "기술"
    }
  ]
}
```

### 검색 API

**요청:**
```json
POST /api/v1/analysis/search
{
  "query": "머신러닝",
  "max_results": 20,
  "include_tags": ["인공지능", "데이터"],
  "exclude_tags": ["웹개발"]
}
```

**응답:**
```json
{
  "results": [
    {
      "id": "content-123",
      "title": "머신러닝 입문 가이드",
      "excerpt": "이 글은 머신러닝을 처음 시작하는 사람들을 위한 가이드입니다...",
      "score": 0.89,
      "tags": ["인공지능", "머신러닝", "데이터"],
      "url": "/contents/content-123"
    }
  ],
  "total_count": 42,
  "page": 1,
  "total_pages": 3
}
```

## 추가 개발 사항

1. 테스트 코드 작성
2. 오류 처리 개선
3. 캐싱 시스템 추가
4. 성능 최적화

## 문제 해결

만약 API 연결에 문제가 있다면 다음 사항을 확인하세요:

1. 환경 변수가 올바르게 설정되었는지 확인
2. CORS 설정이 적절한지 확인
3. 로그를 확인하여 오류 원인 파악 (`npm run dev:server:debug`)
