# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 필요한 모듈만 import
from app.core.config import settings
from app.api.routes import analysis, auth, boxes, contents, search  # search 라우터 추가

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="TaggingBox 계정 서비스 API",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS 설정 - 프론트엔드 포트 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"] + settings.CORS_ORIGINS,  # Next.js 기본 포트 추가
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 포함 - 필요한 라우터만 등록
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(auth.router)  # auth 라우터 추가
app.include_router(boxes.router)  # boxes 라우터 추가
app.include_router(contents.router)  # contents 라우터 추가
app.include_router(search.router)  # search 라우터 추가

@app.get("/")
async def root():
    return {"message": "TaggingBox 계정 서비스 API에 오신 것을 환영합니다"}
