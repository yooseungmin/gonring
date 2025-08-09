'use client';

import React, { useState } from 'react';
import { XCircle, Search, Filter } from 'lucide-react';

interface SearchFiltersProps {
  keyword: string;
  tags: string[];
  onKeywordChange: (keyword: string) => void;
  onTagsChange: (tags: string[]) => void;
  onSearch: () => void;
  className?: string;
}

export default function SearchFilters({
  keyword,
  tags,
  onKeywordChange,
  onTagsChange,
  onSearch,
  className = ''
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [inputValue, setInputValue] = useState(keyword);

  // 키워드 입력 처리
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 키워드 입력 후 Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onKeywordChange(inputValue);
      onSearch();
    }
  };

  // 태그 제거 처리
  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(updatedTags);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 검색 입력 필드 */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleKeywordChange}
          onKeyDown={handleKeyDown}
          placeholder="검색어를 입력하세요..."
          className="w-full px-4 py-2 pl-10 pr-12 rounded-md border border-notion-gray-200 focus:border-notion-blue focus:ring-1 focus:ring-notion-blue transition-all font-light text-notion-black"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" size={18} />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
          {inputValue && (
            <button 
              onClick={() => {
                setInputValue('');
                onKeywordChange('');
              }}
              className="text-notion-gray-400 hover:text-notion-gray-600 transition-colors duration-fast"
            >
              <XCircle size={18} />
            </button>
          )}
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`text-notion-gray-400 hover:text-notion-gray-600 transition-colors duration-fast ${showFilters ? 'text-notion-blue' : ''}`}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* 선택된 태그 표시 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {tags.map(tag => (
            <div 
              key={tag} 
              className="flex items-center bg-notion-blue bg-opacity-10 text-notion-blue px-2 py-1 rounded-md text-sm border border-notion-blue border-opacity-20 font-light"
            >
              <span>{tag}</span>
              <button 
                onClick={() => removeTag(tag)} 
                className="ml-1 text-notion-blue opacity-70 hover:opacity-100 transition-opacity duration-fast"
              >
                <XCircle size={14} />
              </button>
            </div>
          ))}
          
          {tags.length > 0 && (
            <button 
              onClick={() => onTagsChange([])} 
              className="text-sm text-notion-gray-500 hover:text-notion-gray-700 px-2 font-light transition-colors duration-fast"
            >
              모든 태그 지우기
            </button>
          )}
        </div>
      )}

      {/* 상세 필터 영역 (토글) */}
      {showFilters && (
        <div className="p-3 bg-notion-gray-50 rounded-md border border-notion-gray-200 shadow-sm">
          <h4 className="font-light text-notion-black mb-2">고급 검색 옵션</h4>
          
          <div className="space-y-2">
            {/* 추가 필터 옵션들을 여기에 구현할 수 있습니다 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="title-only"
                className="rounded text-notion-blue focus:ring-notion-blue focus:ring-offset-0 focus:ring-1 mr-2"
              />
              <label htmlFor="title-only" className="text-sm text-notion-gray-700 font-light">제목만 검색</label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="exact-match"
                className="rounded text-notion-blue focus:ring-notion-blue focus:ring-offset-0 focus:ring-1 mr-2"
              />
              <label htmlFor="exact-match" className="text-sm text-notion-gray-700 font-light">정확히 일치하는 항목만</label>
            </div>
            
            {/* 정렬 옵션 */}
            <div className="pt-2">
              <label htmlFor="sort-option" className="block text-sm text-notion-gray-700 mb-1 font-light">정렬:</label>
              <select
                id="sort-option"
                className="w-full rounded-md border-notion-gray-200 text-sm font-light focus:border-notion-blue focus:ring-notion-blue focus:ring-1"
              >
                <option value="relevance">관련성</option>
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
              </select>
            </div>
          </div>
          
          <div className="mt-3 flex justify-end">
            <button
              onClick={onSearch}
              className="px-3 py-1 bg-notion-blue text-white rounded-md text-sm font-light hover:bg-opacity-90 transition-colors duration-fast"
            >
              필터 적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
