# TaggingBox 계정 서비스 API

TaggingBox 웹 애플리케이션을 위한 계정 서비스 API입니다.

## 기능

- 사용자 등록 및 인증
- 가상 사용자(Virtual User) 시스템
- JWT 기반 인증
- RESTful API

## 기술 스택

- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT 인증

## 설치 및 실행

1. 가상환경 설정
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate  # Windows
```

2. 의존성 설치
```bash
pip install -r requirements.txt
```

3. 환경 변수 설정
`.env` 파일을 확인하고 필요한 설정을 변경합니다.

4. 데이터베이스 초기화
```bash
python init_db.py
```

5. 서버 실행
```bash
uvicorn main:app --reload
```

## API 문서

API가 실행된 후에는 다음 URL에서 API 문서를 확인할 수 있습니다:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 개발

이 프로젝트는 tb-hub-clean의 일부로, TaggingBox의 계정 관리를 담당하는 서비스입니다.
