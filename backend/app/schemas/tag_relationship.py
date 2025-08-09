from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4

class TagRelationshipBase(BaseModel):
    tag1_id: str
    tag2_id: str
    distance: float = Field(ge=0.0, le=1.0, description="Semantic distance between tags (0-1)")
    co_occurrence: int = Field(ge=0, description="Number of times tags appear together")
    correlation_strength: float = Field(ge=0.0, le=1.0, description="Normalized relationship strength")

class TagRelationshipCreate(TagRelationshipBase):
    pass

class TagRelationshipUpdate(BaseModel):
    distance: Optional[float] = Field(None, ge=0.0, le=1.0)
    co_occurrence: Optional[int] = Field(None, ge=0)
    correlation_strength: Optional[float] = Field(None, ge=0.0, le=1.0)

class TagRelationship(TagRelationshipBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TagCoordinateBase(BaseModel):
    tag_id: str
    x: float
    y: float
    z: float
    cluster_id: Optional[int] = None
    weight: float = Field(ge=0.0, description="Tag importance weight (based on tB Score)")

class TagCoordinateCreate(TagCoordinateBase):
    pass

class TagCoordinateUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    cluster_id: Optional[int] = None
    weight: Optional[float] = Field(None, ge=0.0)

class TagCoordinate(TagCoordinateBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TagGraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    clusters: Dict[int, List[str]]

class TagGraphQueryParams(BaseModel):
    box_id: Optional[str] = None
    user_id: Optional[str] = None
    min_correlation: float = Field(0.1, ge=0.0, le=1.0, description="Minimum correlation strength to include")
    max_nodes: int = Field(100, ge=10, le=500, description="Maximum number of nodes to return")
    include_clusters: bool = True
