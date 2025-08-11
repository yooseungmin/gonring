import { apiClient } from './apiClient';
import { ApiResponse, BoxListParams, BoxListResponse, ContentListParams } from '../types/api';
import { 
  Box, 
  BoxCreateRequest, 
  BoxUpdateRequest,
  Content, 
  ContentCreateRequest, 
  ContentUpdateRequest,
  Tag as ModelTag 
} from '../types/models';
import {
  ContentBrief,
  TagCreate,
  TagRecommendRequest,
  TagRecommendResponse,
  Attachment
} from '../types/box';
import { v4 as uuidv4 } from 'uuid';

// Box API 함수
export const boxApi = {
  /**
   * 새로운 박스 생성
   */
  async createBox(data: BoxCreateRequest): Promise<ApiResponse<Box>> {
    return apiClient.fetchWithAuth<Box>('/api/boxes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 내 박스 목록 가져오기
   * @param params 검색 파라미터
   */
  async getMyBoxes(params?: BoxListParams): Promise<ApiResponse<Box[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `/api/boxes?${queryString}` : '/api/boxes';
    
    // 일단 unknown으로 받아 형식을 확인한 후 적절히 처리
    const response = await apiClient.fetchWithAuth<unknown>(url, {
      method: 'GET',
    });
    
    // API 응답 처리
    if (response.success && response.data) {
      // BoxListResponse 형식인 경우 (boxes 속성이 있는 경우)
      if (typeof response.data === 'object' && response.data !== null && 'boxes' in response.data && Array.isArray(response.data.boxes)) {
        return {
          success: true,
          data: response.data.boxes as Box[],
          message: response.message
        };
      }
      
      // 이미 Box[] 배열인 경우
      if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data as Box[],
          message: response.message
        };
      }
      
      // 데이터 형식 오류
      return {
        success: false,
        message: '데이터 형식 오류: 박스 목록이 올바른 형식이 아닙니다.'
      };
    }
    
    return {
      success: false,
      message: response.message || '박스 목록을 가져오는데 실패했습니다.'
    };
  },

  /**
   * 특정 박스 정보 가져오기
   */
  async getBox(boxId: string): Promise<ApiResponse<Box>> {
    return apiClient.fetchWithAuth<Box>(`/api/boxes/${boxId}`, {
      method: 'GET',
    });
  },

  /**
   * 박스 정보 업데이트
   */
  async updateBox(boxId: string, data: BoxUpdateRequest): Promise<ApiResponse<Box>> {
    return apiClient.fetchWithAuth<Box>(`/api/boxes/${boxId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 박스 삭제
   */
  async deleteBox(boxId: string): Promise<ApiResponse<void>> {
    return apiClient.fetchWithAuth<void>(`/api/boxes/${boxId}`, {
      method: 'DELETE',
    });
  }
};

// Content API 함수
export const contentApi = {
  /**
   * 새로운 콘텐츠 생성
   */
  async createContent(boxId: string, data: ContentCreateRequest): Promise<ApiResponse<Content>> {
    return apiClient.fetchWithAuth<Content>(`/api/${boxId}/contents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 박스 내 콘텐츠 목록 가져오기
   * @param boxId 박스 ID
   * @param params 검색 파라미터
   */
  async getBoxContents(boxId: string, params?: Omit<ContentListParams, 'box_id'>): Promise<ApiResponse<ContentBrief[]>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(`${key}[]`, String(v)));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `/api/${boxId}/contents?${queryString}` : `/api/${boxId}/contents`;
    
    return apiClient.fetchWithAuth<ContentBrief[]>(url, {
      method: 'GET',
    });
  },

  /**
   * 특정 콘텐츠 정보 가져오기
   */
  async getContent(contentId: string): Promise<ApiResponse<Content>> {
    return apiClient.fetchWithAuth<Content>(`/api/contents/${contentId}`, {
      method: 'GET',
    });
  },

  /**
   * 콘텐츠 업데이트
   */
  async updateContent(contentId: string, data: ContentUpdateRequest): Promise<ApiResponse<Content>> {
    return apiClient.fetchWithAuth<Content>(`/api/contents/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 콘텐츠 삭제
   */
  async deleteContent(contentId: string): Promise<ApiResponse<void>> {
    return apiClient.fetchWithAuth<void>(`/api/contents/${contentId}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * 태그 추천 요청
   */
  async recommendTags(data: TagRecommendRequest): Promise<ApiResponse<TagRecommendResponse>> {
    return apiClient.fetchWithAuth<TagRecommendResponse>('/api/recommend-tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};
