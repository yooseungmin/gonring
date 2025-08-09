from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base_class import Base

class TagRelationship(Base):
    __tablename__ = "tag_relationships"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tag1_id = Column(String, ForeignKey("tags.id"), nullable=False)
    tag2_id = Column(String, ForeignKey("tags.id"), nullable=False)
    box_id = Column(String, ForeignKey("boxes.id"), nullable=False)
    
    co_occurrence = Column(Integer, default=0, nullable=False)
    distance = Column(Float, default=1.0, nullable=False)
    correlation_strength = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # 태그1 관계
    tag1 = relationship("Tag", foreign_keys=[tag1_id])
    # 태그2 관계
    tag2 = relationship("Tag", foreign_keys=[tag2_id])
    # 박스 관계
    box = relationship("Box", back_populates="tag_relationships")
    
    # 인덱스 생성
    __table_args__ = (
        # 태그 쌍과 박스에 대한 유니크 제약
        Index("ix_tag_relationships_tag_pair_box", tag1_id, tag2_id, box_id, unique=True),
        # 태그1 기준 검색 최적화
        Index("ix_tag_relationships_tag1", tag1_id),
        # 태그2 기준 검색 최적화
        Index("ix_tag_relationships_tag2", tag2_id),
        # 박스 기준 검색 최적화
        Index("ix_tag_relationships_box", box_id),
    )
