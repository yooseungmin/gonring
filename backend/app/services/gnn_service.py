from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
import networkx as nx
from datetime import datetime

# 향후 실제 ORM 모델과 연결
# from app.models.tag import Tag
# from app.models.tag_relationship import TagRelationship, TagCoordinate
# from app.models.content_tag import ContentTag
# from app.models.content import Content
# from app.models.box import Box

# 의존성으로 나중에 수정
def get_tag_embeddings(tag_names: List[str]) -> Dict[str, List[float]]:
    """
    태그 이름으로부터 임베딩 벡터를 가져옵니다.
    실제 구현에서는 사전 훈련된 모델이나 API를 사용할 수 있습니다.
    
    현재는 간단한 목업 구현입니다.
    """
    # 목업 임베딩 벡터 (실제로는 Word2Vec, BERT 등 사용)
    embedding_dim = 50
    mock_embeddings = {}
    
    for tag in tag_names:
        # 간단한 해시 기반 벡터 생성 (실제 구현에서는 사용하지 않음)
        np.random.seed(hash(tag) % 10000)
        embedding = np.random.rand(embedding_dim)
        # 정규화
        embedding = embedding / np.linalg.norm(embedding)
        mock_embeddings[tag] = embedding.tolist()
    
    return mock_embeddings

def calculate_tag_relationships(db: Session, user_id: str, box_id: Optional[str] = None):
    """
    태그 간의 관계를 계산하여 데이터베이스에 저장합니다.
    
    1. 동시 출현 빈도 계산
    2. 의미적 유사도 계산
    3. 관계 강도 정규화
    """
    # 이 함수는 실제 백그라운드 작업으로 실행될 수 있습니다
    
    # 1. 태그 목록 조회 (Mock 데이터)
    tags = [
        {"id": "1", "name": "AI"},
        {"id": "2", "name": "Machine Learning"},
        {"id": "3", "name": "Python"},
        {"id": "4", "name": "Research"},
        {"id": "5", "name": "Neural Networks"}
    ]
    
    # 2. 동시 출현 빈도 계산
    co_occurrences = calculate_co_occurrences(db, tags, user_id, box_id)
    
    # 3. 의미적 유사도 계산
    tag_names = [tag["name"] for tag in tags]
    embeddings = get_tag_embeddings(tag_names)
    
    # 임베딩 벡터를 numpy 배열로 변환
    embedding_matrix = np.array([embeddings[name] for name in tag_names])
    
    # 코사인 유사도 계산
    similarity_matrix = cosine_similarity(embedding_matrix)
    
    # 4. 관계 저장
    for i, tag1 in enumerate(tags):
        for j, tag2 in enumerate(tags):
            if i < j:  # 중복 방지
                # 두 태그 간의 의미적 거리 (1 - 유사도)
                distance = 1.0 - similarity_matrix[i, j]
                
                # 동시 출현 빈도
                co_occurrence = co_occurrences.get((tag1["id"], tag2["id"]), 0)
                
                # 관계 강도 정규화 (의미적 유사도와 동시 출현 빈도를 결합)
                max_co_occurrence = max(co_occurrences.values()) if co_occurrences else 1
                normalized_co_occurrence = co_occurrence / max_co_occurrence if max_co_occurrence > 0 else 0
                
                # 관계 강도 = 의미적 유사도(0.7) + 정규화된 동시 출현 빈도(0.3)
                correlation_strength = (0.7 * (1 - distance)) + (0.3 * normalized_co_occurrence)
                
                # 데이터베이스에 태그 관계 저장 (Mock 코드)
                # db.add(TagRelationship(
                #     tag1_id=tag1["id"],
                #     tag2_id=tag2["id"],
                #     distance=distance,
                #     co_occurrence=co_occurrence,
                #     correlation_strength=correlation_strength
                # ))
    
    # 실제 구현에서는 db.commit()
    
    # 5. 태그 좌표 업데이트
    update_tag_coordinates(db, user_id, box_id)

def calculate_co_occurrences(db: Session, tags: List[Dict[str, Any]], user_id: str, box_id: Optional[str] = None) -> Dict[Tuple[str, str], int]:
    """
    태그의 동시 출현 빈도를 계산합니다.
    """
    # 목업 구현
    # 실제 구현에서는 데이터베이스 쿼리 사용
    co_occurrences = {
        ("1", "2"): 15,  # AI & Machine Learning
        ("1", "5"): 10,  # AI & Neural Networks
        ("2", "3"): 8,   # Machine Learning & Python
        ("2", "5"): 12,  # Machine Learning & Neural Networks
        ("3", "4"): 5,   # Python & Research
        ("4", "5"): 3    # Research & Neural Networks
    }
    
    return co_occurrences

