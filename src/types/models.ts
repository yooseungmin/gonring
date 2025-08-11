/**
 * 비즈니스 모델 관련 타입 정의
 */

/**
 * 사용자 모델
 */
export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 가상 사용자 모델
 */
export interface VirtualUser {
  id: string;
  user_id: string;
  description: string | null;
  created_at: string;
}

/**
 * 태그 모델
 */
export interface Tag {
  id: string;
  name: string;
  user_id?: string;
  created_at?: string;
  count?: number; // 태그가 사용된 횟수
}

/**
 * 박스 모델
 */
export interface Box {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  content_count: number;
  child_box_count: number;
}

/**
 * 박스 생성 요청
 */
export interface BoxCreateRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  parent_id?: string | null;
}

/**
 * 박스 업데이트 요청
 */
export interface BoxUpdateRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
  parent_id?: string | null;
}

/**
 * 콘텐츠 모델
 */
export interface Content {
  id: string;
  title: string | null;
  text_content: string;
  markdown_content: string | null;
  html_content: string | null;
  url: string | null;
  box_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

/**
 * 콘텐츠 생성 요청
 */
export interface ContentCreateRequest {
  title?: string;
  text_content: string;
  markdown_content?: string;
  html_content?: string;
  url?: string;
  box_id: string;
  tags?: string[];
}

/**
 * 콘텐츠 업데이트 요청
 */
export interface ContentUpdateRequest {
  title?: string;
  text_content?: string;
  markdown_content?: string;
  html_content?: string;
  url?: string;
  box_id?: string;
  tags?: string[];
}
