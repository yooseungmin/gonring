'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TagGraph3D from '@/components/tag/TagGraph3D';
import { ArrowLeft, Loader2, RefreshCw, Info } from 'lucide-react';
import Link from 'next/link';

// 태그 그래프 API 클라이언트 함수
interface TagGraphData {
  nodes: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    cluster_id: number;
    weight: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    strength: number;
  }>;
  clusters: Record<number, string[]>;
}

interface TagRelatedContent {
  id: string;
  title: string;
  text_preview: string;
  created_at: string;
}

// 목업 데이터
const mockTagGraphData: TagGraphData = {
  nodes: [
    { id: "1", name: "AI", x: 0.2, y: 0.5, z: 0.1, cluster_id: 0, weight: 0.9 },
    { id: "2", name: "Machine Learning", x: 0.3, y: 0.4, z: 0.2, cluster_id: 0, weight: 0.85 },
    { id: "3", name: "Python", x: -0.4, y: -0.2, z: 0.1, cluster_id: 1, weight: 0.7 },
    { id: "4", name: "Research", x: -0.3, y: -0.3, z: -0.2, cluster_id: 1, weight: 0.6 },
    { id: "5", name: "Neural Networks", x: 0.1, y: 0.3, z: 0.4, cluster_id: 0, weight: 0.8 },
    { id: "6", name: "Deep Learning", x: 0.2, y: 0.3, z: 0.3, cluster_id: 0, weight: 0.75 },
    { id: "7", name: "Data Science", x: -0.1, y: 0.2, z: -0.3, cluster_id: 2, weight: 0.7 },
    { id: "8", name: "Statistics", x: -0.2, y: 0.1, z: -0.25, cluster_id: 2, weight: 0.6 },
    { id: "9", name: "Programming", x: -0.5, y: -0.1, z: 0.15, cluster_id: 1, weight: 0.65 },
    { id: "10", name: "Algorithm", x: 0, y: -0.3, z: -0.1, cluster_id: 2, weight: 0.7 }
  ],
  edges: [
    { source: "1", target: "2", strength: 0.8 },
    { source: "1", target: "5", strength: 0.7 },
    { source: "2", target: "3", strength: 0.5 },
    { source: "2", target: "5", strength: 0.75 },
    { source: "3", target: "4", strength: 0.4 },
    { source: "4", target: "5", strength: 0.3 },
    { source: "5", target: "6", strength: 0.9 },
    { source: "6", target: "1", strength: 0.65 },
    { source: "7", target: "8", strength: 0.7 },
    { source: "7", target: "2", strength: 0.5 },
    { source: "8", target: "10", strength: 0.6 },
    { source: "9", target: "3", strength: 0.8 },
    { source: "9", target: "10", strength: 0.45 },
    { source: "10", target: "2", strength: 0.4 }
  ],
  clusters: {
    0: ["1", "2", "5", "6"],
    1: ["3", "4", "9"],
    2: ["7", "8", "10"]
  }
};

// 목업 관련 컨텐츠
const mockRelatedContents: Record<string, TagRelatedContent[]> = {
  "1": [
    { id: "c1", title: "Introduction to AI", text_preview: "Artificial Intelligence is transforming industries...", created_at: "2025-07-15" },
    { id: "c2", title: "AI Applications", text_preview: "Real-world applications of AI in healthcare...", created_at: "2025-07-20" }
  ],
  "5": [
    { id: "c3", title: "Neural Networks Basics", text_preview: "Understanding the fundamentals of neural networks...", created_at: "2025-07-18" },
    { id: "c4", title: "CNN Architecture", text_preview: "Convolutional Neural Networks are specialized for...", created_at: "2025-07-22" }
  ]
};

// 목업 박스 정보
const mockBoxInfo = {
  id: "box-1",
  name: "AI Research Notes",
  description: "Collection of notes related to AI research and papers"
};

