/**
 * 분석 API 관련 타입 정의
 */

export namespace Analysis {
  /**
   * 태그 추천 시스템의 태그
   */
  export interface RecommendedTag {
    name: string;
    score: number;
    category?: string;
  }

  /**
   * 태그 추천 요청 데이터
   */
  export interface TagRecommendationRequest {
    content: string;
    max_tags?: number;
    categories?: string[];
  }

  /**
   * 태그 추천 응답 데이터
   */
  export interface TagRecommendationResponse {
    tags: RecommendedTag[];
  }

  /**
   * 콘텐츠 검색 요청 데이터
   */
  export interface SearchRequest {
    query: string;
    max_results?: number;
    include_tags?: string[];
    exclude_tags?: string[];
  }

  /**
   * 검색 결과 아이템
   */
  export interface SearchResultItem {
    id: string;
    title: string;
    excerpt: string;
    score: number;
    tags: string[];
    url?: string;
  }

  /**
   * 검색 응답 데이터
   */
  export interface SearchResponse {
    results: SearchResultItem[];
    total_count: number;
    page: number;
    total_pages: number;
  }
}
