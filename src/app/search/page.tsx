'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchFilters from '@/components/search/SearchFilters';
import SearchResults from '@/components/search/SearchResults';
import TagCloud from '@/components/tag/TagCloud';
import TagGraph3D from '@/components/tag/TagGraph3D';
import BrandButton from '@/components/brand/BrandButton';
import BrandTag from '@/components/brand/BrandTag';
import { Zap, List } from 'lucide-react';
import { 
  SearchResultItem, 
  TagCloudItem,
  searchApi
} from '@/lib/searchApi';

// 목업 태그 그래프 데이터
const mockTagGraphData = {
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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 검색 상태
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',') : []
  );
  
  // 결과 상태
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [tagCloud, setTagCloud] = useState<TagCloudItem[]>([]);
  const [relatedTags, setRelatedTags] = useState<TagCloudItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  
  // 검색 실행 함수
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      // 검색 쿼리 파라미터 업데이트
      const params = new URLSearchParams();
      if (keyword) params.set('q', keyword);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      
      // URL 업데이트 (히스토리에 기록)
      router.push(`/search?${params.toString()}`);
      
      // 검색 API 호출
      const response = await searchApi.searchContents({
        keyword,
        tags: selectedTags,
        page: 1,
        limit: 20
      });
      
      if (response.success) {
        setSearchResults(response.data.items);
      }
      
      // 선택된 태그가 있으면 관련 태그 가져오기
      if (selectedTags.length > 0) {
        const relatedResponse = await searchApi.getRelatedTags(selectedTags[0]);
        if (relatedResponse.success) {
          setRelatedTags(relatedResponse.data.tags);
        }
      } else {
        setRelatedTags([]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [keyword, selectedTags, router]);
  
  // 태그 클라우드 로드
  const loadTagCloud = useCallback(async () => {
    try {
      const response = await searchApi.getTagCloud();
      if (response.success) {
        setTagCloud(response.data.tags);
      }
    } catch (error) {
      console.error('Error loading tag cloud:', error);
    }
  }, []);
  
  // 태그 선택 처리
  const handleTagSelect = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      const newTags = [...selectedTags, tagName];
      setSelectedTags(newTags);
    }
  };
  
  // 초기 로드 및 검색 파라미터 변경 시 검색 실행
  useEffect(() => {
    loadTagCloud();
    performSearch();
  }, [loadTagCloud]);
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-2xl font-light text-notion-black mb-6">콘텐츠 검색</h1>
      
      <div className="mb-4 flex items-center justify-between">
        <div>
          {isLoading ? (
            <p className="text-notion-gray-700">검색 중...</p>
          ) : (
            <p className="text-notion-gray-700">
              {searchResults.length}개의 결과가 발견되었습니다
            </p>
          )}
        </div>
        
        <BrandButton 
          variant="secondary" 
          size="small" 
          icon={showGraph ? List : Zap}
          onClick={() => setShowGraph(!showGraph)}
        >
          {showGraph ? "결과 목록 보기" : "태그 그래프 보기"}
        </BrandButton>
      </div>
      
      {showGraph ? (
        // 태그 그래프 뷰
        <div className="h-[700px] relative">
          <div className="bg-white border border-notion-gray-200 rounded-md shadow-sm p-4 mb-4">
            <h3 className="text-xl font-light text-notion-black mb-2">태그 관계 그래프</h3>
            <p className="text-notion-gray-700">
              관련 태그들 간의 연결 관계를 시각화합니다. 클러스터로 묶인 태그들은 비슷한 주제를 가지고 있습니다.
              마우스로 드래그하여 회전하고, 스크롤하여 확대/축소할 수 있습니다.
            </p>
          </div>
          <TagGraph3D 
            data={mockTagGraphData} 
            onTagClick={(tagId, tagName) => handleTagSelect(tagName)}
            height="600px"
            className="shadow-md"
          />
        </div>
      ) : (
        // 기존 결과 목록 뷰
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 사이드바: 태그 클라우드 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-4 rounded-md shadow-sm border border-notion-gray-200">
              <h3 className="text-lg font-light text-notion-black mb-3">인기 태그</h3>
              <TagCloud 
                tags={tagCloud} 
                onTagClick={handleTagSelect}
                activeTags={selectedTags}
                className="py-2" 
              />
            </div>
            
            {selectedTags.length > 0 && relatedTags.length > 0 && (
              <div className="bg-white p-4 rounded-md shadow-sm border border-notion-gray-200">
                <h3 className="text-lg font-light text-notion-black mb-3">관련 태그</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedTags.map(tag => (
                    <BrandTag
                      key={tag.id}
                      text={tag.name}
                      variant={selectedTags.includes(tag.name) ? "highlight" : "default"}
                      size="medium"
                      onClick={() => handleTagSelect(tag.name)}
                      disabled={selectedTags.includes(tag.name)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 메인: 검색 필터 및 결과 */}
          <div className="lg:col-span-3 space-y-4">
            <SearchFilters 
              keyword={keyword}
              tags={selectedTags}
              onKeywordChange={setKeyword}
              onTagsChange={setSelectedTags}
              onSearch={performSearch}
            />
            
            {isLoading ? (
              <div className="p-8 text-center bg-notion-gray-50 rounded-md border border-notion-gray-200">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notion-blue mx-auto"></div>
                <p className="mt-2 text-notion-gray-500 font-light">검색 중...</p>
              </div>
            ) : (
              <SearchResults 
                results={searchResults} 
                onTagClick={handleTagSelect}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
