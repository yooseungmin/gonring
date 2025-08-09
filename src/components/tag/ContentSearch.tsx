'use client';

import { useState } from 'react';
import { analysisApi, SearchRequest, SearchResultItem } from '../../lib/analysisApi';
import { X } from 'lucide-react';

interface ContentSearchProps {
  onResultSelect?: (result: SearchResultItem) => void;
}

export function ContentSearch({ onResultSelect }: ContentSearchProps) {
  const [query, setQuery] = useState('');
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [totalResults, setTotalResults] = useState(0);

  // 검색 실행
  const handleSearch = async () => {
    if (!query.trim() && includeTags.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const request: SearchRequest = {
        query: query.trim(),
        include_tags: includeTags.length > 0 ? includeTags : undefined,
        exclude_tags: excludeTags.length > 0 ? excludeTags : undefined,
        max_results: 20
      };
      
      const response = await analysisApi.searchContent(request);
      setResults(response.results);
      setTotalResults(response.total_count);
    } catch (err) {
      console.error('검색 중 오류 발생:', err);
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 태그 추가 처리
  const handleAddTag = (type: 'include' | 'exclude') => {
    const tag = currentTag.trim();
    if (!tag) return;

    if (type === 'include' && !includeTags.includes(tag)) {
      setIncludeTags([...includeTags, tag]);
    } else if (type === 'exclude' && !excludeTags.includes(tag)) {
      setExcludeTags([...excludeTags, tag]);
    }
    
    setCurrentTag('');
  };

  // 태그 제거 처리
  const handleRemoveTag = (type: 'include' | 'exclude', tag: string) => {
    if (type === 'include') {
      setIncludeTags(includeTags.filter(t => t !== tag));
    } else {
      setExcludeTags(excludeTags.filter(t => t !== tag));
    }
  };

  // 결과 선택 처리
  const handleResultClick = (result: SearchResultItem) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  return (
    <div className="content-search p-4 border border-notion-gray-200 rounded-md bg-white shadow-sm">
      <div className="flex flex-col space-y-4">
        {/* 검색어 입력 */}
        <div>
          <label htmlFor="search-query" className="block text-sm font-light text-notion-black mb-1">검색어</label>
          <div className="flex">
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 rounded-md border border-notion-gray-200 p-2 text-sm font-light focus:outline-none focus:border-notion-blue focus:ring-1 focus:ring-notion-blue"
              placeholder="검색어를 입력하세요"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading || (!query.trim() && includeTags.length === 0)}
              className="ml-2 px-4 py-2 bg-notion-blue text-white rounded-md text-sm font-light disabled:bg-notion-gray-300 transition-colors duration-fast"
            >
              검색
            </button>
          </div>
        </div>

        {/* 태그 필터 */}
        <div>
          <div className="flex flex-col space-y-2">
            <div>
              <label htmlFor="include-tag" className="block text-sm font-light text-notion-black mb-1">포함할 태그</label>
              <div className="flex">
                <input
                  id="include-tag"
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  className="flex-1 rounded-md border border-notion-gray-200 p-2 text-sm font-light focus:outline-none focus:border-notion-blue focus:ring-1 focus:ring-notion-blue"
                  placeholder="태그 입력"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag('include')}
                />
                <button
                  onClick={() => handleAddTag('include')}
                  disabled={!currentTag.trim()}
                  className="ml-2 px-3 py-2 bg-notion-green text-white rounded-md text-sm font-light disabled:bg-notion-gray-300 transition-colors duration-fast"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {includeTags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-notion-green bg-opacity-10 text-notion-green border border-notion-green border-opacity-20 font-light">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag('include', tag)}
                      className="ml-1 text-notion-green opacity-70 hover:opacity-100 transition-opacity duration-fast"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="exclude-tag" className="block text-sm font-light text-notion-black mb-1">제외할 태그</label>
              <div className="flex">
                <input
                  id="exclude-tag"
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  className="flex-1 rounded-md border border-notion-gray-200 p-2 text-sm font-light focus:outline-none focus:border-notion-blue focus:ring-1 focus:ring-notion-blue"
                  placeholder="태그 입력"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag('exclude')}
                />
                <button
                  onClick={() => handleAddTag('exclude')}
                  disabled={!currentTag.trim()}
                  className="ml-2 px-3 py-2 bg-notion-red text-white rounded-md text-sm font-light disabled:bg-notion-gray-300 transition-colors duration-fast"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {excludeTags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-notion-red bg-opacity-10 text-notion-red border border-notion-red border-opacity-20 font-light">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag('exclude', tag)}
                      className="ml-1 text-notion-red opacity-70 hover:opacity-100 transition-opacity duration-fast"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-notion-blue border-t-transparent rounded-full"></div>
            <span className="ml-2 text-notion-gray-600 font-light">검색 중...</span>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="text-notion-red py-2 font-light">{error}</div>
        )}

        {/* 검색 결과 */}
        <div className="mt-2">
          {!loading && results.length > 0 && (
            <>
              <div className="text-sm text-notion-gray-500 mb-2 font-light">총 {totalResults}개의 결과</div>
              <div className="space-y-4">
                {results.map(result => (
                  <div 
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="p-3 border border-notion-gray-200 rounded-md hover:bg-notion-gray-50 cursor-pointer transition-colors duration-fast"
                  >
                    <div className="font-normal text-notion-blue">{result.title}</div>
                    <div className="text-sm text-notion-gray-700 mt-1 font-light">{result.excerpt}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-notion-gray-100 text-notion-gray-700 border border-notion-gray-200 rounded-md text-xs font-light">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {!loading && results.length === 0 && query && (
            <div className="text-center py-8 text-notion-gray-500 font-light">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
