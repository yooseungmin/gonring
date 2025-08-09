// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokenUtils, UserResponse, apiClient } from '@/lib/apiClient';

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserResponse | null;
  login: (token: string, userData: UserResponse, rememberMe?: boolean) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 개발용 모의 사용자 데이터
  const mockUser: UserResponse = {
    id: "mock-user-id",
    email: "demo@example.com",
    username: "Demo User",
    is_active: true,
    is_superuser: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const [user, setUser] = useState<UserResponse | null>(mockUser); // 기본값으로 모의 사용자 설정
  const [isLoggedIn, setIsLoggedIn] = useState(true); // 항상 로그인된 상태로 설정
  const [isLoading, setIsLoading] = useState(false); // 로딩 비활성화

  // 토큰 유효성 검증 및 사용자 정보 가져오기
  const validateToken = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
        setIsLoggedIn(true);
        return true;
      } else {
        // 토큰이 유효하지 않은 경우 로그아웃 처리
        logout();
        return false;
      }
    } catch (error) {
      // API 오류 발생 시 로그아웃 처리
      console.error('Token validation failed:', error);
      logout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 로컬 스토리지에서 사용자 정보 복원
    const initializeAuth = async () => {
      const token = tokenUtils.getToken();
      
      if (token) {
        // 토큰이 있으면 유효성 검증
        await validateToken();
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (token: string, userData: UserResponse, rememberMe = false) => {
    tokenUtils.saveToken(token, rememberMe);
    tokenUtils.saveUser(userData);
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    tokenUtils.logout();
    setUser(null);
    setIsLoggedIn(false);
  };

  const value = {
    isLoggedIn,
    user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
