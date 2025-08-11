// src/lib/apiClient.ts
import { 
  ApiResponse, 
  ApiError, 
  ErrorDetail,
  LoginRequest, 
  SignupRequest, 
  AuthResponse, 
  PaginatedResponse,
  BoxListResponse
} from '../types';

import {
  User,
  VirtualUser,
  Box,
  Content
} from '../types/models';

import { SearchResultItem } from '../types/analysis';
import { MockContentSearchResult } from '../types/mock';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

// 개발 환경에서 인증 없이 모든 API 호출을 허용할지 여부
const SKIP_AUTH_FOR_DEV = true;

// 개발용 더미 데이터 모음
const mockData: {
  boxes: Record<string, Box>;
} = {
  // 박스 더미 데이터
  boxes: {
    'box1': { 
      id: 'box1', 
      name: '연구 프로젝트', 
      description: '연구 프로젝트 관련 자료를 모아둔 박스입니다.',
      is_public: true, 
      user_id: 'mock-user-id',
      parent_id: null, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      content_count: 15, 
      child_box_count: 2 
    },
    'box1-1': { 
      id: 'box1-1', 
      name: 'AI 연구', 
      description: 'AI 연구 자료를 모아둔 박스입니다.',
      is_public: true, 
      user_id: 'mock-user-id',
      parent_id: 'box1', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      content_count: 5, 
      child_box_count: 0 
    },
    'box1-2': { 
      id: 'box1-2', 
      name: '데이터 분석', 
      description: '데이터 분석 자료를 모아둔 박스입니다.',
      is_public: true, 
      user_id: 'mock-user-id',
      parent_id: 'box1', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      content_count: 3, 
      child_box_count: 0 
    },
    'box2': { 
      id: 'box2', 
      name: '학습 자료', 
      description: '학습 자료를 모아둔 박스입니다.',
      is_public: true, 
      user_id: 'mock-user-id',
      parent_id: null, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      content_count: 8, 
      child_box_count: 0 
    },
    'box3': { 
      id: 'box3', 
      name: '논문 모음', 
      description: '읽은 논문들을 모아둔 박스입니다.',
      is_public: false, 
      user_id: 'mock-user-id',
      parent_id: null, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      content_count: 12, 
      child_box_count: 1 
    },
    'box3-1': { 
      id: 'box3-1', 
      name: 'AI 관련 논문', 
      description: 'AI 관련 논문을 모아둔 박스입니다.',
      is_public: false, 
      user_id: 'mock-user-id',
      parent_id: 'box3', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      content_count: 7, 
      child_box_count: 0 
    }
  },
  
  // 추후 다른 더미 데이터들도 여기에 추가 가능
};

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  // 개발 환경에서 401/403 에러를 무시하고 더미 데이터 반환
  if (SKIP_AUTH_FOR_DEV && (response.status === 401 || response.status === 403)) {
    console.warn(`[DEV MODE] 인증 에러(${response.status})를 무시하고 더미 데이터를 반환합니다.`);
    return { success: true, data: {} as T };
  }

  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const jsonResponse = await response.json();
    
    if (!response.ok) {
      const errors: ErrorDetail[] = jsonResponse.errors || [];
      throw new ApiError(
        jsonResponse.message || 'API request failed',
        response.status,
        errors
      );
    }
    
    return jsonResponse;
  }
  
  if (!response.ok) {
    throw new ApiError('API request failed', response.status);
  }
  
  return { success: true };
}

