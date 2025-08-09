// src/lib/apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  username: string; // 이메일 주소를 사용
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface VirtualUser {
  id: string;
  user_id: string;
  description: string | null;
  created_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  virtual_user?: VirtualUser;
}

class ApiError extends Error {
  status: number;
  errors?: any;
  
  constructor(message: string, status: number, errors?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const jsonResponse = await response.json();
    
    if (!response.ok) {
      throw new ApiError(
        jsonResponse.message || 'API request failed',
        response.status,
        jsonResponse.errors
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
  async signup(data: SignupData): Promise<ApiResponse<UserResponse>> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return handleResponse<UserResponse>(response);
  },
  
  /**
   * 로그인 API 호출
   */
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
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
  }): Promise<ApiResponse<AuthResponse & { user: UserResponse }>> {
    const response = await fetch(`${API_BASE_URL}/api/auth/social-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return handleResponse<AuthResponse & { user: UserResponse }>(response);
  },
  
  /**
   * 인증이 필요한 API 호출을 위한 유틸리티 함수
   */
  async fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    let token = tokenUtils.getToken();
    
    if (!token) {
      throw new ApiError('인증 토큰이 없습니다.', 401);
    }
    
    // 토큰이 만료되었는지 확인
    const { isTokenExpired, refreshToken } = await import('./tokenRefresher');
    if (isTokenExpired(token)) {
      // 토큰 갱신 시도
      const isRefreshed = await refreshToken();
      
      if (!isRefreshed) {
        tokenUtils.logout(); // 갱신 실패 시 로그아웃
        throw new ApiError('세션이 만료되었습니다. 다시 로그인해주세요.', 401);
      }
      
      // 갱신된 토큰 가져오기
      token = tokenUtils.getToken();
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as Record<string, string>;
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });
      
      if (response.status === 401) {
        // 401 Unauthorized 에러가 발생하면 토큰 갱신 시도
        const isRefreshed = await refreshToken();
        
        if (!isRefreshed) {
          tokenUtils.logout(); // 갱신 실패 시 로그아웃
          throw new ApiError('세션이 만료되었습니다. 다시 로그인해주세요.', 401);
        }
        
        // 갱신된 토큰으로 요청 재시도
        token = tokenUtils.getToken();
        headers['Authorization'] = `Bearer ${token}`;
        
        const newResponse = await fetch(`${API_BASE_URL}${url}`, {
          ...options,
          headers,
        });
        
        return handleResponse<T>(newResponse);
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
  async getCurrentUser(): Promise<ApiResponse<UserResponse>> {
    return this.fetchWithAuth<UserResponse>('/users/me', {
      method: 'GET',
    });
  },
  
  /**
   * 사용자 정보 업데이트
   */
  async updateUserProfile(data: Partial<SignupData>): Promise<ApiResponse<UserResponse>> {
    return this.fetchWithAuth<UserResponse>('/users/me', {
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
  
  saveUser(user: UserResponse): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(user));
    }
  },
  
  getUser(): UserResponse | null {
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
