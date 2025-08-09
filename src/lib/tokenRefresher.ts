// src/lib/tokenRefresher.ts
import { tokenUtils } from './apiClient';

interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

// 토큰 만료 시간을 확인하는 함수
export const isTokenExpired = (token: string): boolean => {
  try {
    // JWT 토큰의 payload 부분을 디코딩
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // 만료 시간이 현재 시간보다 이전인지 확인
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return true; // 디코딩에 실패하면 만료된 것으로 간주
  }
};

// 토큰 갱신 함수
export const refreshToken = async (): Promise<boolean> => {
  try {
    const refreshToken = tokenUtils.getRefreshToken();
    
    if (!refreshToken) {
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data: RefreshTokenResponse = await response.json();
    
    // 새 액세스 토큰 저장
    tokenUtils.saveToken(data.access_token);
    
    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
};
