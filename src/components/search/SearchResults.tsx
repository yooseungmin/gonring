'use client';

import React from 'react';
import Link from 'next/link';
import { SearchResultItem } from '@/lib/searchApi';
import { Tag as TagIcon, Calendar, Box } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResultItem[];
  onTagClick?: (tagName: string) => void;
  className?: string;
}

export default function SearchResults({ 
  results, 
  onTagClick,
  className = ''
}: SearchResultsProps) {
  
  if (results.length === 0) {
    return (
      <div className={`p-8 text-center bg-notion-gray-50 rounded-md border border-notion-gray-200 ${className}`}>
        <div className="text-notion-gray-400 mb-2">😕</div>
        <h3 className="text-lg font-light text-notion-black mb-1">검색 결과가 없습니다</h3>
        <p className="text-notion-gray-700">다른 검색어나 태그로 시도해보세요.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {results.map(result => (
        <div 
          key={result.id} 
          className="bg-white rounded-md shadow-sm overflow-hidden border border-notion-gray-200 hover:border-notion-blue hover:border-opacity-30 transition-colors duration-fast"
        >
          <Link href={`/contents/${result.id}`} className="block p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-light text-notion-black">
                {result.title}
              </h3>
              
              {result.relevance_score && (
                <span className="text-xs text-notion-gray-700 bg-notion-gray-100 px-2 py-1 rounded-md">
                  관련도: {Math.round(result.relevance_score * 100)}%
                </span>
              )}
            </div>
            
            {/* 미리보기 텍스트 - HTML로 렌더링하여 하이라이팅 적용 */}
            <div 
              className="text-notion-gray-700 mb-3 text-sm line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.text_preview }}
            />
            
            <div className="flex flex-wrap items-center text-xs text-notion-gray-700 gap-2 mt-3">
              <div className="flex items-center">
                <Box size={14} className="mr-1" />
                <span>{result.box_name}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar size={14} className="mr-1" />
                <span>{new Date(result.created_at).toLocaleDateString()}</span>
              </div>
              
              {/* 태그 목록 */}
              <div className="flex-1 flex flex-wrap gap-1 ml-2">
                {result.tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={(e) => {
                      e.preventDefault();
                      onTagClick && onTagClick(tag.name);
                    }}
                    className="flex items-center bg-notion-blue bg-opacity-10 text-notion-blue px-2 py-0.5 rounded-md hover:bg-opacity-20 transition-colors duration-fast border border-notion-blue border-opacity-20 font-light"
                  >
                    <TagIcon size={10} className="mr-1" />
                    <span>{tag.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
