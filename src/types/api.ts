/**
 * API 응답 관련 공통 타입 정의
 */

import { Box } from './models';

/**
 * API 응답의 기본 형태
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ErrorDetail[];
}

/**
 * API 성공 응답
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * API 실패 응답
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ErrorDetail[];
}

/**
 * API 에러 상세 정보
 */
export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

/**
 * 페이지네이션된 API 응답
 */
export interface PaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: PaginationInfo;
}

/**
 * 인증 관련 API 응답
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * 로그인 요청 데이터
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 회원가입 요청 데이터
 */
export interface SignupRequest {
  email: string;
  username: string;
  password: string;
}

/**
 * Box API 관련 타입
 */

/**
 * Box 목록 요청 파라미터
 */
export interface BoxListParams {
  parent_id?: string;
  user_id?: string;
  is_public?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_order?: 'asc' | 'desc';
}

/**
 * Box 목록 응답
 */
export interface BoxListResponse {
  boxes: Box[];
  pagination?: PaginationInfo;
}

/**
 * Content API 관련 타입
 */

/**
 * Content 목록 요청 파라미터
 */
export interface ContentListParams {
  box_id: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title';
  sort_order?: 'asc' | 'desc';
  tag_ids?: string[];
}

/**
 * 검색 API 관련 타입
 */

/**
 * 통합 검색 요청 파라미터
 */
export interface UnifiedSearchParams {
  query: string;
  include_tags?: string[];
  exclude_tags?: string[];
  box_id?: string;
  user_id?: string;
  page?: number;
  limit?: number;
  sort_by?: 'relevance' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * 협업 API 관련 타입
 */

/**
 * 공유 권한 유형
 */
export type SharePermission = 'view' | 'edit' | 'admin';

/**
 * 공유 요청 데이터
 */
export interface ShareRequest {
  resource_type: 'box' | 'content';
  resource_id: string;
  user_id: string;
  permission: SharePermission;
  message?: string;
}

/**
 * 공유 응답 데이터
 */
export interface ShareResponse {
  id: string;
  resource_type: 'box' | 'content';
  resource_id: string;
  owner_id: string;
  user_id: string;
  permission: SharePermission;
  created_at: string;
  updated_at: string;
}

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  status: number;
  errors?: ErrorDetail[];
  
  constructor(message: string, status: number, errors?: ErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}
