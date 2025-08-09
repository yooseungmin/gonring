from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Content(Base):
    __tablename__ = "contents"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True, nullable=True)
    text_content = Column(Text, nullable=False)
    markdown_content = Column(Text, nullable=True)
    html_content = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    
    box_id = Column(String, ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    
    # 관계 정의
    box = relationship("Box", back_populates="contents")
    user = relationship("User", back_populates="contents")
    tags = relationship("Tag", back_populates="content", cascade="all, delete-orphan")
