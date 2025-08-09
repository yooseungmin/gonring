from datetime import datetime
from typing import List, Dict, Optional, Tuple
import logging
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.tag import Tag
from app.models.content import Content
from app.models.tag_relationship import TagRelationship as TagRelationshipModel
from app.models.tag_coordinate import TagCoordinate as TagCoordinateModel
from app.schemas.tag_relationship import TagRelationshipCreate, TagCoordinateCreate
from app.crud.tag import tag as tag_crud
from app.crud.content import content as content_crud
from app.crud.tag_relationship import tag_relationship as tag_relationship_crud
from app.crud.tag_coordinate import tag_coordinate as tag_coordinate_crud

logger = logging.getLogger(__name__)

class TagRelationshipEngine:
    """TB Engine과 분리된 관계성 계산만 담당하는 엔진"""
    
    async def calculate_co_occurrence(self, box_id: str, db: AsyncSession) -> int:
        """동일 콘텐츠에 함께 나타난 태그들의 동시출현 빈도 계산
        
        Returns:
            int: 업데이트된 관계 수
        """
        logger.info(f"Calculating tag co-occurrence for box {box_id}")
        
        # 1. 박스의 모든 콘텐츠 가져오기
        contents = await content_crud.get_multi_by_box(db, box_id=box_id)
        if not contents:
            logger.info(f"No contents found in box {box_id}")
            return 0
        
        # 2. 태그 동시출현 계산
        co_occurrences = {}  # (tag1_id, tag2_id) -> count
        
        for content in contents:
            # 콘텐츠의 태그 가져오기
            content_tags = await tag_crud.get_tags_by_content(db, content_id=content.id)
            tag_ids = [tag.id for tag in content_tags]
            
            # 모든 태그 쌍에 대해 동시출현 계산
            for i in range(len(tag_ids)):
                for j in range(i+1, len(tag_ids)):
                    # 태그 ID 정렬해서 저장 (tag1_id < tag2_id)
                    tag1_id = min(tag_ids[i], tag_ids[j])
                    tag2_id = max(tag_ids[i], tag_ids[j])
                    pair = (tag1_id, tag2_id)
                    
                    if pair in co_occurrences:
                        co_occurrences[pair] += 1
                    else:
                        co_occurrences[pair] = 1
        
        # 3. 관계 데이터베이스 업데이트
        updated_count = 0
        
        for (tag1_id, tag2_id), count in co_occurrences.items():
            # 기존 관계 조회
            relationship = await tag_relationship_crud.get_by_tags(
                db, tag1_id=tag1_id, tag2_id=tag2_id, box_id=box_id
            )
            
            if relationship:
                # 관계 업데이트
                relationship.co_occurrence = count
                relationship.updated_at = datetime.utcnow()
                db.add(relationship)
                updated_count += 1
            else:
                # 새 관계 생성
                new_relationship = TagRelationshipModel(
                    id=str(uuid.uuid4()),
                    tag1_id=tag1_id,
                    tag2_id=tag2_id,
                    co_occurrence=count,
                    distance=1.0,  # 초기값, update_tag_distances에서 계산
                    correlation_strength=0.0,  # 초기값, update_tag_distances에서 계산
                    box_id=box_id,
                    created_at=datetime.utcnow()
                )
                db.add(new_relationship)
                updated_count += 1
        
        await db.commit()
        logger.info(f"Updated {updated_count} tag relationships for box {box_id}")
        return updated_count
    
    async def update_tag_distances(self, box_id: str, db: AsyncSession) -> int:
        """동시출현 빈도 기반으로 태그 간 거리와 상관관계 강도 업데이트
        
        Returns:
            int: 업데이트된 관계 수
        """
        logger.info(f"Updating tag distances for box {box_id}")
        
        # 1. 박스의 모든 태그 관계 가져오기
        relationships = await tag_relationship_crud.get_multi_by_box(db, box_id=box_id)
        if not relationships:
            logger.info(f"No tag relationships found in box {box_id}")
            return 0
        
        # 2. 최대 동시출현 횟수 찾기 (정규화 위해)
        max_co_occurrence = max(rel.co_occurrence for rel in relationships)
        if max_co_occurrence == 0:
            logger.info(f"No co-occurrences found in box {box_id}")
            return 0
        
        # 3. 거리 및 상관관계 강도 계산
        updated_count = 0
        
        for rel in relationships:
            # 상관관계 강도 (0~1): 동시출현 횟수를 정규화
            correlation_strength = rel.co_occurrence / max_co_occurrence
            
            # 거리 (0~1): 상관관계 강도의 역수, 0이 가장 가까움
            distance = 1.0 - correlation_strength
            
            # 업데이트
            rel.correlation_strength = correlation_strength
            rel.distance = distance
            rel.updated_at = datetime.utcnow()
            db.add(rel)
            updated_count += 1
        
        await db.commit()
        logger.info(f"Updated distances for {updated_count} tag relationships in box {box_id}")
        return updated_count
    
    async def generate_3d_coordinates(self, box_id: str, db: AsyncSession) -> int:
        """태그 관계 기반 3차원 좌표 생성 (클러스터링 포함)
        
        Note:
            실제 구현에서는 sklearn, networkx 등 필요한 라이브러리 사용
            여기서는 간단한 목업 구현
        
        Returns:
            int: 업데이트된 태그 좌표 수
        """
        logger.info(f"Generating 3D coordinates for tags in box {box_id}")
        
        # 1. 박스의 모든 태그 및 관계 가져오기
        tags = await tag_crud.get_tags_by_box(db, box_id=box_id)
        relationships = await tag_relationship_crud.get_multi_by_box(db, box_id=box_id)
        
        if not tags or len(tags) < 2:
            logger.info(f"Not enough tags in box {box_id} for coordinates")
            return 0
            
        # 2. 가상의 좌표 생성 (실제로는 여기에 MDS, t-SNE 또는 Force-directed 알고리즘 적용)
        # 이 간단한 예제에서는 랜덤 좌표를 사용
        import random
        import math
        
        # 간단한 클러스터링을 위해 태그를 무작위로 클러스터에 할당
        # 실제로는 k-means 등의 알고리즘 사용
        tag_count = len(tags)
        cluster_count = min(math.ceil(tag_count / 3), 5)  # 대략 3개씩 묶거나 최대 5개 클러스터
        
        # 클러스터 할당
        clusters = {}
        for i, tag in enumerate(tags):
            cluster_id = i % cluster_count
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(tag.id)
        
        # 3. 좌표 업데이트
        updated_count = 0
        
        for tag in tags:
            # 기존 좌표 조회
            coordinate = await tag_coordinate_crud.get_by_tag_box(db, tag_id=tag.id, box_id=box_id)
            
            # 태그의 중요도 계산 (실제로는 tB Score 또는 연결 중심성 사용)
            # 여기서는 관계 수에 비례하도록 설정
            tag_relationships = [rel for rel in relationships if rel.tag1_id == tag.id or rel.tag2_id == tag.id]
            weight = min(1.0, len(tag_relationships) / 10)  # 최대 1.0
            
            # 태그 클러스터 찾기
            cluster_id = next((cid for cid, tags in clusters.items() if tag.id in tags), 0)
            
            # 클러스터 중심 주변에 배치
            cluster_center = {
                0: (0.3, 0.3, 0.3),
                1: (-0.3, -0.3, 0.3),
                2: (0.3, -0.3, -0.3),
                3: (-0.3, 0.3, -0.3),
                4: (0.0, 0.0, 0.5),
            }.get(cluster_id, (0, 0, 0))
            
            # 클러스터 중심에서 조금 벗어난 위치 계산
            x = cluster_center[0] + random.uniform(-0.2, 0.2)
            y = cluster_center[1] + random.uniform(-0.2, 0.2)
            z = cluster_center[2] + random.uniform(-0.2, 0.2)
            
            if coordinate:
                # 좌표 업데이트
                coordinate.x = x
                coordinate.y = y
                coordinate.z = z
                coordinate.cluster_id = cluster_id
                coordinate.weight = weight
                coordinate.updated_at = datetime.utcnow()
                db.add(coordinate)
            else:
                # 새 좌표 생성
                new_coordinate = TagCoordinateModel(
                    id=str(uuid.uuid4()),
                    tag_id=tag.id,
                    box_id=box_id,
                    x=x,
                    y=y,
                    z=z,
                    cluster_id=cluster_id,
                    weight=weight,
                    created_at=datetime.utcnow()
                )
                db.add(new_coordinate)
            
            updated_count += 1
        
        await db.commit()
        logger.info(f"Generated coordinates for {updated_count} tags in box {box_id}")
        return updated_count
    
    async def get_tag_graph_data(self, box_id: str, db: AsyncSession, min_correlation: float = 0.1) -> Dict:
        """태그 그래프 데이터 생성
        
        Args:
            box_id: 박스 ID
            db: 데이터베이스 세션
            min_correlation: 최소 상관관계 강도 (0.0~1.0)
            
        Returns:
            Dict: 태그 그래프 데이터 (노드, 엣지, 클러스터)
        """
        logger.info(f"Getting tag graph data for box {box_id}")
        
        # 1. 박스의 모든 태그, 관계, 좌표 가져오기
        tags = await tag_crud.get_tags_by_box(db, box_id=box_id)
        relationships = await tag_relationship_crud.get_multi_by_box(db, box_id=box_id)
        coordinates = await tag_coordinate_crud.get_multi_by_box(db, box_id=box_id)
        
        if not tags or not coordinates:
            logger.info(f"No tags or coordinates found in box {box_id}")
            return {"nodes": [], "edges": [], "clusters": {}}
        
        # 2. 태그 ID -> 태그 이름 맵 생성
        tag_map = {tag.id: tag.name for tag in tags}
        
        # 3. 태그 ID -> 좌표 맵 생성
        coord_map = {coord.tag_id: coord for coord in coordinates}
        
        # 4. 노드 데이터 생성
        nodes = []
        clusters = {}
        
        for tag in tags:
            if tag.id in coord_map:
                coord = coord_map[tag.id]
                
                node = {
                    "id": tag.id,
                    "name": tag.name,
                    "x": coord.x,
                    "y": coord.y,
                    "z": coord.z,
                    "cluster_id": coord.cluster_id,
                    "weight": coord.weight
                }
                nodes.append(node)
                
                # 클러스터 정보 업데이트
                cluster_id = coord.cluster_id
                if cluster_id is not None:
                    if cluster_id not in clusters:
                        clusters[cluster_id] = []
                    clusters[cluster_id].append(tag.id)
        
        # 5. 엣지 데이터 생성 (최소 상관관계 강도 이상만)
        edges = []
        
        for rel in relationships:
            if rel.correlation_strength >= min_correlation:
                edge = {
                    "source": rel.tag1_id,
                    "target": rel.tag2_id,
                    "strength": rel.correlation_strength
                }
                edges.append(edge)
        
        # 6. 그래프 데이터 반환
        graph_data = {
            "nodes": nodes,
            "edges": edges,
            "clusters": clusters
        }
        
        logger.info(f"Returning graph with {len(nodes)} nodes and {len(edges)} edges")
        return graph_data
