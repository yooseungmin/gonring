'use client';

import { useState, useEffect } from 'react';
import { analysisApi, TagRecommendationRequest, Tag } from '../../lib/analysisApi';

interface TagRecommenderProps {
  content: string;
  maxTags?: number;
  onTagSelect?: (tag: string) => void;
  selectedTags?: string[];
}

export function TagRecommender({ 
  content, 
  maxTags = 10,
  onTagSelect,
  selectedTags = []
}: TagRecommenderProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 컨텐츠가 변경되면 태그 추천을 다시 가져오기
  useEffect(() => {
    // 컨텐츠가 있는 경우에만 API 호출
    if (content && content.trim().length > 10) {
      // 디바운싱을 적용하여 너무 빈번한 API 호출 방지
      const debounceTimeout = setTimeout(() => {
        fetchRecommendedTags();
      }, 1000); // 1초 디바운싱
      
      return () => clearTimeout(debounceTimeout);
    }
  }, [content]);
  
  // 태그 추천 API 호출
  const fetchRecommendedTags = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const request: TagRecommendationRequest = {
        content,
        max_tags: maxTags,
      };
      
      const response = await analysisApi.getRecommendedTags(request);
      setTags(response.tags);
    } catch (err) {
      console.error('태그 추천 중 오류 발생:', err);
      setError('태그를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 태그 클릭 핸들러
  const handleTagClick = (tag: Tag) => {
    if (onTagSelect) {
      onTagSelect(tag.name);
    }
  };
  
  return (
    <div className="tag-recommender my-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium text-gray-700">추천 태그</div>
        {!loading && content && content.trim().length > 10 && (
          <button 
            onClick={fetchRecommendedTags}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            다시 분석
          </button>
        )}
      </div>
      
      {loading && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 font-light bg-gray-50 p-3 rounded-md">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>내용 분석 중... 잠시만 기다려주세요.</span>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mt-2">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);
          const confidenceClass = tag.score > 0.8 
            ? 'border-green-300 bg-green-50' 
            : tag.score > 0.5 
              ? 'border-blue-300 bg-blue-50' 
              : 'border-gray-300 bg-gray-50';
          
          return (
            <button
              key={tag.name}
              onClick={() => handleTagClick(tag)}
              className={`
                px-3 py-1 rounded-md text-sm border transition-all duration-200
                ${isSelected 
                  ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm' 
                  : `text-gray-700 hover:bg-gray-100 ${confidenceClass}`
                }
              `}
              title={`신뢰도: ${Math.round(tag.score * 100)}%`}
            >
              <span className="flex items-center">
                {isSelected ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                {tag.name}
              </span>
            </button>
          );
        })}
        
        {!loading && tags.length === 0 && !error && content && content.trim().length > 10 && (
          <div className="text-sm text-gray-500 font-light bg-gray-50 p-3 rounded-md w-full">
            <p>컨텐츠를 분석한 결과 추천할 태그가 없습니다.</p>
            <p className="mt-1">더 많은 내용을 작성하거나 주제를 더 명확하게 작성해보세요.</p>
          </div>
        )}
        
        {!loading && (!content || content.trim().length <= 10) && (
          <div className="text-sm text-gray-500 font-light bg-gray-50 p-3 rounded-md w-full">
            <p>내용을 더 작성하면 자동으로 태그가 추천됩니다.</p>
            <p className="mt-1">최소 10자 이상 작성해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
