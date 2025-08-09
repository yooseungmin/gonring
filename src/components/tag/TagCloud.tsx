'use client';

import React from 'react';
import { TagCloudItem } from '@/lib/searchApi';

interface TagCloudProps {
  tags: TagCloudItem[];
  activeTags?: string[];
  onTagClick?: (tagName: string) => void;
  className?: string;
}

export default function TagCloud({ 
  tags, 
  activeTags = [],
  onTagClick,
  className = ''
}: TagCloudProps) {
  // 태그 크기 계산 함수 (태그 빈도수에 따라 상대적 크기 조정 - 노션 스타일은 더 미묘한 차이)
  const getTagSize = (count: number) => {
    const max = Math.max(...tags.map(tag => tag.count));
    const min = Math.min(...tags.map(tag => tag.count));
    const range = max - min || 1;
    
    // 0.85 ~ 1.25 사이의 값으로 변환 (최소 크기 0.85, 최대 크기 1.25) - 노션 스타일은 더 미묘한 차이
    return 0.85 + (0.4 * (count - min) / range);
  };
  
  // 태그 색상 계산 함수 (노션 스타일 미니멀 디자인)
  const getTagStyle = (count: number, isActive: boolean) => {
    if (isActive) {
      return {
        className: 'bg-notion-blue bg-opacity-10 text-notion-blue border-notion-blue',
        opacity: 1
      };
    }
    
    const max = Math.max(...tags.map(tag => tag.count));
    const min = Math.min(...tags.map(tag => tag.count));
    const range = max - min || 1;
    
    // 빈도에 따라 opacity 조절 (0.75 ~ 1.0)
    const opacity = 0.75 + (0.25 * (count - min) / range);
    
    return {
      className: 'bg-notion-gray-100 text-notion-gray-700 border-notion-gray-200 hover:bg-notion-gray-200 hover:text-notion-gray-800',
      opacity
    };
  };

  if (tags.length === 0) {
    return (
      <div className={`p-4 text-center text-notion-gray-700 ${className}`}>
        태그가 없습니다.
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => {
        const isActive = activeTags.includes(tag.name);
        const size = getTagSize(tag.count);
        const { className: tagClassName, opacity } = getTagStyle(tag.count, isActive);
        
        return (
          <button
            key={tag.id}
            onClick={() => onTagClick && onTagClick(tag.name)}
            className={`px-3 py-1 rounded-md border transition-all duration-fast ${tagClassName}`}
            style={{ 
              fontSize: `${size}rem`,
              fontWeight: isActive ? 400 : 300,
              opacity
            }}
            title={`${tag.name} (${tag.count}개)`}
          >
            {tag.name}
            <span className="ml-1 text-xs opacity-70">
              {tag.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
