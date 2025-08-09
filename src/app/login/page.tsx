'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAppleLogin, setShowAppleLogin] = useState(false);

  // 이미 로그인한 경우 홈으로 리디렉션
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/');
    }
    
    // Apple 로그인 지원 여부 확인 (iOS/macOS)
    const userAgent = navigator.userAgent.toLowerCase();
    const isAppleDevice = /(mac|iphone|ipad|ipod)/.test(userAgent);
    setShowAppleLogin(isAppleDevice);
    
    // Google 로그인 SDK 로드 (Google 로그인 컴포넌트 사용 시 불필요)
    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    };
    
    loadGoogleScript();
  }, [isLoggedIn, router]);

  // Google 로그인 핸들러 (Google SDK 직접 사용 시)
  const handleGoogleLogin = () => {
    setError(null);
    
    try {
      // @ts-ignore - google 전역 객체는 타입이 없음
      const google = window.google;
      if (!google) {
        setError('Google 로그인 SDK를 로드할 수 없습니다.');
        return;
      }
      
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          setIsLoading(true);
          try {
            const apiResponse = await apiClient.socialLogin({
              provider: 'google',
              access_token: '',  // ID 토큰 방식에서는 불필요
              id_token: response.credential
            });
            
            if (apiResponse.success && apiResponse.data) {
              login(apiResponse.data.access_token, apiResponse.data.user);
              router.push('/');
            } else {
              setError(apiResponse.message || '로그인에 실패했습니다.');
            }
          } catch (err: any) {
            console.error('Google 로그인 오류:', err);
            setError(err.message || 'Google 로그인 중 오류가 발생했습니다.');
          } finally {
            setIsLoading(false);
          }
        }
      });
      
      google.accounts.id.prompt();
    } catch (err: any) {
      console.error('Google 로그인 초기화 오류:', err);
      setError(err.message || 'Google 로그인을 초기화할 수 없습니다.');
    }
  };

  // Facebook 로그인 핸들러 (임시 - Facebook SDK 필요)
  const handleFacebookLogin = () => {
    setError('Facebook 로그인은 현재 개발 중입니다.');
    // 실제 구현은 Facebook SDK 사용 필요
  };

  // Apple 로그인 핸들러 (임시 - Apple JS SDK 필요)
  const handleAppleLogin = () => {
    setError('Apple 로그인은 현재 개발 중입니다.');
    // 실제 구현은 Apple JS SDK 사용 필요
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 bg-gray-50">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TaggingBox</h1>
          <p className="text-lg text-gray-600 mb-8">
            학습과 연구를 위한 지식 정리 도구
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Google 로그인 */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 계속하기
          </button>

          {/* Facebook 로그인 */}
          <button
            onClick={handleFacebookLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook으로 계속하기
          </button>

          {/* Apple 로그인 (iOS/macOS에서만 표시) */}
          {showAppleLogin && (
            <button 
              onClick={handleAppleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.94,5.19A4.38,4.38,0,0,0,16,2,4.44,4.44,0,0,0,13,3.52,4.17,4.17,0,0,0,12,6.61,3.69,3.69,0,0,0,14.94,5.19Zm2.52,7.44a4.51,4.51,0,0,1,2.16-3.81,4.66,4.66,0,0,0-3.66-2c-1.56-.16-3,.91-3.83.91s-2-.89-3.3-.87A4.92,4.92,0,0,0,4.69,9.39C2.93,12.45,4.24,17,6,19.47,6.8,20.68,7.8,22.05,9.12,22s1.75-.82,3.28-.82,2,.82,3.3.79,2.22-1.23,3.06-2.45a11,11,0,0,0,1.38-2.85A4.41,4.41,0,0,1,17.46,12.63Z"/>
              </svg>
              Apple로 계속하기
            </button>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            로그인하면 <a href="#" className="text-blue-600 hover:underline">이용약관</a>과
            <a href="#" className="text-blue-600 hover:underline"> 개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
