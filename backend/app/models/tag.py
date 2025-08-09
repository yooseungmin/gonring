from sqlalchemy import Column, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    scope = Column(String, default="default", nullable=False)
    score = Column(Float, nullable=True)
    
    content_id = Column(String, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    
    # 관계 정의
    content = relationship("Content", back_populates="tags")
    user = relationship("User", back_populates="tags")
