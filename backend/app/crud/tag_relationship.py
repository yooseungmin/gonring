from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_, func
from datetime import datetime

from app.models.tag_relationship import TagRelationship
from app.schemas.tag_relationship import TagRelationshipCreate, TagRelationshipUpdate

class TagRelationshipCRUD:
    async def create(self, db: AsyncSession, *, obj_in: TagRelationshipCreate) -> TagRelationship:
        """새 태그 관계 생성"""
        db_obj = TagRelationship(
            tag1_id=obj_in.tag1_id,
            tag2_id=obj_in.tag2_id,
            box_id=obj_in.box_id,
            co_occurrence=obj_in.co_occurrence,
            distance=obj_in.distance,
            correlation_strength=0.0,  # 초기값
            created_at=datetime.utcnow()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def get_by_tags(
        self, db: AsyncSession, *, tag1_id: str, tag2_id: str, box_id: str
    ) -> Optional[TagRelationship]:
        """두 태그 ID로 관계 조회"""
        # tag1_id < tag2_id 순서로 정렬하여 조회
        sorted_tag1, sorted_tag2 = sorted([tag1_id, tag2_id])
        
        query = select(TagRelationship).where(
            and_(
                TagRelationship.tag1_id == sorted_tag1,
                TagRelationship.tag2_id == sorted_tag2,
                TagRelationship.box_id == box_id
            )
        )
        result = await db.execute(query)
        return result.scalars().first()
    
    async def get_multi_by_box(
        self, db: AsyncSession, *, box_id: str, skip: int = 0, limit: int = 100
    ) -> List[TagRelationship]:
        """박스 ID로 모든 태그 관계 조회"""
        query = select(TagRelationship).where(
            TagRelationship.box_id == box_id
        ).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_by_tag(
        self, db: AsyncSession, *, tag_id: str, box_id: Optional[str] = None
    ) -> List[TagRelationship]:
        """특정 태그와 관련된 모든 관계 조회"""
        conditions = [
            or_(
                TagRelationship.tag1_id == tag_id,
                TagRelationship.tag2_id == tag_id
            )
        ]
        
        if box_id:
            conditions.append(TagRelationship.box_id == box_id)
        
        query = select(TagRelationship).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalars().all()
    
    async def update(
        self, db: AsyncSession, *, db_obj: TagRelationship, obj_in: TagRelationshipUpdate
    ) -> TagRelationship:
        """태그 관계 업데이트"""
        update_data = obj_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db_obj.updated_at = datetime.utcnow()
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def remove(self, db: AsyncSession, *, db_obj: TagRelationship) -> None:
        """태그 관계 삭제"""
        await db.delete(db_obj)
        await db.commit()
    
    async def remove_by_box(self, db: AsyncSession, *, box_id: str) -> int:
        """박스 ID로 모든 태그 관계 삭제"""
        query = select(TagRelationship).where(TagRelationship.box_id == box_id)
        result = await db.execute(query)
        relationships = result.scalars().all()
        
        count = 0
        for relationship in relationships:
            await db.delete(relationship)
            count += 1
        
        await db.commit()
        return count
    
    async def get_strongest_relationships(
        self, db: AsyncSession, *, tag_id: str, box_id: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """특정 태그와 가장 강한 관계를 가진 태그 조회"""
        query = select(TagRelationship).where(
            and_(
                or_(
                    TagRelationship.tag1_id == tag_id,
                    TagRelationship.tag2_id == tag_id
                ),
                TagRelationship.box_id == box_id
            )
        ).order_by(TagRelationship.correlation_strength.desc()).limit(limit)
        
        result = await db.execute(query)
        relationships = result.scalars().all()
        
        # 태그 ID와 관계 강도 리스트 반환
        strongest = []
        for rel in relationships:
            related_tag_id = rel.tag2_id if rel.tag1_id == tag_id else rel.tag1_id
            strongest.append({
                "tag_id": related_tag_id,
                "strength": rel.correlation_strength,
                "distance": rel.distance
            })
        
        return strongest

# 싱글톤 인스턴스 생성
tag_relationship = TagRelationshipCRUD()
