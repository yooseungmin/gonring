'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // 사용자가 이전에 배너를 닫았는지 확인
    const hasClosedBanner = localStorage.getItem('pwaInstallBannerClosed');
    
    // beforeinstallprompt 이벤트 리스너 등록
    const handleBeforeInstallPrompt = (e: Event) => {
      // 브라우저 기본 설치 배너 방지
      e.preventDefault();
      
      // 이벤트 저장
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 사용자가 이전에 배너를 닫지 않았다면 배너 표시
      if (hasClosedBanner !== 'true') {
        setShowBanner(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // PWA 설치 처리
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // 설치 프롬프트 표시
    await deferredPrompt.prompt();
    
    // 사용자 선택 결과 처리
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('사용자가 PWA 설치를 수락했습니다');
    } else {
      console.log('사용자가 PWA 설치를 거부했습니다');
    }
    
    // 프롬프트는 한 번만 사용할 수 있으므로 초기화
    setDeferredPrompt(null);
    setShowBanner(false);
  };
  
  // 배너 닫기
  const closeBanner = () => {
    setShowBanner(false);
    // 사용자 선택 저장 (24시간 동안)
    localStorage.setItem('pwaInstallBannerClosed', 'true');
    
    // 24시간 후 배너 다시 표시하도록 설정
    setTimeout(() => {
      localStorage.removeItem('pwaInstallBannerClosed');
    }, 24 * 60 * 60 * 1000);
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="pwa-install-banner">
      <div className="flex items-center">
        <Download size={24} className="mr-3" />
        <div>
          <p className="font-medium">TaggingBox 앱 설치하기</p>
          <p className="text-sm opacity-80">더 빠른 접근과 오프라인 사용이 가능합니다</p>
        </div>
      </div>
      <div className="flex items-center">
        <button 
          className="pwa-install-button mr-2"
          onClick={handleInstall}
        >
          설치하기
        </button>
        <button 
          className="p-1 rounded-full hover:bg-black hover:bg-opacity-10"
          onClick={closeBanner}
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
