"""
태그 관계 서비스 - 태그 간의 관계 분석 및 관리
"""

from typing import List, Dict, Optional, Set, Tuple
import logging
from sqlalchemy.orm import Session

from app.core.relationship_engine import TagRelationshipEngine
from app.models.tag import Tag
from app.models.tag_relationship import TagRelationship
from app.models.tag_coordinate import TagCoordinate
from app.crud import tag as tag_crud
from app.crud import tag_relationship as tag_relationship_crud
from app.crud import tag_coordinate as tag_coordinate_crud
from app.schemas.tag_relationship import (
    TagRelationshipCreate, 
    TagCoordinateCreate,
    TagGraphData
)

logger = logging.getLogger(__name__)

class TagRelationshipService:
    """
    태그 관계 서비스 - 태그 간의 관계 분석 및 관리 서비스
    """
    
    def __init__(self, db: Session):
        """
        태그 관계 서비스 초기화
        
        Args:
            db: 데이터베이스 세션
        """
        self.db = db
        self.engine = TagRelationshipEngine()
    
    def get_tag_graph(self, 
                     user_id: Optional[int] = None, 
                     tag_ids: Optional[List[int]] = None,
                     min_strength: float = 0.1,
                     max_tags: int = 100) -> TagGraphData:
        """
        태그 그래프 데이터 가져오기
        
        Args:
            user_id: 사용자 ID (None이면 전체 통계)
            tag_ids: 포함할 태그 ID 목록 (None이면 모든 태그)
            min_strength: 포함할 관계의 최소 강도
            max_tags: 최대 태그 수
            
        Returns:
            TagGraphData: 태그 그래프 데이터
        """
        # 태그 관계 불러오기
        if tag_ids:
            # 특정 태그와 관련된 관계만 가져오기
            relationships = tag_relationship_crud.get_tag_relationships_by_tag_ids(
                self.db, tag_ids, user_id, min_strength
            )
        else:
            # 모든 관계 가져오기
            relationships = tag_relationship_crud.get_tag_relationships_by_user(
                self.db, user_id, 0, 1000  # 최대 1000개 관계
            )
            
        # 태그 ID 추출
        tag_ids_set = set()
        for rel in relationships:
            tag_ids_set.add(rel.source_tag_id)
            tag_ids_set.add(rel.target_tag_id)
            
        # 태그 정보 불러오기
        tags_list = tag_crud.get_tags_by_ids(self.db, list(tag_ids_set))
        tags_dict = {tag.id: tag for tag in tags_list}
        
        # 태그 좌표 불러오기
        coordinates_dict = {}
        if tag_ids_set:
            coordinates = tag_coordinate_crud.get_tag_coordinates_by_tag_ids(
                self.db, list(tag_ids_set), user_id
            )
            coordinates_dict = coordinates
            
        # 그래프 구축
        self.engine.build_graph_from_relationships(
            relationships, tags_dict, coordinates_dict, min_strength, max_tags
        )
        
        # 그래프 데이터 가져오기
        graph_data = self.engine.get_tag_graph_data()
        
        # 좌표 저장 (캐싱)
        self._save_coordinates_from_graph()
        
        return graph_data
    
    def _save_coordinates_from_graph(self) -> None:
        """
        현재 그래프의 좌표를 데이터베이스에 저장 (캐싱)
        """
        # 현재 그래프에서 좌표 추출
        coordinates = self.engine.export_coordinates()
        
        # 좌표를 데이터베이스에 저장할 스키마로 변환
        coordinate_schemas = []
        
        for tag_id, (x, y, z, cluster_id, weight) in coordinates.items():
            coordinate_schemas.append(
                TagCoordinateCreate(
                    tag_id=tag_id,
                    x=x,
                    y=y,
                    z=z,
                    cluster_id=cluster_id,
                    weight=weight,
                    user_id=None  # 전체 통계로 저장
                )
            )
            
        # 일괄 업데이트 또는 생성
        if coordinate_schemas:
            tag_coordinate_crud.update_or_create_tag_coordinates_batch(
                self.db, coordinate_schemas
            )
    
    def get_related_tags(self, 
                        tag_ids: List[int], 
                        user_id: Optional[int] = None,
                        max_results: int = 10) -> List[Tuple[int, float, str]]:
        """
        관련 태그 가져오기
        
        Args:
            tag_ids: 기준 태그 ID 목록
            user_id: 사용자 ID (None이면 전체 통계)
            max_results: 결과 최대 개수
            
        Returns:
            List[Tuple[int, float, str]]: (태그 ID, 관련성 점수, 태그 이름) 목록
        """
        # 태그 그래프 데이터 가져오기 (최신 데이터로 그래프 구축)
        self.get_tag_graph(user_id, tag_ids)
        
        # 관련 태그 계산
        related_tags = self.engine.calculate_related_tags(tag_ids, max_results)
        
        # 태그 이름 가져오기
        tag_ids_to_fetch = [tag_id for tag_id, _ in related_tags]
        tags = tag_crud.get_tags_by_ids(self.db, tag_ids_to_fetch)
        tag_dict = {tag.id: tag.name for tag in tags}
        
        # 결과 포맷 변환
        result = []
        for tag_id, score in related_tags:
            tag_name = tag_dict.get(tag_id, f"Tag {tag_id}")
            result.append((tag_id, score, tag_name))
            
        return result
    
    def update_tag_relationships_from_content(self, 
                                            content_id: int, 
                                            tag_ids: List[int],
                                            user_id: Optional[int] = None) -> None:
        """
        컨텐츠의 태그를 기반으로 태그 관계 업데이트
        
        Args:
            content_id: 컨텐츠 ID
            tag_ids: 태그 ID 목록
            user_id: 사용자 ID (None이면 전체 통계)
        """
        if len(tag_ids) < 2:
            return  # 태그가 2개 미만이면 관계를 만들 수 없음
            
        # 모든 태그 쌍에 대해 관계 생성 또는 업데이트
        for i in range(len(tag_ids)):
            for j in range(i+1, len(tag_ids)):
                source_id = tag_ids[i]
                target_id = tag_ids[j]
                
                # 기존 관계 확인
                existing = tag_relationship_crud.get_tag_relationship_by_tags(
                    self.db, source_id, target_id, user_id
                )
                
                if existing:
                    # 기존 관계 업데이트
                    new_count = existing.count + 1
                    # 관계 강도 = log(count) / 10 으로 계산 (최대 1.0)
                    new_strength = min(existing.strength + 0.1, 1.0)
                    
                    tag_relationship_crud.update_tag_relationship(
                        self.db, existing.id, new_strength, new_count
                    )
                else:
                    # 새 관계 생성
                    new_relationship = TagRelationshipCreate(
                        source_tag_id=source_id,
                        target_tag_id=target_id,
                        strength=0.3,  # 초기 강도
                        count=1,
                        user_id=user_id
                    )
                    
                    tag_relationship_crud.create_tag_relationship(
                        self.db, new_relationship
                    )