def update_tag_coordinates(db: Session, user_id: str, box_id: Optional[str] = None):
    """
    태그의 3차원 좌표를 계산하여 업데이트합니다.
    
    1. 태그 관계를 그래프로 변환
    2. 그래프 임베딩 알고리즘 적용 (Force-directed layout)
    3. 3차원 좌표 생성
    4. 클러스터링 적용
    """
    # 1. 태그 관계 데이터 가져오기 (Mock 데이터)
    tag_relationships = [
        {"tag1_id": "1", "tag2_id": "2", "correlation_strength": 0.8},
        {"tag1_id": "1", "tag2_id": "5", "correlation_strength": 0.7},
        {"tag1_id": "2", "tag2_id": "3", "correlation_strength": 0.5},
        {"tag1_id": "2", "tag2_id": "5", "correlation_strength": 0.75},
        {"tag1_id": "3", "tag2_id": "4", "correlation_strength": 0.4},
        {"tag1_id": "4", "tag2_id": "5", "correlation_strength": 0.3}
    ]
    
    # 2. 그래프 생성
    G = nx.Graph()
    
    # 노드 추가 (태그)
    tags = {
        "1": {"name": "AI", "weight": 0.9},
        "2": {"name": "Machine Learning", "weight": 0.85},
        "3": {"name": "Python", "weight": 0.7},
        "4": {"name": "Research", "weight": 0.6},
        "5": {"name": "Neural Networks", "weight": 0.8}
    }
    
    for tag_id, tag_data in tags.items():
        G.add_node(tag_id, **tag_data)
    
    # 엣지 추가 (태그 관계)
    for rel in tag_relationships:
        G.add_edge(
            rel["tag1_id"], 
            rel["tag2_id"], 
            weight=rel["correlation_strength"]
        )
    
    # 3. 포스 다이렉티드 레이아웃 적용 (3차원)
    pos = nx.spring_layout(G, dim=3, k=0.3, iterations=50, seed=42)
    
    # 4. 클러스터링 적용
    # 좌표 추출
    coords = np.array([pos[node] for node in G.nodes()])
    
    # k-means 클러스터링
    n_clusters = min(3, len(G.nodes()))  # 최소 클러스터 수 조정
    if len(coords) >= n_clusters:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(coords)
    else:
        # 노드가 너무 적으면 모두 같은 클러스터로
        cluster_labels = np.zeros(len(coords), dtype=int)
    
    # 5. 데이터베이스에 태그 좌표 저장
    for i, node in enumerate(G.nodes()):
        x, y, z = coords[i]
        cluster_id = int(cluster_labels[i])
        weight = G.nodes[node].get("weight", 0.5)
        
        # 목업 코드 (실제로는 DB에 저장)
        # db.add(TagCoordinate(
        #     tag_id=node,
        #     x=float(x),
        #     y=float(y),
        #     z=float(z),
        #     cluster_id=cluster_id,
        #     weight=weight
        # ))
    
    # 실제 구현에서는 db.commit()

def get_tag_coordinates(db: Session, user_id: str, box_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    태그의 3차원 좌표를 반환합니다.
    """
    # 목업 데이터 (실제로는 DB에서 조회)
    coordinates = [
        {"tag_id": "1", "name": "AI", "x": 0.2, "y": 0.5, "z": 0.1, "cluster_id": 0, "weight": 0.9},
        {"tag_id": "2", "name": "Machine Learning", "x": 0.3, "y": 0.4, "z": 0.2, "cluster_id": 0, "weight": 0.85},
        {"tag_id": "3", "name": "Python", "x": -0.4, "y": -0.2, "z": 0.1, "cluster_id": 1, "weight": 0.7},
        {"tag_id": "4", "name": "Research", "x": -0.3, "y": -0.3, "z": -0.2, "cluster_id": 1, "weight": 0.6},
        {"tag_id": "5", "name": "Neural Networks", "x": 0.1, "y": 0.3, "z": 0.4, "cluster_id": 0, "weight": 0.8}
    ]
    
    return coordinates

def get_tag_graph_data(
    db: Session, 
    user_id: str, 
    box_id: Optional[str] = None,
    min_correlation: float = 0.1,
    max_nodes: int = 100,
    include_clusters: bool = True
) -> Dict[str, Any]:
    """
    태그 그래프 데이터를 반환합니다.
    """
    # 태그 좌표 데이터 조회
    coordinates = get_tag_coordinates(db, user_id, box_id)
    
    # 태그 관계 데이터 조회 (Mock 데이터)
    tag_relationships = [
        {"tag1_id": "1", "tag2_id": "2", "correlation_strength": 0.8},
        {"tag1_id": "1", "tag2_id": "5", "correlation_strength": 0.7},
        {"tag1_id": "2", "tag2_id": "3", "correlation_strength": 0.5},
        {"tag1_id": "2", "tag2_id": "5", "correlation_strength": 0.75},
        {"tag1_id": "3", "tag2_id": "4", "correlation_strength": 0.4},
        {"tag1_id": "4", "tag2_id": "5", "correlation_strength": 0.3}
    ]
    
    # 노드 데이터 생성
    nodes = []
    for coord in coordinates[:max_nodes]:  # 최대 노드 수 제한
        nodes.append({
            "id": coord["tag_id"],
            "name": coord["name"],
            "x": coord["x"],
            "y": coord["y"],
            "z": coord["z"],
            "cluster_id": coord["cluster_id"],
            "weight": coord["weight"]
        })
    
    # 노드 ID 목록
    node_ids = {node["id"] for node in nodes}
    
    # 엣지 데이터 생성 (최소 상관관계 강도로 필터링)
    edges = []
    for rel in tag_relationships:
        if (rel["tag1_id"] in node_ids and 
            rel["tag2_id"] in node_ids and 
            rel["correlation_strength"] >= min_correlation):
            edges.append({
                "source": rel["tag1_id"],
                "target": rel["tag2_id"],
                "strength": rel["correlation_strength"]
            })
    
    # 클러스터 데이터 생성
    clusters = {}
    if include_clusters:
        for node in nodes:
            cluster_id = node["cluster_id"]
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(node["id"])
    
    return {
        "nodes": nodes,
        "edges": edges,
        "clusters": clusters
    }
