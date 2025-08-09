// src/lib/analysisApi.ts
import axios from 'axios';

// API 기본 URL 설정 - Next.js 환경변수 사용
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

// 인증된 axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 토큰 가져오기 함수 (브라우저 환경에서만 동작)
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// 요청 인터셉터 설정 - 모든 요청에 인증 토큰 추가
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface Tag {
  name: string;
  score: number;
  category?: string;
}

export interface TagRecommendationRequest {
  content: string;
  max_tags?: number;
  categories?: string[];
}

export interface TagRecommendationResponse {
  tags: Tag[];
}

export interface SearchRequest {
  query: string;
  max_results?: number;
  include_tags?: string[];
  exclude_tags?: string[];
}

export interface SearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  tags: string[];
  url?: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total_count: number;
  page: number;
  total_pages: number;
}

/**
 * 분석 모듈 API 클라이언트
 */
class AnalysisApiClient {
  /**
   * 콘텐츠에서 태그를 추천받습니다.
   * @param data 태그 추천 요청 데이터
   * @returns 추천된 태그 목록
   */
  async getRecommendedTags(data: TagRecommendationRequest): Promise<TagRecommendationResponse> {
    try {
      const response = await axiosInstance.post('/analysis/recommend-tags', data);
      return response.data;
    } catch (error) {
      console.error('Error getting tag recommendations:', error);
      // 에러 발생 시 빈 태그 목록 반환
      return { tags: [] };
    }
  }

  /**
   * 쿼리와 태그를 기반으로 콘텐츠를 검색합니다.
   * @param data 검색 요청 데이터
   * @returns 검색 결과
   */
  async searchContent(data: SearchRequest): Promise<SearchResponse> {
    try {
      const response = await axiosInstance.post('/analysis/search', data);
      return response.data;
    } catch (error) {
      console.error('Error searching content:', error);
      // 에러 발생 시 빈 검색 결과 반환
      return {
        results: [],
        total_count: 0,
        page: 1,
        total_pages: 1
      };
    }
  }
}

export const analysisApi = new AnalysisApiClient();
