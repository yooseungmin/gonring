# backend/init_db.py
import logging
from sqlalchemy.orm import Session

from app.database import SessionLocal, Base, engine
from app import crud, schemas
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db() -> None:
    db = SessionLocal()
    try:
        # 모델 임포트 확인 (VirtualUser 모델이 포함되었는지 확인)
        from app.models.user import User, VirtualUser
        
        # 데이터베이스 테이블 생성
        Base.metadata.create_all(bind=engine)
        
        # 파일 업로드 디렉토리 생성
        from pathlib import Path
        upload_dir = Path(settings.LOCAL_STORAGE_PATH)
        upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created upload directory: {upload_dir}")
        
        # 초기 관리자 생성 (가상 사용자와 함께)
        user = crud.user.get_by_email(db, email="admin@taggingbox.com")
        if not user:
            user_in = schemas.UserCreate(
                email="admin@taggingbox.com",
                password="admin",
                username="admin",
                is_superuser=True,
            )
            user = crud.user.create_with_virtual_user(db, obj_in=user_in)
            logger.info(f"관리자 계정 생성됨: {user.email} (가상 사용자도 함께 생성됨)")
        else:
            logger.info("관리자 계정이 이미 존재합니다")
    finally:
        db.close()


def main() -> None:
    logger.info("데이터베이스 초기화 중...")
    init_db()
    logger.info("데이터베이스 초기화 완료")


if __name__ == "__main__":
    main()
