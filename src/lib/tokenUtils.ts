/**
 * 토큰 관리 유틸리티
 */

// 토큰 저장 키
const ACCESS_TOKEN_KEY = 'tb_access_token';
const REFRESH_TOKEN_KEY = 'tb_refresh_token';

/**
 * 토큰 저장
 * 
 * @param accessToken 액세스 토큰
 * @param refreshToken 리프레시 토큰 (선택적)
 */
export const saveTokens = (accessToken: string, refreshToken?: string): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

/**
 * 액세스 토큰 가져오기
 * 
 * @returns 액세스 토큰 또는 null
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * 리프레시 토큰 가져오기
 * 
 * @returns 리프레시 토큰 또는 null
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * 토큰 제거 (로그아웃)
 */
export const logout = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const tokenUtils = {
  saveTokens,
  getToken,
  getRefreshToken,
  logout
};

export default tokenUtils;