export default function BoxTagMapPage() {
  const { boxId } = useParams() as { boxId: string };
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<TagGraphData | null>(null);
  const [boxInfo, setBoxInfo] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState<{id: string, name: string} | null>(null);
  const [relatedContents, setRelatedContents] = useState<TagRelatedContent[]>([]);
  
  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 실제 구현에서는 API 호출
        // const response = await fetch(`/api/boxes/${boxId}/tag-graph`);
        // const data = await response.json();
        
        // 목업 데이터 사용
        setTimeout(() => {
          setGraphData(mockTagGraphData);
          setBoxInfo(mockBoxInfo);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading tag graph data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [boxId]);
  
  // 태그 선택 처리
  const handleTagClick = (tagId: string, tagName: string) => {
    setSelectedTag({ id: tagId, name: tagName });
    
    // 관련 컨텐츠 로드
    const contents = mockRelatedContents[tagId] || [];
    setRelatedContents(contents);
  };
  
  // 그래프 새로고침
  const handleRefresh = () => {
    setLoading(true);
    
    // 실제 구현에서는 계산 API 호출 후 데이터 다시 로드
    setTimeout(() => {
      setGraphData(mockTagGraphData);
      setLoading(false);
    }, 1000);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href={`/boxes/${boxId}`} className="flex items-center text-notion-gray-700 hover:text-notion-black mb-2 font-light">
          <ArrowLeft size={16} className="mr-1" />
          박스로 돌아가기
        </Link>
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-light text-notion-black">
            {boxInfo ? boxInfo.name : '태그 맵'} - 지식 그래프
          </h1>
          
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center px-3 py-1.5 bg-notion-gray-100 border border-notion-gray-200 rounded-md text-notion-gray-700 hover:bg-notion-gray-200 transition-colors duration-fast text-sm font-light"
          >
            {loading ? (
              <Loader2 size={16} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={16} className="mr-1.5" />
            )}
            그래프 재계산
          </button>
        </div>
        
        {boxInfo?.description && (
          <p className="text-notion-gray-600 font-light mt-1">{boxInfo.description}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 그래프 영역 */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-notion-gray-200 rounded-md shadow-sm p-4 h-[700px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Loader2 size={30} className="animate-spin text-notion-blue mb-2" />
                  <p className="text-notion-gray-600 font-light">태그 관계도 로딩 중...</p>
                </div>
              </div>
            ) : graphData && graphData.nodes.length > 0 ? (
              <TagGraph3D 
                data={graphData} 
                onTagClick={handleTagClick}
                height="100%"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Info size={30} className="text-notion-gray-400 mb-2" />
                  <p className="text-notion-gray-600 font-light">태그 관계 데이터가 없습니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 관련 콘텐츠 패널 */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-notion-gray-200 rounded-md shadow-sm p-4 h-[700px] overflow-y-auto">
            {selectedTag ? (
              <>
                <h2 className="text-xl font-light text-notion-blue mb-4 flex items-center">
                  <span className="text-notion-gray-600 mr-2">#</span>
                  {selectedTag.name}
                </h2>
                
                {relatedContents.length > 0 ? (
                  <div className="space-y-4">
                    {relatedContents.map((content) => (
                      <Link 
                        key={content.id}
                        href={`/contents/${content.id}`}
                        className="block p-3 border border-notion-gray-200 hover:border-notion-blue hover:bg-notion-gray-50 rounded-md transition-colors duration-fast"
                      >
                        <h3 className="text-notion-black font-light mb-1">{content.title}</h3>
                        <p className="text-notion-gray-600 text-sm font-light line-clamp-2 mb-2">
                          {content.text_preview}
                        </p>
                        <div className="text-notion-gray-500 text-xs font-light">
                          {content.created_at}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-notion-gray-500 font-light">
                      이 태그와 관련된 콘텐츠가 없습니다.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-notion-gray-500 font-light mb-2">
                  태그를 클릭하여 관련 콘텐츠를 확인하세요.
                </p>
                <p className="text-notion-gray-400 text-sm font-light">
                  태그 간의 관계를 시각적으로 탐색할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
