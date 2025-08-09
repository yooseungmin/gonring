import { apiClient } from '@/lib/apiClient';
import { v4 as uuidv4 } from 'uuid';

export interface Box {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  content_count: number;
  child_box_count: number;
}

export interface BoxCreate {
  name: string;
  description?: string;
  is_public?: boolean;
  parent_id?: string | null;
}

export interface BoxUpdate {
  name?: string;
  description?: string;
  is_public?: boolean;
  parent_id?: string | null;
}

export interface Content {
  id: string;
  title?: string;
  text_content: string;
  markdown_content?: string;
  html_content?: string;
  url?: string;
  box_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface ContentDetail {
  id: string;
  title?: string;
  text_content: string;
  markdown_content?: string;
  html_content?: string;
  url?: string;
  box_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface ContentBrief {
  id: string;
  title?: string;
  text_preview?: string;
  created_at: string;
  updated_at?: string;
  tag_count: number;
}

export interface ContentCreate {
  title?: string;
  text_content: string;
  markdown_content?: string;
  html_content?: string;
  url?: string;
  tags?: TagCreate[];
}

export interface ContentUpdate {
  title?: string;
  text_content?: string;
  markdown_content?: string;
  html_content?: string;
  url?: string;
  tags?: TagCreate[];
}

export interface Tag {
  id: string;
  name: string;
  content_id: string;
  user_id: string;
  scope: string;
  score?: number;
  created_at: string;
  updated_at?: string;
}

export interface TagCreate {
  name: string;
  scope?: string;
  score?: number;
}

export interface TagRecommendRequest {
  text: string;
  count?: number;
  min_score?: number;
}

export interface TagRecommendResponse {
  tags: TagCreate[];
  analysis?: any;
}

export interface Attachment {
  id: string;
  content_id: string;
  file_name: string;
  file_path: string;
  file_size?: string;
  mime_type?: string;
  created_at: string;
}

// Box API 함수
export const boxApi = {
  /**
   * 새로운 박스 생성
   */
  async createBox(data: BoxCreate) {
    return apiClient.fetchWithAuth('/api/boxes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 내 박스 목록 가져오기
   * @param parentId 상위 박스 ID (옵션)
   */
  async getMyBoxes(parentId?: string | null) {
    const url = parentId 
      ? `/api/boxes?parent_id=${parentId}`
      : '/api/boxes';
    
    return apiClient.fetchWithAuth(url, {
      method: 'GET',
    });
  },

  /**
   * 특정 박스 정보 가져오기
   */
  async getBox(boxId: string) {
    return apiClient.fetchWithAuth(`/api/boxes/${boxId}`, {
      method: 'GET',
    });
  },

  /**
   * 박스 정보 업데이트
   */
  async updateBox(boxId: string, data: BoxUpdate) {
    return apiClient.fetchWithAuth(`/api/boxes/${boxId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 박스 삭제
   */
  async deleteBox(boxId: string) {
    return apiClient.fetchWithAuth(`/api/boxes/${boxId}`, {
      method: 'DELETE',
    });
  },
};

// Content API 함수
export const contentApi = {
  /**
   * 새로운 콘텐츠 생성
   */
  async createContent(boxId: string, data: ContentCreate) {
    return apiClient.fetchWithAuth(`/api/${boxId}/contents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 박스 내 콘텐츠 목록 가져오기
   */
  async getBoxContents(boxId: string) {
    return apiClient.fetchWithAuth(`/api/${boxId}/contents`, {
      method: 'GET',
    });
  },

  /**
   * 특정 콘텐츠 정보 가져오기
   */
  async getContent(contentId: string) {
    return apiClient.fetchWithAuth(`/api/contents/${contentId}`, {
      method: 'GET',
    });
  },

  /**
   * 콘텐츠 업데이트
   */
  async updateContent(contentId: string, data: ContentUpdate) {
    return apiClient.fetchWithAuth(`/api/contents/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 콘텐츠 삭제
   */
  async deleteContent(contentId: string) {
    return apiClient.fetchWithAuth(`/api/contents/${contentId}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * 태그 추천 요청
   */
  async recommendTags(data: TagRecommendRequest) {
    return apiClient.fetchWithAuth('/api/recommend-tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};
