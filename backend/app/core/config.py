import os
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, HttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "TaggingBox Hub"
    
    # CORS 설정
    CORS_ORIGINS: List[AnyHttpUrl] = []

    # 환경 변수에서 로드될 수 있는 설정들
    SECRET_KEY: str = "your-secret-key-change-this"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "taggingbox"
    
    @field_validator("CORS_ORIGINS", mode='before')
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # 분석 모듈 API 설정
    ANALYSIS_API_URL: str = os.getenv("ANALYSIS_API_URL", "http://localhost:5000")
    ANALYSIS_API_KEY: str = os.getenv("ANALYSIS_API_KEY", "")
    
    # TB Engine API 설정
    TB_ENGINE_API_URL: str = os.getenv("TB_ENGINE_API_URL", "http://module.tbmini.im:8080/api/v1")
    TB_ENGINE_API_KEY: str = os.getenv("TB_ENGINE_API_KEY", "")
    
    # JWT 설정
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your_default_secret_key_change_this_in_production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # DB 설정
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/tbhub")
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"
    )

settings = Settings()
