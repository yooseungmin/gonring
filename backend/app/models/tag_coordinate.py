from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base_class import Base

class TagCoordinate(Base):
    __tablename__ = "tag_coordinates"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    tag_id = Column(String, ForeignKey("tags.id"), nullable=False)
    box_id = Column(String, ForeignKey("boxes.id"), nullable=False)
    
    x = Column(Float, default=0.0, nullable=False)
    y = Column(Float, default=0.0, nullable=False)
    z = Column(Float, default=0.0, nullable=False)
    cluster_id = Column(Integer, nullable=True)
    weight = Column(Float, default=0.5, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # 태그 관계
    tag = relationship("Tag")
    # 박스 관계
    box = relationship("Box", back_populates="tag_coordinates")
    
    # 인덱스 생성
    __table_args__ = (
        # 태그와 박스에 대한 유니크 제약
        Index("ix_tag_coordinates_tag_box", tag_id, box_id, unique=True),
        # 태그 기준 검색 최적화
        Index("ix_tag_coordinates_tag", tag_id),
        # 박스 기준 검색 최적화
        Index("ix_tag_coordinates_box", box_id),
        # 클러스터 기준 검색 최적화
        Index("ix_tag_coordinates_cluster", cluster_id),
    )
