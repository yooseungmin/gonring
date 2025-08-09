from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship, backref
from datetime import datetime

from app.database import Base

class Box(Base):
    __tablename__ = "boxes"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(String, ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True)
    
    content_count = Column(Integer, default=0, nullable=False)
    child_box_count = Column(Integer, default=0, nullable=False)
    tag_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    
    # 관계 정의
    user = relationship("User", back_populates="boxes")
    contents = relationship("Content", back_populates="box", cascade="all, delete-orphan")
    
    # 태그 관계성 관련
    tag_relationships = relationship("TagRelationship", back_populates="box", cascade="all, delete-orphan")
    tag_coordinates = relationship("TagCoordinate", back_populates="box", cascade="all, delete-orphan")
    
    # 셀프 참조 (계층 구조)
    children = relationship("Box", 
                           backref=backref("parent", remote_side=[id]),
                           cascade="all, delete-orphan")
