'use client';

import React, { useState } from 'react';
import { X, Tag as TagIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { TagCloudItem } from '@/lib/searchApi';

interface TagSelectorProps {
  tags: TagCloudItem[];
  selectedTags: string[];
  onSelect: (tags: string[]) => void;
  maxSelected?: number;
  className?: string;
  maxVisibleTags?: number;
}

export default function TagSelector({
  tags,
  selectedTags,
  onSelect,
  maxSelected = 5,
  className = '',
  maxVisibleTags = 15
}: TagSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 태그 필터링
  const filteredTags = searchTerm
    ? tags.filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : tags;

  // 표시할 태그 (접혀있을 때는 제한된 수만 표시)
  const visibleTags = isExpanded ? filteredTags : filteredTags.slice(0, maxVisibleTags);

  // 태그 선택 토글
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      // 태그 제거
      onSelect(selectedTags.filter(t => t !== tagName));
    } else if (selectedTags.length < maxSelected) {
      // 태그 추가
      onSelect([...selectedTags, tagName]);
    }
  };

  // 선택된 태그 개수
  const selectedCount = selectedTags.length;

  return (
    <div className={`bg-white rounded-md ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center">
          <TagIcon size={16} className="text-notion-gray-700 mr-1" />
          <span className="text-sm font-medium text-notion-black">
            관련 태그 선택
          </span>
        </div>
        <span className="text-xs text-notion-gray-700">
          {selectedCount}/{maxSelected}
        </span>
      </div>

      {/* 검색 */}
      <div className="mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="태그 검색..."
          className="w-full p-2 text-sm border border-notion-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-tb-yellow"
        />
      </div>

      {/* 선택된 태그 */}
      {selectedTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedTags.map(tagName => (
            <div
              key={tagName}
              className="inline-flex items-center px-2 py-1 rounded-md bg-tb-yellow bg-opacity-20 text-sm"
            >
              <span className="mr-1">{tagName}</span>
              <button
                onClick={() => toggleTag(tagName)}
                className="text-notion-gray-700 hover:text-notion-black"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 태그 목록 */}
      <div className="flex flex-wrap gap-2">
        {visibleTags.length > 0 ? (
          visibleTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              disabled={selectedTags.length >= maxSelected && !selectedTags.includes(tag.name)}
              className={`px-2 py-1 rounded-md text-xs transition-colors
                ${selectedTags.includes(tag.name) 
                  ? 'bg-tb-yellow bg-opacity-20 text-notion-black' 
                  : 'bg-notion-gray-50 text-notion-gray-700 hover:bg-notion-gray-100'}
                ${selectedTags.length >= maxSelected && !selectedTags.includes(tag.name) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'}`
              }
            >
              {tag.name}
              {tag.count && <span className="ml-1 text-notion-gray-500">({tag.count})</span>}
            </button>
          ))
        ) : (
          <div className="w-full text-center py-2 text-sm text-notion-gray-700">
            {searchTerm ? '검색 결과가 없습니다' : '태그가 없습니다'}
          </div>
        )}
      </div>

      {/* 더보기/접기 버튼 */}
      {filteredTags.length > maxVisibleTags && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2 py-1 text-xs text-notion-gray-700 hover:text-notion-black flex items-center justify-center"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} className="mr-1" /> 접기
            </>
          ) : (
            <>
              <ChevronDown size={14} className="mr-1" /> 더보기 ({filteredTags.length - maxVisibleTags}+)
            </>
          )}
        </button>
      )}
    </div>
  );
}
