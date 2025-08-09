'use client';

import { useState, useEffect } from 'react';
import TagGraph3D from './TagGraph3D';
import { Button, Card, Checkbox, Dropdown, Menu, Spin, Switch, Tooltip } from 'antd';
import { InfoCircleOutlined, ReloadOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';

// 태그 그래프 데이터 타입 정의
interface TagNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  cluster_id?: number;
  weight: number;
}

interface TagEdge {
  source: string;
  target: string;
  strength: number;
}

interface TagGraphData {
  nodes: TagNode[];
  edges: TagEdge[];
  clusters: Record<number, string[]>;
}

// 컴포넌트 속성 타입 정의
interface TagRelationshipViewerProps {
  userId?: string; // 특정 사용자의 태그 관계를 볼 때 사용
  selectedTags?: string[]; // 미리 선택된 태그들
  onTagSelect?: (tagId: string, tagName: string) => void; // 태그 선택 시 콜백
  height?: string; // 그래프 높이
  darkMode?: boolean; // 다크 모드 설정
}

// 태그 관계 뷰어 컴포넌트
const TagRelationshipViewer: React.FC<TagRelationshipViewerProps> = ({
  userId,
  selectedTags = [],
  onTagSelect,
  height = '500px',
  darkMode = false,
}) => {
  // 상태 관리
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<TagGraphData>({ nodes: [], edges: [], clusters: {} });
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [showAllTags, setShowAllTags] = useState<boolean>(true);
  const [clusterFilter, setClusterFilter] = useState<number[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(darkMode);
  
  // 태그 그래프 데이터 로드
  useEffect(() => {
    fetchTagGraphData();
  }, [userId, selectedTags]);
  
  // 태그 그래프 데이터 가져오기
  const fetchTagGraphData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // API 엔드포인트 구성
      let endpoint = '/api/tags/graph';
      const params = new URLSearchParams();
      
      // 사용자 ID가 있으면 추가
      if (userId) {
        params.append('user_id', userId);
      }
      
      // 선택된 태그가 있으면 추가
      if (selectedTags.length > 0) {
        selectedTags.forEach(tag => params.append('tag_ids', tag));
      }
      
      // 파라미터 추가
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      // API 요청
      const response = await fetch(endpoint);
      
      // 응답 처리
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const data = await response.json();
      setGraphData(data);
      
    } catch (err) {
      console.error("태그 그래프 데이터를 불러오는 데 실패했습니다:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      
      // 개발 환경에서는 임시 데이터 로드 (나중에 제거)
      if (process.env.NODE_ENV === 'development') {
        loadMockData();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 임시 데이터 로드 (개발 환경용)
  const loadMockData = () => {
    // 임시 노드 생성
    const mockNodes: TagNode[] = [];
    const tagNames = [
      '머신러닝', '딥러닝', '자연어처리', '컴퓨터비전', 
      '강화학습', '파이썬', '데이터분석', 'AI윤리', 
      '인공지능', '알고리즘', '데이터시각화', '통계학',
      '신경망', '클라우드컴퓨팅', '빅데이터', '웹개발'
    ];
    
    // 랜덤 위치에 노드 배치
    tagNames.forEach((name, index) => {
      const clusterId = Math.floor(index / 4); // 4개씩 같은 클러스터
      mockNodes.push({
        id: `tag-${index + 1}`,
        name,
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        cluster_id: clusterId,
        weight: 0.5 + Math.random() * 0.5 // 0.5 ~ 1.0 랜덤 가중치
      });
    });
    
    // 임시 엣지 생성
    const mockEdges: TagEdge[] = [];
    
    // 같은 클러스터 내 노드들은 서로 연결
    for (let i = 0; i < mockNodes.length; i++) {
      for (let j = i + 1; j < mockNodes.length; j++) {
        if (mockNodes[i].cluster_id === mockNodes[j].cluster_id) {
          mockEdges.push({
            source: mockNodes[i].id,
            target: mockNodes[j].id,
            strength: 0.3 + Math.random() * 0.7 // 0.3 ~ 1.0 랜덤 강도
          });
        }
      }
    }
    
    // 클러스터 간 몇 개의 연결 추가
    for (let i = 0; i < 10; i++) {
      const sourceIndex = Math.floor(Math.random() * mockNodes.length);
      const targetIndex = Math.floor(Math.random() * mockNodes.length);
      
      // 서로 다른 클러스터의 노드만 연결
      if (sourceIndex !== targetIndex && 
          mockNodes[sourceIndex].cluster_id !== mockNodes[targetIndex].cluster_id) {
        mockEdges.push({
          source: mockNodes[sourceIndex].id,
          target: mockNodes[targetIndex].id,
          strength: 0.1 + Math.random() * 0.3 // 0.1 ~ 0.4 랜덤 강도 (클러스터 내 연결보다 약함)
        });
      }
    }
    
    // 클러스터 정보 생성
    const mockClusters: Record<number, string[]> = {};
    mockNodes.forEach(node => {
      if (node.cluster_id !== undefined) {
        if (!mockClusters[node.cluster_id]) {
          mockClusters[node.cluster_id] = [];
        }
        mockClusters[node.cluster_id].push(node.id);
      }
    });
    
    // 임시 데이터 설정
    setGraphData({
      nodes: mockNodes,
      edges: mockEdges,
      clusters: mockClusters
    });
  };
  
  // 클러스터 필터링된 데이터 계산
  const getFilteredGraphData = () => {
    if (!showAllTags && clusterFilter.length > 0) {
      // 선택된 클러스터에 속한 노드만 필터링
      const filteredNodes = graphData.nodes.filter(node => 
        node.cluster_id !== undefined && clusterFilter.includes(node.cluster_id)
      );
      
      // 필터링된 노드에 연결된 엣지만 필터링
      const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
      const filteredEdges = graphData.edges.filter(edge => 
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
      );
      
      return {
        nodes: filteredNodes,
        edges: filteredEdges,
        clusters: graphData.clusters
      };
    }
    
    return graphData;
  };
  
  // 설정 메뉴
  const settingsMenu = (
    <Menu>
      <Menu.Item key="all-tags">
        <Checkbox 
          checked={showAllTags} 
          onChange={e => setShowAllTags(e.target.checked)}
        >
          모든 태그 표시
        </Checkbox>
      </Menu.Item>
      
      <Menu.Divider />
      
      <Menu.ItemGroup title="클러스터 필터">
        {Object.keys(graphData.clusters).map((clusterId) => (
          <Menu.Item key={`cluster-${clusterId}`}>
            <Checkbox 
              disabled={showAllTags}
              checked={clusterFilter.includes(Number(clusterId))}
              onChange={e => {
                if (e.target.checked) {
                  setClusterFilter([...clusterFilter, Number(clusterId)]);
                } else {
                  setClusterFilter(clusterFilter.filter(id => id !== Number(clusterId)));
                }
              }}
            >
              클러스터 {Number(clusterId) + 1}
            </Checkbox>
          </Menu.Item>
        ))}
      </Menu.ItemGroup>
      
      <Menu.Divider />
      
      <Menu.Item key="dark-mode">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>다크 모드</span>
          <Switch 
            size="small" 
            checked={isDarkMode} 
            onChange={checked => setIsDarkMode(checked)} 
          />
        </div>
      </Menu.Item>
    </Menu>
  );
  
  // 태그 클릭 핸들러
  const handleTagClick = (tagId: string, tagName: string) => {
    if (onTagSelect) {
      onTagSelect(tagId, tagName);
    }
  };
  
  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>태그 관계도</span>
          <div>
            <Tooltip title="태그 관계도 새로고침">
              <Button 
                icon={<ReloadOutlined />} 
                size="small" 
                style={{ marginRight: 8 }}
                onClick={fetchTagGraphData}
                loading={loading}
              />
            </Tooltip>
            <Dropdown 
              overlay={settingsMenu} 
              trigger={['click']}
              visible={settingsVisible}
              onVisibleChange={visible => setSettingsVisible(visible)}
            >
              <Button 
                icon={<SettingOutlined />} 
                size="small" 
                style={{ marginRight: 8 }}
              />
            </Dropdown>
            <Tooltip title="태그 간의 관계를 3D 그래프로 시각화합니다. 태그를 클릭하여 선택할 수 있습니다.">
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          </div>
        </div>
      }
      bodyStyle={{ padding: 0 }}
      style={{ width: '100%' }}
    >
      {loading ? (
        <div style={{ 
          height, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          background: isDarkMode ? '#1a1a1a' : '#f7f7f7',
          borderRadius: '0 0 4px 4px'
        }}>
          <Spin tip="태그 관계 데이터 로딩 중..." />
        </div>
      ) : error ? (
        <div style={{ 
          height, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          background: isDarkMode ? '#1a1a1a' : '#f7f7f7',
          color: isDarkMode ? '#fff' : '#333',
          borderRadius: '0 0 4px 4px',
          padding: '20px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <InfoCircleOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px' }}>데이터 로드 실패</h3>
            <p style={{ margin: 0, color: isDarkMode ? '#ccc' : '#666' }}>{error}</p>
          </div>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={fetchTagGraphData}
            style={{ marginTop: '16px' }}
          >
            다시 시도
          </Button>
        </div>
      ) : (
        <TagGraph3D 
          data={getFilteredGraphData()} 
          onTagClick={handleTagClick} 
          height={height}
          darkMode={isDarkMode}
        />
      )}
    </Card>
  );
};

export default TagRelationshipViewer;