export const apiClient = {
  /**
   * 회원가입 API 호출
   */
  async signup(data: SignupRequest): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return handleResponse<User>(response);
  },
  
  /**
   * 로그인 API 호출
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    // OAuth2 호환 형식으로 변환 (form data)
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    return handleResponse<AuthResponse>(response);
  },
  
  /**
   * 소셜 로그인 API 호출
   */
  async socialLogin(data: {
    provider: 'google' | 'facebook' | 'apple';
    access_token: string;
    id_token?: string;
  }): Promise<ApiResponse<AuthResponse & { user: User }>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/social-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return handleResponse<AuthResponse & { user: User }>(response);
  },
  
  /**
   * 인증이 필요한 API 호출을 위한 유틸리티 함수
   */
  async fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // 개발 모드에서는 토큰 검증을 건너뛰고 더미 응답을 반환
    if (SKIP_AUTH_FOR_DEV && process.env.NODE_ENV === 'development') {
      console.info(`[DEV MODE] 인증이 필요한 API 요청 (${url}) 가로채기`);
      
      // API 경로에 따라 더미 데이터 반환
      // 1. 박스 상세 정보 API (/api/boxes/{boxId})
      const boxDetailMatch = url.match(/\/api\/boxes\/([^\/]+)$/);
      if (boxDetailMatch) {
        const boxId = boxDetailMatch[1];
        console.info(`[DEV MODE] 박스 상세 정보 요청, boxId: ${boxId}`);
        
        // 중앙 데이터 저장소에서 박스 상세 정보 가져오기
        const boxDetails = mockData.boxes;
        
        const boxDetail = boxDetails[boxId];
        if (boxDetail) {
          return {
            success: true,
            data: boxDetail as unknown as T
          };
        } else {
          return {
            success: false,
            message: '박스를 찾을 수 없습니다.',
            data: null as unknown as T
          };
        }
      }
      
      // 박스 목록 API (/api/boxes)
      const boxListMatch = url.match(/^\/api\/boxes(\?.*)?$/);
      if (boxListMatch) {
        console.info('[DEV MODE] 박스 목록 요청');
        
        // URL 파라미터 파싱
        const searchParams = new URLSearchParams(boxListMatch[1] || '');
        const parentId = searchParams.get('parent_id');
        
        // 개발용 더미 데이터 모음에서 박스 목록 가져오기
        const boxDetails = mockData.boxes;
        
        // parent_id 파라미터를 기준으로 박스 필터링
        const boxList = Object.values(boxDetails).filter((box: Box) => {
          if (parentId) {
            return box.parent_id === parentId;
          } else {
            return box.parent_id === null;
          }
        });
        
        // BoxListResponse 형식으로 반환
        const response: BoxListResponse = {
          boxes: boxList
        };
        
        return {
          success: true,
          data: response as unknown as T
        };
      }
      
      // 2. 박스 내 컨텐츠 API (/api/{boxId}/contents)
      const contentsMatch = url.match(/\/api\/([^\/]+)\/contents$/);
      if (contentsMatch) {
        const boxId = contentsMatch[1];
        console.info(`[DEV MODE] 박스 내 콘텐츠 목록 요청, boxId: ${boxId}`);
        
        // 박스 ID별 콘텐츠 목록
        const contentsByBox: Record<string, MockContentSearchResult[]> = {
          'box1-1': [
            {
              id: 'content1',
              title: '인공지능 기초 이론',
              text_preview: '인공지능의 기본 개념과 역사에 대한 개요...',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tags: [
                { id: 'tag1', name: 'AI', count: 5 },
                { id: 'tag2', name: '기초', count: 3 },
                { id: 'tag3', name: '이론', count: 2 }
              ],
              box_id: 'box1-1',
              box_name: 'AI 연구'
            },
            {
              id: 'content2',
              title: '머신러닝 알고리즘 비교',
              text_preview: '주요 머신러닝 알고리즘의 장단점 분석...',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tags: [
                { id: 'tag1', name: 'AI', count: 5 },
                { id: 'tag4', name: '머신러닝', count: 7 },
                { id: 'tag5', name: '알고리즘', count: 4 }
              ],
              box_id: 'box1-1',
              box_name: 'AI 연구'
            }
          ],
          'box1-2': [
            {
              id: 'content3',
              title: '데이터 시각화 기법',
              text_preview: '효과적인 데이터 시각화를 위한 방법론...',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tags: [
                { id: 'tag6', name: '데이터', count: 8 },
                { id: 'tag7', name: '시각화', count: 5 }
              ],
              box_id: 'box1-2',
              box_name: '데이터 분석'
            }
          ]
        };
        
        const contents = contentsByBox[boxId] || [];
        return {
          success: true,
          data: contents as unknown as T
        };
      }
      
      // 3. 태그 관계 데이터 API (/api/tags/graph)
      if (url === '/api/tags/graph') {
        console.info('[DEV MODE] 태그 그래프 데이터 요청');
        
        // 태그 노드와 관계 더미 데이터
        const tagGraphData = {
          nodes: [
            { id: 'tag1', label: 'AI', weight: 5 },
            { id: 'tag2', label: '기초', weight: 3 },
            { id: 'tag3', label: '이론', weight: 2 },
            { id: 'tag4', label: '머신러닝', weight: 7 },
            { id: 'tag5', label: '알고리즘', weight: 4 },
            { id: 'tag6', label: '데이터', weight: 8 },
            { id: 'tag7', label: '시각화', weight: 5 },
            { id: 'tag8', label: '딥러닝', weight: 6 },
            { id: 'tag9', label: '신경망', weight: 4 },
            { id: 'tag10', label: '자연어처리', weight: 5 }
          ],
          edges: [
            { source: 'tag1', target: 'tag4', weight: 3 },
            { source: 'tag1', target: 'tag8', weight: 4 },
            { source: 'tag4', target: 'tag5', weight: 2 },
            { source: 'tag8', target: 'tag9', weight: 5 },
            { source: 'tag6', target: 'tag7', weight: 3 },
            { source: 'tag1', target: 'tag3', weight: 1 },
            { source: 'tag8', target: 'tag10', weight: 2 },
            { source: 'tag2', target: 'tag3', weight: 1 }
          ]
        };
        
        return {
          success: true,
          data: tagGraphData as unknown as T
        };
      }
      
      // 4. 사용자 정보 API (/api/users/me)
      if (url === '/users/me') {
        console.info('[DEV MODE] 사용자 정보 요청');
        
        // 더미 사용자 정보
        const userInfo: User = {
          id: 'mock-user-id',
          email: 'user@example.com',
          username: '테스트 사용자',
          is_active: true,
          is_superuser: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return {
          success: true,
          data: userInfo as unknown as T
        };
      }
      
      // 기본 더미 응답
      return {
        success: true,
        data: {} as T
      };
    }
    
    try {
      // 헤더 설정
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };
      
      // Authorization 헤더 추가
      const token = tokenUtils.getToken();
      if (token) {
        headers = {
          ...headers,
          'Authorization': `Bearer ${token}`
        };
      } else if (!SKIP_AUTH_FOR_DEV) {
        throw new ApiError('인증 토큰이 없습니다.', 401);
      }
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });
      
      // 401 에러 처리 (토큰 만료)
      if (response.status === 401) {
        // 토큰 갱신 함수가 있는지 확인
        const refreshToken = (window as any).refreshToken;
        
        if (refreshToken) {
          // 401 Unauthorized 에러가 발생하면 토큰 갱신 시도
          const isRefreshed = await refreshToken();
          
          if (!isRefreshed) {
            tokenUtils.logout(); // 갱신 실패 시 로그아웃
            throw new ApiError('세션이 만료되었습니다. 다시 로그인해주세요.', 401);
          }
          
          // 갱신된 토큰으로 요청 재시도
          const newToken = tokenUtils.getToken();
          const newHeaders = {
            ...headers,
            'Authorization': `Bearer ${newToken}`
          };
          
          const newResponse = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: newHeaders,
          });
          
          return handleResponse<T>(newResponse);
        }
      }
      
      return handleResponse<T>(response);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  /**
   * 사용자 정보 가져오기
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.fetchWithAuth<User>('/users/me', {
      method: 'GET',
    });
  },
  
  /**
   * 사용자 정보 업데이트
   */
  async updateUserProfile(data: Partial<SignupRequest>): Promise<ApiResponse<User>> {
    return apiClient.fetchWithAuth<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// 토큰 관련 유틸리티 함수
export const tokenUtils = {
  saveToken(token: string, rememberMe = false): void {
    if (typeof window !== 'undefined') {
      // rememberMe가 true이면 localStorage에, 아니면 sessionStorage에 저장
      if (rememberMe) {
        localStorage.setItem('auth_token', token);
      } else {
        sessionStorage.setItem('auth_token', token);
      }
    }
  },
  
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // localStorage와 sessionStorage 모두 확인
    const localToken = localStorage.getItem('auth_token');
    const sessionToken = sessionStorage.getItem('auth_token');
    
    return localToken || sessionToken || null;
  },
  
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    }
  },
  
  saveRefreshToken(refreshToken: string, rememberMe = false): void {
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('refresh_token', refreshToken);
      } else {
        sessionStorage.setItem('refresh_token', refreshToken);
      }
    }
  },
  
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    const localRefreshToken = localStorage.getItem('refresh_token');
    const sessionRefreshToken = sessionStorage.getItem('refresh_token');
    
    return localRefreshToken || sessionRefreshToken || null;
  },
  
  removeRefreshToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('refresh_token');
    }
  },
  
  saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(user));
    }
  },
  
  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },
  
  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data');
    }
  },
  
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
  
  // 로그아웃 - 모든 인증 정보 삭제
  logout(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
  }
};

export default apiClient;
