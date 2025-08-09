from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from datetime import datetime

from app.models.tag_coordinate import TagCoordinate
from app.schemas.tag_relationship import TagCoordinateCreate, TagCoordinateUpdate

class TagCoordinateCRUD:
    async def create(self, db: AsyncSession, *, obj_in: TagCoordinateCreate) -> TagCoordinate:
        """새 태그 좌표 생성"""
        db_obj = TagCoordinate(
            tag_id=obj_in.tag_id,
            box_id=obj_in.box_id,
            x=obj_in.x,
            y=obj_in.y,
            z=obj_in.z,
            cluster_id=obj_in.cluster_id,
            weight=obj_in.weight,
            created_at=datetime.utcnow()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def get_by_tag_box(
        self, db: AsyncSession, *, tag_id: str, box_id: str
    ) -> Optional[TagCoordinate]:
        """태그 ID와 박스 ID로 좌표 조회"""
        query = select(TagCoordinate).where(
            and_(
                TagCoordinate.tag_id == tag_id,
                TagCoordinate.box_id == box_id
            )
        )
        result = await db.execute(query)
        return result.scalars().first()
    
    async def get_multi_by_box(
        self, db: AsyncSession, *, box_id: str, skip: int = 0, limit: int = 1000
    ) -> List[TagCoordinate]:
        """박스 ID로 모든 태그 좌표 조회"""
        query = select(TagCoordinate).where(
            TagCoordinate.box_id == box_id
        ).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_by_cluster(
        self, db: AsyncSession, *, cluster_id: int, box_id: Optional[str] = None
    ) -> List[TagCoordinate]:
        """클러스터 ID로 태그 좌표 조회"""
        conditions = [TagCoordinate.cluster_id == cluster_id]
        
        if box_id:
            conditions.append(TagCoordinate.box_id == box_id)
        
        query = select(TagCoordinate).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalars().all()
    
    async def update(
        self, db: AsyncSession, *, db_obj: TagCoordinate, obj_in: TagCoordinateUpdate
    ) -> TagCoordinate:
        """태그 좌표 업데이트"""
        update_data = obj_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        db_obj.updated_at = datetime.utcnow()
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def remove(self, db: AsyncSession, *, db_obj: TagCoordinate) -> None:
        """태그 좌표 삭제"""
        await db.delete(db_obj)
        await db.commit()
    
    async def remove_by_box(self, db: AsyncSession, *, box_id: str) -> int:
        """박스 ID로 모든 태그 좌표 삭제"""
        query = select(TagCoordinate).where(TagCoordinate.box_id == box_id)
        result = await db.execute(query)
        coordinates = result.scalars().all()
        
        count = 0
        for coordinate in coordinates:
            await db.delete(coordinate)
            count += 1
        
        await db.commit()
        return count
    
    async def get_clusters(self, db: AsyncSession, *, box_id: str) -> Dict[int, List[str]]:
        """박스의 모든 클러스터 정보 조회"""
        query = select(TagCoordinate).where(
            and_(
                TagCoordinate.box_id == box_id,
                TagCoordinate.cluster_id != None
            )
        )
        result = await db.execute(query)
        coordinates = result.scalars().all()
        
        clusters = {}
        for coord in coordinates:
            if coord.cluster_id not in clusters:
                clusters[coord.cluster_id] = []
            clusters[coord.cluster_id].append(coord.tag_id)
        
        return clusters

# 싱글톤 인스턴스 생성
tag_coordinate = TagCoordinateCRUD()
